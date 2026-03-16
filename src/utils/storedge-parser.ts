/**
 * storEDGE CSV Report Parser
 * Auto-detects report type from headers and transforms into structured data
 * for the facility PMS system.
 */

/* ── Types ── */

export type StorEdgeReportType =
  | 'consolidated_occupancy'
  | 'rent_roll'
  | 'rent_rates_by_tenant'
  | 'aging'
  | 'annual_revenue'
  | 'length_of_stay'
  | 'move_in_kpi'
  | 'unknown'

export interface ParsedReport {
  type: StorEdgeReportType
  label: string
  data: any
  summary: string
}

export interface ConsolidatedOccupancyRow {
  unit_type: string
  size_label: string
  width_ft: number
  depth_ft: number
  sqft: number
  floor: string
  features: string[]
  access: string
  door: string
  street_rate: number
  total_count: number
  unrentable: number
  occupied_count: number
  vacant: number
  occupancy_pct: number
  scheduled_rent: number
  potential_from_vacant: number
  actual_rent: number
  total_sqft: number
  occupied_sqft: number
  economic_occupancy: number
}

export interface ConsolidatedOccupancyData {
  units: ConsolidatedOccupancyRow[]
  totals: {
    total_units: number
    occupied: number
    vacant: number
    occupancy_pct: number
    scheduled_rent: number
    actual_rent: number
    total_sqft: number
    occupied_sqft: number
    economic_occupancy: number
  }
}

export interface RentRollRow {
  unit: string
  size: string
  business_name: string
  first_name: string
  last_name: string
  account: string
  rental_start: string
  paid_thru: string
  rent_rate: number
  insurance_premium: number
  security_deposit: number
  rent_due: number
  insurance_due: number
  fees_due: number
  other_due: number
  prepaid: number
  total_due: number
  days_past_due: number
}

export interface RentRateRow {
  unit_sf: number
  unit_w: number
  unit_l: number
  unit_type: string
  access_type: string
  door_type: string
  standard_rate: number
  unit: string
  tenant_name: string
  moved_in: string
  moving_out: string
  paid_thru: string
  actual_rate: number
  actual_rate_start: string
  discount: number
  discount_description: string
  paid_rate: number
  rate_variance: number
}

export interface AgingRow {
  unit: string
  first_name: string
  last_name: string
  business_name: string
  bucket_0_30: number
  bucket_31_60: number
  bucket_61_90: number
  bucket_91_120: number
  bucket_120_plus: number
  total: number
  move_out: string
}

export interface AnnualRevenueRow {
  year: number
  month: string
  quarter: number
  revenue: number
  monthly_tax: number
  move_ins: number
  move_outs: number
}

export interface LengthOfStayRow {
  tenant_name: string
  latest_unit: string
  move_in: string
  move_out: string
  days_in_unit: number
  lead_source: string
  lead_category: string
}

export interface MoveInKPIRow {
  employee: string
  move_ins: number
  move_outs: number
  net_units: number
  insurance_policies_sold: number
  insurance_sold: number
  pct_insurance: number
  autopay_enrollments: number
  pct_autopay: number
  retail_sales: number
  total_discounts: number
  avg_discounts_per_move_in: number
}

/* ── CSV Parsing Helpers ── */

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let row: string[] = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(current.trim())
        current = ''
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++
        row.push(current.trim())
        current = ''
        if (row.some(c => c !== '')) rows.push(row)
        row = []
      } else {
        current += ch
      }
    }
  }
  row.push(current.trim())
  if (row.some(c => c !== '')) rows.push(row)

  return rows
}

function parseMoney(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,]/g, '')) || 0
}

function parsePercent(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace('%', '')) || 0
}

function parseInt2(val: string): number {
  if (!val) return 0
  return parseInt(val.replace(/,/g, ''), 10) || 0
}

/* ── Report Type Detection ── */

