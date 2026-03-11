import CategoryScorecard from './CategoryScorecard'
import { CATEGORY_LABELS } from '../../lib/scoreUtils'

const CATEGORY_ORDER = [
  'occupancy_momentum',
  'unit_mix_vacancy',
  'lead_flow_conversion',
  'sales_followup',
  'marketing_adspend',
  'digital_presence',
  'revenue_management',
  'operations_staffing',
  'competitive_position',
]

export default function CategoryGrid({ categories, darkMode, onExpandCategory }) {
  if (!categories) return null

  return (
    <div>
      <h2 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        Category Scores
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORY_ORDER.map(key => {
          const data = categories[key]
          if (!data) return null
          return (
            <CategoryScorecard
              key={key}
              categoryKey={key}
              data={data}
              darkMode={darkMode}
              onExpand={() => onExpandCategory(key)}
            />
          )
        })}
      </div>
    </div>
  )
}
