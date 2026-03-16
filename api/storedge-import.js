import { query, queryOne } from './_db.js'
import { requireAdmin, isAdmin } from './_auth.js'

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return isAdmin(req)
}

function parseDate(str) {
  if (!str) return null
  // Handle MM/DD/YYYY format from storEDGE
  const parts = str.split('/')
  if (parts.length === 3) {
    const [m, d, y] = parts
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return str
}

const MONTH_MAP = {
  'January': '01', 'February': '02', 'March': '03', 'April': '04',
  'May': '05', 'June': '06', 'July': '07', 'August': '08',
  'September': '09', 'October': '10', 'November': '11', 'December': '12',
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { report_type, facility_id, data } = req.body || {}
  if (!facility_id || !report_type || !data) {
    return res.status(400).json({ error: 'facility_id, report_type, and data required' })
  }

  try {
    let result = {}

    // ── Consolidated Occupancy: upsert units + snapshot ──
    if (report_type === 'consolidated_occupancy') {
      const { units, totals } = data

      // Upsert all unit types
      const savedUnits = []
      for (const u of units) {
        const row = await queryOne(`
          INSERT INTO facility_pms_units (facility_id, unit_type, size_label, width_ft, depth_ft, sqft, floor, features, total_count, occupied_count, street_rate, actual_avg_rate, web_rate, push_rate, ecri_eligible)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (facility_id, unit_type) DO UPDATE SET
            size_label = EXCLUDED.size_label, width_ft = EXCLUDED.width_ft, depth_ft = EXCLUDED.depth_ft,
            sqft = EXCLUDED.sqft, floor = EXCLUDED.floor, features = EXCLUDED.features,
            total_count = EXCLUDED.total_count, occupied_count = EXCLUDED.occupied_count,
            street_rate = EXCLUDED.street_rate, actual_avg_rate = COALESCE(EXCLUDED.actual_avg_rate, facility_pms_units.actual_avg_rate),
            last_updated = NOW()
          RETURNING *
        `, [facility_id, u.unit_type, u.size_label, u.width_ft, u.depth_ft, u.sqft, u.floor || '', u.features || [], u.total_count, u.occupied_count, u.street_rate, u.actual_avg_rate, null, null, 0])
        savedUnits.push(row)
      }

      // Upsert snapshot from totals
      const snapshot = await queryOne(`
        INSERT INTO facility_pms_snapshots (facility_id, snapshot_date, total_units, occupied_units, occupancy_pct, total_sqft, occupied_sqft, gross_potential, actual_revenue, notes)
        VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (facility_id, snapshot_date) DO UPDATE SET
          total_units = EXCLUDED.total_units, occupied_units = EXCLUDED.occupied_units,
          occupancy_pct = EXCLUDED.occupancy_pct, total_sqft = EXCLUDED.total_sqft,
          occupied_sqft = EXCLUDED.occupied_sqft, gross_potential = EXCLUDED.gross_potential,
          actual_revenue = EXCLUDED.actual_revenue, notes = EXCLUDED.notes, updated_at = NOW()
        RETURNING *
      `, [facility_id, totals.total_units, totals.occupied, totals.occupancy_pct, totals.total_sqft, totals.occupied_sqft, totals.scheduled_rent, totals.actual_rent, 'Imported from storEDGE Consolidated Occupancy'])

      await query(`UPDATE facilities SET pms_uploaded = TRUE, updated_at = NOW() WHERE id = $1`, [facility_id])

      result = { units_saved: savedUnits.length, snapshot }
    }

    // ── Rent Roll: store tenant detail ──
    else if (report_type === 'rent_roll') {
      // Clear existing rent roll for today and re-import
      await query(`DELETE FROM facility_pms_rent_roll WHERE facility_id = $1 AND snapshot_date = CURRENT_DATE`, [facility_id])

      let count = 0
      for (const r of data) {
        const tenantName = [r.first_name, r.last_name].filter(Boolean).join(' ')
        await queryOne(`
          INSERT INTO facility_pms_rent_roll (facility_id, snapshot_date, unit, size_label, tenant_name, account, rental_start, paid_thru, rent_rate, insurance_premium, total_due, days_past_due)
          VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [facility_id, r.unit, r.size, tenantName, r.account, parseDate(r.rental_start), parseDate(r.paid_thru), r.rent_rate || null, r.insurance_premium || null, r.total_due || 0, r.days_past_due || 0])
        count++
      }
      result = { tenants_imported: count }
    }

    // ── Rent Rates by Tenant: store individual tenant rates + update unit avg rates + ECRI flags ──
    else if (report_type === 'rent_rates_by_tenant') {
      // Clear existing tenant rates for today and re-import
      await query(`DELETE FROM facility_pms_tenant_rates WHERE facility_id = $1 AND snapshot_date = CURRENT_DATE`, [facility_id])

      const today = new Date()

      // Group by unit type to compute average actual rate
      const byType = {}
      let tenantCount = 0

      for (const r of data) {
        const key = `${r.unit_w}x${r.unit_l} ${r.unit_type} ${r.access_type}`.trim()
        if (!byType[key]) byType[key] = { rates: [], variances: [], ecriCount: 0 }
        byType[key].rates.push(r.actual_rate)
        byType[key].variances.push(r.rate_variance)

        // Compute tenant tenure in days
        let daysAsTenant = 0
        if (r.moved_in) {
          const parts = r.moved_in.split('/')
          if (parts.length === 3) {
            const moveDate = new Date(`${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`)
            daysAsTenant = Math.floor((today - moveDate) / (1000 * 60 * 60 * 24))
          }
        }

        // ECRI logic: flag if paying below street rate AND has been tenant 180+ days
        const payingBelow = r.rate_variance < 0
        const longTenure = daysAsTenant >= 180
        const ecriFlag = payingBelow && longTenure
        // Suggest bringing to street rate (conservative: 80% of gap)
        const ecriSuggested = ecriFlag ? Math.round((r.actual_rate + Math.abs(r.rate_variance) * 0.8) * 100) / 100 : null
        const ecriLift = ecriFlag ? Math.round(Math.abs(r.rate_variance) * 0.8 * 100) / 100 : null

        if (ecriFlag) byType[key].ecriCount++

        await queryOne(`
          INSERT INTO facility_pms_tenant_rates (facility_id, snapshot_date, unit, size_label, unit_type, access_type, tenant_name, moved_in, standard_rate, actual_rate, paid_rate, rate_variance, discount, discount_desc, days_as_tenant, ecri_flag, ecri_suggested, ecri_revenue_lift)
          VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id
        `, [
          facility_id, r.unit, `${r.unit_w}x${r.unit_l}`, r.unit_type, r.access_type,
          r.tenant_name, parseDate(r.moved_in), r.standard_rate, r.actual_rate,
          r.paid_rate, r.rate_variance, r.discount, r.discount_description,
          daysAsTenant, ecriFlag, ecriSuggested, ecriLift,
        ])
        tenantCount++
      }

      // Update unit-level avg rates and ECRI counts
      let updated = 0
      for (const [unitType, info] of Object.entries(byType)) {
        const avgRate = info.rates.reduce((s, r) => s + r, 0) / info.rates.length
        const res2 = await query(`
          UPDATE facility_pms_units SET actual_avg_rate = $1, ecri_eligible = $2, last_updated = NOW()
          WHERE facility_id = $3 AND unit_type = $4
        `, [Math.round(avgRate * 100) / 100, info.ecriCount, facility_id, unitType])
        if (res2.rowCount > 0) updated++
      }
      result = { unit_types_updated: updated, tenant_rates_stored: tenantCount }
    }

    // ── Aging: store delinquency detail + update snapshot ──
    else if (report_type === 'aging') {
      const { rows: agingRows, totals } = data

      // Clear existing aging for today and re-import
      await query(`DELETE FROM facility_pms_aging WHERE facility_id = $1 AND snapshot_date = CURRENT_DATE`, [facility_id])

      let count = 0
      for (const r of agingRows) {
        const tenantName = [r.first_name, r.last_name].filter(Boolean).join(' ')
        await queryOne(`
          INSERT INTO facility_pms_aging (facility_id, snapshot_date, unit, tenant_name, bucket_0_30, bucket_31_60, bucket_61_90, bucket_91_120, bucket_120_plus, total, move_out_date)
          VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [facility_id, r.unit, tenantName, r.bucket_0_30, r.bucket_31_60, r.bucket_61_90, r.bucket_91_120, r.bucket_120_plus, r.total, parseDate(r.move_out) || null])
        count++
      }

      // Update today's snapshot with delinquency info if snapshot exists
      if (totals.total > 0) {
        await query(`
          UPDATE facility_pms_snapshots SET delinquency_pct = $1, updated_at = NOW()
          WHERE facility_id = $2 AND snapshot_date = CURRENT_DATE
        `, [
          // Delinquency as % of actual revenue
          null, // We'll compute this on the frontend from aging data
          facility_id,
        ])
      }

      result = { aging_records: count, total_outstanding: totals.total }
    }

    // ── Annual Revenue & Occupancy: store monthly history ──
    else if (report_type === 'annual_revenue') {
      let count = 0
      for (const r of data) {
        await queryOne(`
          INSERT INTO facility_pms_revenue_history (facility_id, year, month, quarter, revenue, monthly_tax, move_ins, move_outs)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (facility_id, year, month) DO UPDATE SET
            quarter = EXCLUDED.quarter, revenue = EXCLUDED.revenue, monthly_tax = EXCLUDED.monthly_tax,
            move_ins = EXCLUDED.move_ins, move_outs = EXCLUDED.move_outs
          RETURNING id
        `, [facility_id, r.year, r.month, r.quarter, r.revenue, r.monthly_tax, r.move_ins, r.move_outs])
        count++
      }

      // Also update current snapshot with latest month's move-in/out
      const latest = data[data.length - 1]
      if (latest) {
        await query(`
          UPDATE facility_pms_snapshots SET move_ins_mtd = $1, move_outs_mtd = $2, updated_at = NOW()
          WHERE facility_id = $3 AND snapshot_date = CURRENT_DATE
        `, [latest.move_ins, latest.move_outs, facility_id])
      }

      result = { months_imported: count }
    }

    // ── Length of Stay: store tenant duration + lead source data ──
    else if (report_type === 'length_of_stay') {
      // Clear and re-import (this is a full snapshot)
      await query(`DELETE FROM facility_pms_length_of_stay WHERE facility_id = $1`, [facility_id])

      let count = 0
      for (const r of data) {
        await queryOne(`
          INSERT INTO facility_pms_length_of_stay (facility_id, tenant_name, latest_unit, move_in, move_out, days_in_unit, lead_source, lead_category)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [facility_id, r.tenant_name, r.latest_unit, parseDate(r.move_in), parseDate(r.move_out) || null, r.days_in_unit, r.lead_source, r.lead_category])
        count++
      }
      result = { tenant_records: count }
    }

    // ── Move-In KPI: store as snapshot JSON on the snapshot ──
    else if (report_type === 'move_in_kpi') {
      // Store KPI data as notes on today's snapshot
      const kpiSummary = data.map(r => `${r.employee}: ${r.move_ins} in / ${r.move_outs} out (net ${r.net_units})`).join('; ')
      await query(`
        UPDATE facility_pms_snapshots SET notes = COALESCE(notes, '') || E'\nKPI: ' || $1, updated_at = NOW()
        WHERE facility_id = $2 AND snapshot_date = CURRENT_DATE
      `, [kpiSummary, facility_id])
      result = { employees: data.length }
    }

    else {
      return res.status(400).json({ error: `Unknown report_type: ${report_type}` })
    }

    return res.status(200).json({ success: true, report_type, ...result })
  } catch (err) {
    console.error(`storEDGE import (${report_type}) failed:`, err.message)
    return res.status(500).json({ error: `Import failed: ${err.message}` })
  }
}