const HEADER_SIGNATURES: Record<StorEdgeReportType, string[]> = {
  consolidated_occupancy: ['SQUARE FOOTAGE', 'TOTAL UNITS', 'STANDARD RATE', '% OCCUPIED', 'ECONOMIC OCCUPANCY'],
  rent_roll: ['UNIT', 'SIZE', 'RENT RATE', 'PAID THRU', 'TOTAL DUE', 'DAYS PAST DUE'],
  rent_rates_by_tenant: ['Unit SF', 'Standard Rent Rate', 'Actual Rate', 'Rate Variance', 'Discount Description'],
  aging: ['0-30', '31-60', '61-90', '91-120', '120+'],
  annual_revenue: ['YEAR', 'MONTH', 'QUARTER', 'REVENUE', 'MOVE-INS', 'MOVE-OUTS'],
  length_of_stay: ['TENANT NAME', 'LATEST UNIT', 'DAYS IN UNIT', 'LEAD SOURCE', 'LEAD CATEGORY'],
  move_in_kpi: ['EMPLOYEE', 'MOVE-INS', 'MOVE-OUTS', 'NET UNITS', 'INSURANCE POLICIES SOLD', 'AUTOPAY ENROLLMENTS'],
  unknown: [],
}

export function detectReportType(text: string): StorEdgeReportType {
  const rows = parseCSV(text)
  if (rows.length === 0) return 'unknown'

  const headerRow = rows[0].map(h => h.toUpperCase().trim())
  const headerStr = headerRow.join('|')

  let bestMatch: StorEdgeReportType = 'unknown'
  let bestScore = 0

  for (const [type, signatures] of Object.entries(HEADER_SIGNATURES)) {
    if (type === 'unknown') continue
    const score = signatures.filter(sig => headerStr.includes(sig.toUpperCase())).length
    if (score > bestScore) {
      bestScore = score
      bestMatch = type as StorEdgeReportType
    }
  }

  return bestScore >= 3 ? bestMatch : 'unknown'
}

/* ── Individual Parsers ── */

function parseConsolidatedOccupancy(rows: string[][]): ConsolidatedOccupancyData {
  const headers = rows[0]
  const dataRows = rows.slice(1)
  const units: ConsolidatedOccupancyRow[] = []
  let totals = { total_units: 0, occupied: 0, vacant: 0, occupancy_pct: 0, scheduled_rent: 0, actual_rent: 0, total_sqft: 0, occupied_sqft: 0, economic_occupancy: 0 }

  const col = (name: string) => headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()))

  for (const row of dataRows) {
    const sqftVal = row[col('SQUARE FOOTAGE')] || ''
    if (sqftVal.toUpperCase() === 'TOTALS') {
      totals = {
        total_units: parseInt2(row[col('TOTAL UNITS')]),
        occupied: parseInt2(row[col('OCCUPIED')]),
        vacant: parseInt2(row[col('VACANT')]),
        occupancy_pct: parsePercent(row[col('% OCCUPIED')]),
        scheduled_rent: parseMoney(row[col('SCHEDULED TOTAL')]),
        actual_rent: parseMoney(row[col('ACTUAL RENT')]),
        total_sqft: parseInt2(row[col('TOTAL SQUARE')]),
        occupied_sqft: parseInt2(row[col('OCCUPIED SQUARE')]),
        economic_occupancy: parsePercent(row[col('ECONOMIC')]),
      }
      continue
    }

    const width = parseInt2(row[col('WIDTH')])
    const depth = parseInt2(row[col('LENGTH')])
    const sqft = parseInt2(sqftVal)
    const type = (row[col('TYPE')] || 'Self-Storage').trim()
    const access = (row[col('ACCESS')] || '').trim()
    const door = (row[col('DOOR')] || '').trim()

    // Build descriptive unit_type: "10x20 Self-Storage Indoor"
    const sizeStr = `${width}x${depth}`
    const unitType = `${sizeStr} ${type} ${access}`.trim()

    const features: string[] = []
    if (access.toLowerCase() === 'indoor') features.push('interior')
    if (access.toLowerCase() === 'outdoor') features.push('drive_up')
    const amenities = (row[col('AMENITIES')] || '').trim()
    if (amenities) features.push(...amenities.split(',').map(a => a.trim()).filter(Boolean))

    const totalCount = parseInt2(row[col('TOTAL UNITS')])
    const unrentable = parseInt2(row[col('UNRENTABLE')])
    const occupiedCount = parseInt2(row[col('OCCUPIED')])
    // Find the right OCCUPIED column (not OCCUPIED SF)
    const occupiedIdx = headers.findIndex((h, i) => h.toUpperCase().trim() === 'OCCUPIED' && i < headers.findIndex(hh => hh.toUpperCase().includes('SQUARE')))
    const actualOccupied = occupiedIdx >= 0 ? parseInt2(row[occupiedIdx]) : occupiedCount

    units.push({
      unit_type: unitType,
      size_label: sizeStr,
      width_ft: width,
      depth_ft: depth,
      sqft,
      floor: (row[col('FLOOR')] || '').trim(),
      features,
      access,
      door,
      street_rate: parseMoney(row[col('STANDARD RATE')]),
      total_count: totalCount,
      unrentable,
      occupied_count: actualOccupied,
      vacant: parseInt2(row[col('VACANT')]),
      occupancy_pct: parsePercent(row[col('% OCCUPIED')]),
      scheduled_rent: parseMoney(row[col('SCHEDULED TOTAL')]),
      potential_from_vacant: parseMoney(row[col('POTENTIAL RENT')]),
      actual_rent: parseMoney(row[col('ACTUAL RENT')]),
      total_sqft: parseInt2(row[col('TOTAL SQUARE')]),
      occupied_sqft: parseInt2(row[col('OCCUPIED SQUARE')]),
      economic_occupancy: parsePercent(row[col('ECONOMIC')]),
    })
  }

  return { units, totals }
}

