import pg from 'pg'

const { Pool } = pg

// Reuse pool across warm serverless invocations
let pool

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.STORAGE_POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    })
  }
  return pool
}

export async function query(sql, params) {
  const pool = getPool()
  const { rows } = await pool.query(sql, params)
  return rows
}
