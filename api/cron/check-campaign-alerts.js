import { query, queryOne } from '../_db.js'

/*
  Vercel Cron: Check Campaign Alerts
  Schedule: Every 6 hours (0 */6 * * *)

  Scans campaign data for anomalies, persists alerts to alert_history,
  sends email notifications for critical alerts.
*/

function esc(str) {
  if (!str) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function generateAlerts(client, campaigns) {
  const alerts = []

  if (!campaigns || campaigns.length === 0) {
    const signedAt = new Date(client.signed_at || client.created_at)
    const daysSinceSigned = Math.round((Date.now() - signedAt.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceSigned > 14) {
      alerts.push({
        type: 'no_campaigns',
        severity: 'warning',
        title: 'No campaigns launched',
        detail: `${client.facility_name} signed ${daysSinceSigned} days ago but has no campaign data yet.`,
        metric: daysSinceSigned,
      })
    }
    return alerts
  }

  const latest = campaigns[campaigns.length - 1]
  const previous = campaigns.length >= 2 ? campaigns[campaigns.length - 2] : null
  const avgCpl = campaigns.reduce((s, c) => s + Number(c.cpl || 0), 0) / campaigns.length
  const avgRoas = campaigns.reduce((s, c) => s + Number(c.roas || 0), 0) / campaigns.length

  // CPL spike
  if (Number(latest.cpl) > avgCpl * 1.5 && Number(latest.cpl) > 15) {
    alerts.push({
      type: 'cpl_spike',
      severity: Number(latest.cpl) > avgCpl * 2 ? 'critical' : 'warning',
      title: 'CPL spike detected',
      detail: `Current CPL ($${Number(latest.cpl).toFixed(0)}) is ${Math.round((Number(latest.cpl) / avgCpl - 1) * 100)}% above average ($${avgCpl.toFixed(0)}).`,
      metric: Number(latest.cpl),
      threshold: avgCpl * 1.5,
    })
  }

  // ROAS drop
  if (Number(latest.roas) < 2.0 && Number(latest.roas) > 0) {
    alerts.push({
      type: 'roas_drop',
      severity: Number(latest.roas) < 1.0 ? 'critical' : 'warning',
      title: 'ROAS below target',
      detail: `Current ROAS (${Number(latest.roas).toFixed(1)}x) is below the 2.0x target.`,
      metric: Number(latest.roas),
      threshold: 2.0,
    })
  }

  // Lead drought
  if (Number(latest.leads) === 0 && Number(latest.spend) > 0) {
    alerts.push({
      type: 'lead_drought',
      severity: 'critical',
      title: 'Zero leads with active spend',
      detail: `$${Number(latest.spend).toLocaleString()} spent with zero leads this period.`,
      metric: 0,
    })
  }

  // MoM drop
  if (previous && Number(previous.move_ins) > 0 && Number(latest.move_ins) < Number(previous.move_ins) * 0.5) {
    alerts.push({
      type: 'movein_drop',
      severity: 'warning',
      title: 'Move-in volume dropped',
      detail: `Move-ins dropped from ${previous.move_ins} to ${latest.move_ins} (${Math.round((1 - Number(latest.move_ins) / Number(previous.move_ins)) * 100)}% decline).`,
      metric: Number(latest.move_ins),
      threshold: Number(previous.move_ins) * 0.5,
    })
  }

  // Milestone: ROAS above 5x
  if (Number(latest.roas) >= 5.0) {
    alerts.push({
      type: 'milestone_roas',
      severity: 'info',
      title: 'ROAS milestone reached',
      detail: `${Number(latest.roas).toFixed(1)}x return on ad spend. The system is compounding.`,
      metric: Number(latest.roas),
    })
  }

  return alerts
}

export default async function handler(req, res) {
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const results = { checked: 0, alertsCreated: 0, emailsSent: 0, errors: [] }

  try {
    // Get all signed clients with campaigns
    const clients = await query(
      `SELECT c.*, f.name AS fac_name, f.id AS fac_id
       FROM clients c
       JOIN facilities f ON c.facility_id = f.id`
    )

    for (const client of clients) {
      try {
        results.checked++

        const campaigns = await query(
          `SELECT * FROM client_campaigns WHERE client_id = $1 ORDER BY month ASC`,
          [client.id]
        )

        const alerts = generateAlerts(client, campaigns)

        for (const alert of alerts) {
          // Dedup: check if same alert type within 24h
          const existing = await queryOne(
            `SELECT id FROM alert_history
             WHERE client_id = $1 AND alert_type = $2 AND created_at > NOW() - INTERVAL '24 hours'`,
            [client.id, alert.type]
          )
          if (existing) continue

          // Insert alert
          await query(
            `INSERT INTO alert_history (client_id, facility_id, alert_type, severity, title, detail, metric, threshold)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [client.id, client.fac_id, alert.type, alert.severity, alert.title, alert.detail, alert.metric || null, alert.threshold || null]
          )
          results.alertsCreated++

          // Email for critical alerts
          if (alert.severity === 'critical') {
            const apiKey = process.env.RESEND_API_KEY
            if (apiKey) {
              const recipients = (process.env.AUDIT_NOTIFICATION_EMAILS || 'blake@urkovro.resend.app').split(',').map(e => e.trim())

              fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  from: 'StowStack <alerts@stowstack.co>',
                  to: recipients,
                  subject: `🚨 ${alert.title} — ${client.fac_name || client.facility_name}`,
                  html: `
                    <div style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:16px;">
                        <h2 style="margin:0 0 8px;color:#dc2626;font-size:16px;">${esc(alert.title)}</h2>
                        <p style="margin:0;color:#7f1d1d;font-size:14px;">${esc(alert.detail)}</p>
                      </div>
                      <p style="color:#666;font-size:13px;">Facility: ${esc(client.fac_name || client.facility_name)}</p>
                      <a href="https://stowstack.co/admin" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;text-decoration:none;border-radius:6px;font-size:13px;margin-top:12px;">View in Dashboard</a>
                    </div>`,
                }),
              }).catch(err => console.error('Alert email error:', err.message))

              results.emailsSent++
            }
          }
        }
      } catch (err) {
        results.errors.push(`${client.email}: ${err.message}`)
      }
    }

    return res.json({ success: true, ...results })
  } catch (err) {
    console.error('check-campaign-alerts error:', err)
    return res.status(500).json({ error: err.message, ...results })
  }
}