function parseRentRoll(rows: string[][]): RentRollRow[] {
  const headers = rows[0]
  const col = (name: string) => headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()))
  const results: RentRollRow[] = []

  for (const row of rows.slice(1)) {
    const unit = (row[col('UNIT')] || '').trim()
    if (!unit || unit.toUpperCase() === 'TOTALS') continue

    results.push({
      unit: unit,
      size: (row[col('SIZE')] || '').trim(),
      business_name: (row[col('BUSINESS NAME')] || '').trim(),
      first_name: (row[col('FIRST NAME')] || '').trim(),
      last_name: (row[col('LAST NAME')] || '').trim(),
      account: (row[col('ACCOUNT')] || '').trim(),
      rental_start: (row[col('RENTAL START')] || '').trim(),
      paid_thru: (row[col('PAID THRU')] || '').trim(),
      rent_rate: parseMoney(row[col('RENT RATE')]),
      insurance_premium: parseMoney(row[col('INSURANCE PREMIUM')]),
      security_deposit: parseMoney(row[col('SECURITY DEPOSIT')]),
      rent_due: parseMoney(row[col('RENT DUE')]),
      insurance_due: parseMoney(row[col('INSURANCE DUE')]),
      fees_due: parseMoney(row[col('FEES DUE')]),
      other_due: parseMoney(row[col('OTHER DUE')]),
      prepaid: parseMoney(row[col('PREPAID')]),
      total_due: parseMoney(row[col('TOTAL DUE')]),
      days_past_due: parseInt2(row[col('DAYS PAST DUE')]),
    })
  }
  return results
}

