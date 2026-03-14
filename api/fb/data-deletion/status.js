/**
 * GET /api/fb/data-deletion/status?code=<confirmation_code>
 *
 * User-facing status page for Facebook data deletion requests.
 * Returns a branded HTML page showing the current status.
 */

import { query } from '../../_db.js'

function esc(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const code = req.query.code
  let request = null

  if (code && /^[a-f0-9]{16}$/.test(code)) {
    try {
      const rows = await query(
        `SELECT confirmation_code, fb_user_id, status, requested_at, completed_at
         FROM fb_deletion_requests
         WHERE confirmation_code = $1
         LIMIT 1`,
        [code]
      )
      if (rows.length > 0) {
        request = rows[0]
      }
    } catch (dbErr) {
      console.error('[FB Data Deletion] DB lookup failed:', dbErr.message)
    }
  }

  const statusLabel = {
    pending: 'Pending — Your request has been received and is queued for processing.',
    in_progress: 'In Progress — We are actively deleting your data.',
    completed: 'Completed — All associated data has been deleted.',
  }

  const requestedDate = request
    ? new Date(request.requested_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  const completedDate =
    request && request.completed_at
      ? new Date(request.completed_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null

  const safeCode = esc(code || '')
  const status = request ? request.status : null

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Data Deletion Status — StowStack</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0C0F14;
      --surface: #151922;
      --border: #1F2633;
      --text: #E4E7EC;
      --text-muted: #8B93A1;
      --accent: #3B82F6;
      --accent-soft: rgba(59,130,246,0.12);
      --green: #22C55E;
      --green-soft: rgba(34,197,94,0.12);
      --amber: #F59E0B;
      --amber-soft: rgba(245,158,11,0.12);
    }
    body {
      font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.5rem;
      max-width: 520px;
      width: 100%;
    }
    .logo {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 1.75rem;
    }
    .logo span { color: var(--accent); }
    h1 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }
    .field {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }
    .field:last-child { border-bottom: none; }
    .field-label { color: var(--text-muted); font-size: 0.875rem; }
    .field-value { font-weight: 500; font-size: 0.875rem; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .badge--pending   { background: var(--amber-soft); color: var(--amber); }
    .badge--in_progress { background: var(--accent-soft); color: var(--accent); }
    .badge--completed { background: var(--green-soft); color: var(--green); }
    .badge::before {
      content: '';
      width: 6px; height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
    .status-detail {
      margin-top: 1.25rem;
      padding: 1rem 1.25rem;
      background: var(--bg);
      border-radius: 10px;
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .not-found {
      text-align: center;
      color: var(--text-muted);
    }
    .not-found h1 { color: var(--text); }
    .not-found p { margin-top: 0.5rem; line-height: 1.6; }
    .footer {
      margin-top: 2rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .footer a { color: var(--accent); text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Stow<span>Stack</span></div>
    ${
      request
        ? `
    <h1>Data Deletion Request</h1>
    <div class="field">
      <span class="field-label">Confirmation Code</span>
      <span class="field-value" style="font-family: monospace;">${safeCode}</span>
    </div>
    <div class="field">
      <span class="field-label">Status</span>
      <span class="badge badge--${status}">${status.replace('_', ' ')}</span>
    </div>
    <div class="field">
      <span class="field-label">Requested</span>
      <span class="field-value">${requestedDate}</span>
    </div>
    ${completedDate ? `<div class="field"><span class="field-label">Completed</span><span class="field-value">${completedDate}</span></div>` : ''}
    <div class="status-detail">
      ${statusLabel[status]}
      StowStack does not store Facebook profile data beyond what is necessary for ad campaign attribution. If you have questions, contact us at
      <a href="mailto:privacy@stowstack.co" style="color:var(--accent);">privacy@stowstack.co</a>.
    </div>
    `
        : `
    <div class="not-found">
      <h1>Request Not Found</h1>
      <p>We couldn't find a deletion request matching that confirmation code. If you believe this is an error, contact
        <a href="mailto:privacy@stowstack.co" style="color:var(--accent);">privacy@stowstack.co</a>.
      </p>
    </div>
    `
    }
  </div>
  <div class="footer">&copy; ${new Date().getFullYear()} <a href="https://stowstack.co">StowStack</a></div>
</body>
</html>`)
}
