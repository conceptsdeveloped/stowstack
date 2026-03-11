export function getLetterGrade(score) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export function getScoreColor(score) {
  if (score >= 90) return '#22c55e'  // bright green
  if (score >= 80) return '#4ade80'  // green
  if (score >= 70) return '#a3e635'  // yellow-green
  if (score >= 60) return '#f59e0b'  // amber
  if (score >= 50) return '#f97316'  // orange
  return '#ef4444'                    // red
}

export function getScoreColorClass(score) {
  if (score >= 90) return 'text-green-400'
  if (score >= 80) return 'text-green-500'
  if (score >= 70) return 'text-lime-400'
  if (score >= 60) return 'text-amber-400'
  if (score >= 50) return 'text-orange-400'
  return 'text-red-400'
}

export function getScoreBgClass(score) {
  if (score >= 90) return 'bg-green-400/20'
  if (score >= 80) return 'bg-green-500/20'
  if (score >= 70) return 'bg-lime-400/20'
  if (score >= 60) return 'bg-amber-400/20'
  if (score >= 50) return 'bg-orange-400/20'
  return 'bg-red-400/20'
}

export function getSeverityColor(severity) {
  switch (severity) {
    case 'critical': return '#ef4444'
    case 'warning': return '#f59e0b'
    case 'healthy': return '#22c55e'
    default: return '#94a3b8'
  }
}

export function getSeverityBadgeClass(severity) {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'healthy': return 'bg-green-500/20 text-green-400 border-green-500/30'
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
}

export function getImpactBadgeClass(impact) {
  switch (impact) {
    case 'high': return 'bg-red-500/20 text-red-300'
    case 'medium': return 'bg-amber-500/20 text-amber-300'
    case 'low': return 'bg-blue-500/20 text-blue-300'
    default: return 'bg-slate-500/20 text-slate-300'
  }
}

export function getEffortBadgeClass(effort) {
  switch (effort) {
    case 'high': return 'bg-purple-500/20 text-purple-300'
    case 'medium': return 'bg-sky-500/20 text-sky-300'
    case 'low': return 'bg-emerald-500/20 text-emerald-300'
    default: return 'bg-slate-500/20 text-slate-300'
  }
}

export function getFunnelStatusColor(status) {
  switch (status) {
    case 'strong': return '#22c55e'
    case 'weak': return '#f59e0b'
    case 'critical': return '#ef4444'
    default: return '#94a3b8'
  }
}

export const CATEGORY_LABELS = {
  occupancy_momentum: 'Occupancy & Momentum',
  unit_mix_vacancy: 'Unit Mix & Vacancy',
  lead_flow_conversion: 'Lead Flow & Conversion',
  sales_followup: 'Sales & Follow-Up',
  marketing_adspend: 'Marketing & Ad Spend',
  digital_presence: 'Digital Presence & Reputation',
  revenue_management: 'Revenue Management & Pricing',
  operations_staffing: 'Operations & Staffing',
  competitive_position: 'Competitive Position',
}

export const CATEGORY_ICONS = {
  occupancy_momentum: 'TrendingUp',
  unit_mix_vacancy: 'LayoutGrid',
  lead_flow_conversion: 'Users',
  sales_followup: 'Phone',
  marketing_adspend: 'Megaphone',
  digital_presence: 'Globe',
  revenue_management: 'DollarSign',
  operations_staffing: 'Settings',
  competitive_position: 'Target',
}