function parseRentRatesByTenant(rows: string[][]): RentRateRow[] {
  const headers = rows[0]
  const col = (name: string) => headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()))
  const results: RentRateRow[] = []

  // Need exact column matching for some ambiguous columns
  const actualRateIdx = headers.findIndex(h => h.trim() === 'Actual Rate')
  const actualRateStartIdx = headers.findIndex(h => h.trim() === 'Actual Rate Start')

  for (const row of rows.slice(1)) {
    // The "Unit" column for the unit name (not Unit SF/W/L/H)
    const unitNameIdx = headers.findIndex(h => h.trim() === 'Unit')
    const unitName = unitNameIdx >= 0 ? (row[unitNameIdx] || '').trim() : ''
    if (!unitName || unitName.toUpperCase() === 'TOTALS') continue

    const tenantFirst = (row[col('Tenant First')] || '').trim()
    const tenantLast = (row[col('Tenant Last')] || '').trim()

    results.push({
      unit_sf: parseInt2(row[col('Unit SF')]),
      unit_w: parseInt2(row[col('Unit W')]),
      unit_l: parseInt2(row[col('Unit L')]),
      unit_type: (row[col('Unit Type')] || '').trim(),
      access_type: (row[col('Access Type')] || '').trim(),
      door_type: (row[col('Door Type')] || '').trim(),
      standard_rate: parseMoney(row[col('Standard Rent Rate')]),
      unit: unitName,
      tenant_name: `${tenantFirst} ${tenantLast}`.trim(),
      moved_in: (row[col('Moved In')] || '').trim(),
      moving_out: (row[col('Moving Out')] || '').trim(),
      paid_thru: (row[col('Paid Thru')] || '').trim(),
      actual_rate: actualRateIdx >= 0 ? parseMoney(row[actualRateIdx]) : 0,
      actual_rate_start: actualRateStartIdx >= 0 ? (row[actualRateStartIdx] || '').trim() : '',
      discount: parseMoney(row[col('Discount')]),
      discount_description: (row[col('Discount Description')] || '').trim(),
      paid_rate: parseMoney(row[col('Paid Rate')]),
      rate_variance: parseMoney(row[col('Rate Variance')]),
    })
  }
  return results
}

function parseAging(rows: string[][]): { rows: AgingRow[], totals: { bucket_0_30: number; bucket_31_60: number; bucket_61_90: number; bucket_91_120: number; bucket_120_plus: number; total: number } } {
  const headers = rows[0]
  const col = (name: string) => headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()))
  const results: AgingRow[] = []
  let totals = { bucket_0_30: 0, bucket_31_60: 0, bucket_61_90: 0, bucket_91_120: 0, bucket_120_plus: 0, total: 0 }

  for (const row of rows.slice(1)) {
    const unit = (row[col('UNIT')] || '').trim()
    if (!unit) continue

    if (unit.toUpperCase() === 'TOTALS') {
      totals = {
        bucket_0_30: parseMoney(row[col('0-30')]),
        bucket_31_60: parseMoney(row[col('31-60')]),
        bucket_61_90: parseMoney(row[col('61-90')]),
        bucket_91_120: parseMoney(row[col('91-120')]),
        bucket_120_plus: parseMoney(row[col('120+')]),
        total: parseMoney(row[col('TOTAL')]),
      }
      continue
    }

    results.push({
      unit,
      first_name: (row[col('FIRST NAME')] || '').trim(),
      last_name: (row[col('LAST NAME')] || '').trim(),
      business_name: (row[col('BUSINESS NAME')] || '').trim(),
      bucket_0_30: parseMoney(row[col('0-30')]),
      bucket_31_60: parseMoney(row[col('31-60')]),
      bucket_61_90: parseMoney(row[col('61-90')]),
      bucket_91_120: parseMoney(row[col('91-120')]),
      bucket_120_plus: parseMoney(row[col('120+')]),
      total: parseMoney(row[col('TOTAL')]),
      move_out: (row[col('MOVE OUT')] || '').trim(),
    })
  }

  return { rows: results, totals }
}

function parseAnnualRevenue(rows: string[][]): AnnualRevenueRow[] {
  const headers = rows[0]
  const col = (name: string) => headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()))
  const results: AnnualRevenueRow[] = []

  for (const row of rows.slice(1)) {
    const year = parseInt2(row[col('YEAR')])
    if (!year) continue

    results.push({
      year,
      month: (row[col('MONTH')] || '').trim(),
      quarter: parseInt2(row[col('QUARTER')]),
      revenue: parseMoney(row[col('REVENUE')]),
      monthly_tax: parseMoney(row[col('MONTHLY TAX')]),
      move_ins: parseInt2(row[col('MOVE-INS')]),
      move_outs: parseInt2(row[col('MOVE-OUTS')]),
    })
  }
  return results
}

