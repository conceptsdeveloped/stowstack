import pg from 'pg'

const { Pool } = pg

// Reuse pool across warm serverless invocations
let pool

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.STORAGE_POSTGRES_URL,
      ssl: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false'
        ? { rejectUnauthorized: false }
        : { rejectUnauthorized: true },
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    })
  }
  return pool
}

export async function query(sql, params) {
  const pool = getPool()
  const { rows } = await pool.query(sql, params)
  return rows
}

export async function queryOne(sql, params) {
  const rows = await query(sql, params)
  return rows[0] || null
}
