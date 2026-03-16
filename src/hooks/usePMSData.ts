import { useState, useEffect, useCallback } from 'react'

/* ── PMS Data Types ── */

export interface PMSUnit {
  id: string
  facility_id: string
  unit_type: string
  size_label: string | null
  width_ft: number | null
  depth_ft: number | null
  sqft: number | null
  floor: string | null
  features: string[]
  total_count: number
  occupied_count: number
  vacant_count: number
  street_rate: number | null
  actual_avg_rate: number | null
  web_rate: number | null
  push_rate: number | null
  ecri_eligible: number
  last_updated: string
}

export interface PMSSnapshot {
  id: string
  facility_id: string
  snapshot_date: string
  total_units: number | null
  occupied_units: number | null
  occupancy_pct: number | null
  total_sqft: number | null
  occupied_sqft: number | null
  gross_potential: number | null
  actual_revenue: number | null
  delinquency_pct: number | null
  move_ins_mtd: number
  move_outs_mtd: number
  notes: string | null
}

export interface PMSSpecial {
  id: string
  facility_id: string
  name: string
  description: string | null
  applies_to: string[]
  discount_type: string
  discount_value: number | null
  min_lease_months: number
  start_date: string | null
  end_date: string | null
  active: boolean
}

export interface PMSData {
  snapshot: PMSSnapshot | null
  units: PMSUnit[]
  specials: PMSSpecial[]
  rateHistory: { id: string; unit_type: string; effective_date: string; street_rate: number | null; web_rate: number | null }[]
  // Computed
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  occupancyPct: number
  grossPotential: number
  actualRevenue: number
  revenueCapture: number // actual / gross potential as %
  unitMix: { type: string; count: number; rate: number; vacancy: number; features: string[] }[]
}

/**
 * Hook for consuming PMS data across the app.
 * Pass an adminKey for admin contexts, or null for client-facing (uses the public endpoint).
 */
export function usePMSData(facilityId: string | null, adminKey?: string) {
  const [data, setData] = useState<PMSData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPMS = useCallback(async () => {
    if (!facilityId) return
    setLoading(true)
    setError(null)
    try {
      const headers: Record<string, string> = {}
      if (adminKey) headers['X-Admin-Key'] = adminKey
      const res = await fetch(`/api/facility-pms?facilityId=${facilityId}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch PMS data')
      const raw = await res.json()

      const units: PMSUnit[] = raw.units || []
      const snapshot: PMSSnapshot | null = raw.snapshot || null
      const specials: PMSSpecial[] = raw.specials || []
      const rateHistory = raw.rateHistory || []

      // Compute aggregates from unit-level data
      const totalUnits = units.reduce((s, u) => s + u.total_count, 0)
      const occupiedUnits = units.reduce((s, u) => s + u.occupied_count, 0)
      const vacantUnits = totalUnits - occupiedUnits
      const occupancyPct = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
      const grossPotential = units.reduce((s, u) => s + (u.total_count * (u.street_rate || 0)), 0)
      const actualRevenue = units.reduce((s, u) => s + (u.occupied_count * (u.actual_avg_rate || u.street_rate || 0)), 0)
      const revenueCapture = grossPotential > 0 ? (actualRevenue / grossPotential) * 100 : 0

      // Build unitMix format compatible with DemoDashboard
      const unitMix = units.map(u => ({
        type: u.unit_type,
        count: u.total_count,
        rate: u.street_rate || 0,
        vacancy: u.total_count - u.occupied_count,
        features: u.features || [],
      }))

      setData({ snapshot, units, specials, rateHistory, totalUnits, occupiedUnits, vacantUnits, occupancyPct, grossPotential, actualRevenue, revenueCapture, unitMix })
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }, [facilityId, adminKey])

  useEffect(() => { fetchPMS() }, [fetchPMS])

  return { data, loading, error, refetch: fetchPMS }
}