function parseLengthOfStay(rows: string[][]): LengthOfStayRow[] {
  const headers = rows[0]
  const col = (name: string) => headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()))
  const results: LengthOfStayRow[] = []

  for (const row of rows.slice(1)) {
    const name = (row[col('TENANT NAME')] || '').trim()
    if (!name || name.toUpperCase() === 'TOTALS') continue

    results.push({
      tenant_name: name,
      latest_unit: (row[col('LATEST UNIT')] || '').trim(),
      move_in: (row[col('MOVE-IN')] || '').trim(),
      move_out: (row[col('MOVE-OUT')] || '').trim(),
      days_in_unit: parseInt2(row[col('DAYS IN UNIT')]),
      lead_source: (row[col('LEAD SOURCE')] || '').trim(),
      lead_category: (row[col('LEAD CATEGORY')] || '').trim(),
    })
  }
  return results
}

function parseMoveInKPI(rows: string[][]): MoveInKPIRow[] {
  const headers = rows[0]
  const col = (name: string) => headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()))
  const results: MoveInKPIRow[] = []

  for (const row of rows.slice(1)) {
    const employee = (row[col('EMPLOYEE')] || '').trim()
    if (!employee || employee.toUpperCase() === 'TOTALS') continue

    results.push({
      employee,
      move_ins: parseInt2(row[col('MOVE-INS')]),
      move_outs: parseInt2(row[col('MOVE-OUTS')]),
      net_units: parseInt2(row[col('NET UNITS')]),
      insurance_policies_sold: parseInt2(row[col('INSURANCE POLICIES')]),
      insurance_sold: parseMoney(row[col('INSURANCE SOLD')]),
      pct_insurance: parsePercent(row[col('% INSURANCE')]),
      autopay_enrollments: parseInt2(row[col('AUTOPAY ENROLLMENTS')]),
      pct_autopay: parsePercent(row[col('% AUTOPAY')]),
      retail_sales: parseMoney(row[col('RETAIL SALES')]),
      total_discounts: parseMoney(row[col('TOTAL DISCOUNTS')]),
      avg_discounts_per_move_in: parseMoney(row[col('AVERAGE DISCOUNTS')]),
    })
  }
  return results
}

/* ── Main Parse Function ── */

export function parseStorEdgeCSV(text: string): ParsedReport {
  const type = detectReportType(text)
  const rows = parseCSV(text)

  switch (type) {
    case 'consolidated_occupancy': {
      const data = parseConsolidatedOccupancy(rows)
      return {
        type,
        label: 'Consolidated Occupancy',
        data,
        summary: `${data.units.length} unit types, ${data.totals.total_units} total units, ${data.totals.occupancy_pct}% occupied`,
      }
    }
    case 'rent_roll': {
      const data = parseRentRoll(rows)
      return {
        type,
        label: 'Rent Roll',
        data,
        summary: `${data.length} tenant records`,
      }
    }
    case 'rent_rates_by_tenant': {
      const data = parseRentRatesByTenant(rows)
      return {
        type,
        label: 'Rent Rates by Tenant',
        data,
        summary: `${data.length} tenant rate records`,
      }
    }
    case 'aging': {
      const data = parseAging(rows)
      return {
        type,
        label: 'Aging Report',
        data,
        summary: `${data.rows.length} delinquent accounts, $${data.totals.total.toLocaleString()} total outstanding`,
      }
    }
    case 'annual_revenue': {
      const data = parseAnnualRevenue(rows)
      const years = [...new Set(data.map(r => r.year))]
      return {
        type,
        label: 'Annual Revenue & Occupancy',
        data,
        summary: `${data.length} months of data (${years[0]}–${years[years.length - 1]})`,
      }
    }
    case 'length_of_stay': {
      const data = parseLengthOfStay(rows)
      return {
        type,
        label: 'Length of Stay',
        data,
        summary: `${data.length} tenant records`,
      }
    }
    case 'move_in_kpi': {
      const data = parseMoveInKPI(rows)
      return {
        type,
        label: 'Move-In KPI',
        data,
        summary: `${data.length} employee records`,
      }
    }
    default:
      return { type: 'unknown', label: 'Unknown Report', data: null, summary: 'Could not detect report type' }
  }
}

/* ── Transform to API Payloads ── */

/**
 * Transform Consolidated Occupancy data into bulk_save_units payload
 */
export function occupancyToUnits(data: ConsolidatedOccupancyData, facilityId: string) {
  return {
    action: 'bulk_save_units',
    facility_id: facilityId,
    units: data.units.map(u => ({
      unit_type: u.unit_type,
      size_label: u.size_label,
      width_ft: u.width_ft,
      depth_ft: u.depth_ft,
      sqft: u.sqft,
      floor: u.floor,
      features: u.features,
      total_count: u.total_count,
      occupied_count: u.occupied_count,
      street_rate: u.street_rate,
      actual_avg_rate: u.occupied_count > 0 ? Math.round((u.actual_rent / u.occupied_count) * 100) / 100 : null,
      web_rate: null,
      push_rate: null,
      ecri_eligible: 0,
    })),
  }
}

/**
 * Transform Consolidated Occupancy data into save_snapshot payload
 */
export function occupancyToSnapshot(data: ConsolidatedOccupancyData, facilityId: string) {
  return {
    action: 'save_snapshot',
    facility_id: facilityId,
    snapshot_date: new Date().toISOString().slice(0, 10),
    total_units: data.totals.total_units,
    occupied_units: data.totals.occupied,
    occupancy_pct: data.totals.occupancy_pct,
    total_sqft: data.totals.total_sqft,
    occupied_sqft: data.totals.occupied_sqft,
    gross_potential: data.totals.scheduled_rent,
    actual_revenue: data.totals.actual_rent,
    delinquency_pct: null,
    move_ins_mtd: 0,
    move_outs_mtd: 0,
    notes: 'Imported from storEDGE Consolidated Occupancy report',
  }
}

/**
 * Transform Rent Rates data to enrich unit actual_avg_rate
 * Returns a map of unit_type => average actual rate
 */
export function rentRatesToAvgRates(data: RentRateRow[]): Record<string, { avg_rate: number; count: number }> {
  const byType: Record<string, { sum: number; count: number }> = {}
  for (const r of data) {
    const key = `${r.unit_w}x${r.unit_l} ${r.unit_type} ${r.access_type}`.trim()
    if (!byType[key]) byType[key] = { sum: 0, count: 0 }
    byType[key].sum += r.actual_rate
    byType[key].count++
  }
  const result: Record<string, { avg_rate: number; count: number }> = {}
  for (const [k, v] of Object.entries(byType)) {
    result[k] = { avg_rate: Math.round((v.sum / v.count) * 100) / 100, count: v.count }
  }
  return result
}

/**
 * Transform Aging data into delinquency summary for snapshot enrichment
 */
export function agingToDelinquencySummary(data: { rows: AgingRow[], totals: { total: number } }) {
  return {
    total_delinquent: data.totals.total,
    delinquent_accounts: data.rows.length,
    buckets: {
      current: data.rows.filter(r => r.bucket_0_30 > 0 && r.bucket_31_60 === 0).length,
      days_31_60: data.rows.filter(r => r.bucket_31_60 > 0).length,
      days_61_90: data.rows.filter(r => r.bucket_61_90 > 0).length,
      days_91_plus: data.rows.filter(r => r.bucket_91_120 > 0 || r.bucket_120_plus > 0).length,
    },
  }
}

/**
 * Get the REPORT_LABELS map for display
 */
export const REPORT_LABELS: Record<StorEdgeReportType, string> = {
  consolidated_occupancy: 'Consolidated Occupancy',
  rent_roll: 'Rent Roll',
  rent_rates_by_tenant: 'Rent Rates by Tenant',
  aging: 'Aging Report',
  annual_revenue: 'Annual Revenue & Occupancy',
  length_of_stay: 'Length of Stay',
  move_in_kpi: 'Move-In KPI',
  unknown: 'Unknown',
}
