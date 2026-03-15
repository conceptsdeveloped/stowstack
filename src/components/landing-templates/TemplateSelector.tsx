import { useState } from 'react'
import { StandardTemplate, AggressiveTemplate, LocalTemplate, type LandingPageTemplateProps } from './index'
import { Check, Eye } from 'lucide-react'

export type TemplateType = 'standard' | 'aggressive' | 'local'

interface TemplateSelectorProps {
  onSelect: (template: TemplateType) => void
  onPreview?: (template: TemplateType) => void
  selectedTemplate?: TemplateType
  facilityName?: string
  canProceed?: boolean
}

const templateDefinitions = [
  {
    id: 'standard',
    name: 'Standard Template',
    description: 'Professional, clean, trust-focused layout for branded search and retargeting campaigns',
    features: [
      'Clean professional design',
      'Trust signals & reviews',
      'Full feature showcase',
      'Location map included',
      'Works for all campaign types'
    ],
    icon: '🏢',
    color: 'from-emerald-500 to-green-600',
    textColor: 'text-emerald-600'
  },
  {
    id: 'aggressive',
    name: 'Aggressive Template',
    description: 'Bold, urgency-heavy design optimized for cold Meta traffic and conversion',
    features: [
      'Bold, high-impact design',
      'Large offer display',
      'Urgency & countdown timer',
      'Minimal copy, max impact',
      'High-converting for paid traffic'
    ],
    icon: '⚡',
    color: 'from-red-500 to-orange-600',
    textColor: 'text-red-600'
  },
  {
    id: 'local',
    name: 'Local Template',
    description: 'Neighborhood-focused design with community trust signals and local relevance',
    features: [
      'Neighborhood positioning',
      'Local community trust',
      'Neighbor testimonials',
      'Location/map emphasis',
      'Hyper-local appeal'
    ],
    icon: '📍',
    color: 'from-blue-500 to-indigo-600',
    textColor: 'text-blue-600'
  }
]

/**
 * TemplateSelector - Visual selector for choosing landing page templates
 * Shows cards with template previews and allows selection/preview
 */
export function TemplateSelector({
  onSelect,
  onPreview: _onPreview,
  selectedTemplate,
  facilityName = 'Your Facility',
  canProceed = true
}: TemplateSelectorProps) {
  const [previewMode, setPreviewMode] = useState<TemplateType | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  if (showPreview && previewMode) {
    return (
      <TemplatePreviewModal
        templateId={previewMode}
        facilityName={facilityName}
        onClose={() => {
          setShowPreview(false)
          setPreviewMode(null)
        }}
        onSelect={() => {
          onSelect(previewMode)
          setShowPreview(false)
          setPreviewMode(null)
        }}
      />
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <div className="mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
          Choose Your Landing Page Template
        </h2>
        <p className="text-lg text-slate-600">
          Select a template that matches your campaign strategy. Each is optimized for different traffic sources and goals.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {templateDefinitions.map((template) => {
          const isSelected = selectedTemplate === template.id
          return (
            <div
              key={template.id}
              className={`rounded-2xl border-2 overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
                isSelected
                  ? 'border-slate-900 bg-slate-50 shadow-lg'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Header */}
              <div className={`p-6 bg-gradient-to-r ${template.color} text-white`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{template.icon}</span>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      <Check size={16} className="text-slate-900" />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-1">{template.name}</h3>
              </div>

              {/* Description */}
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  {template.description}
                </p>

                {/* Features */}
                <div className="mb-8">
                  <ul className="space-y-2">
                    {template.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${template.textColor} bg-current/10`}>
                          <Check size={12} className="text-current" />
                        </span>
                        <span className="text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setPreviewMode(template.id as TemplateType)
                      setShowPreview(true)
                    }}
                    className="w-full py-3 px-4 rounded-lg border-2 border-slate-200 font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-2"
                  >
                    <Eye size={16} />
                    Preview
                  </button>

                  {canProceed && (
                    <button
                      onClick={() => onSelect(template.id as TemplateType)}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-white ${
                        isSelected
                          ? `bg-gradient-to-r ${template.color}`
                          : 'bg-gradient-to-r ' + template.color + ' opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Check size={16} />
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info Box */}
      <div className="mt-12 p-6 rounded-xl bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>💡 Tip:</strong> Each template is fully optimized for mobile conversion and includes built-in pixel tracking hooks for analytics integration. Preview templates to see which one best matches your campaign goals.
        </p>
      </div>
    </div>
  )
}

/**
 * TemplatePreviewModal - Full-screen preview of a template
 * Uses mock data to show how the template renders
 */
function TemplatePreviewModal({
  templateId,
  facilityName,
  onClose,
  onSelect
}: {
  templateId: TemplateType
  facilityName: string
  onClose: () => void
  onSelect: () => void
}) {
  // Mock data for preview
  const mockProps: LandingPageTemplateProps = {
    facilityName: facilityName,
    headline: 'Climate-Controlled Storage Units in the Heart of the City',
    subheadline: 'Secure, accessible, and affordable. Move in today and get your first month at 50% off.',
    offer: {
      text: 'First Month 50% Off',
      details: 'When you move in by March 31st',
      expiry: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    },
    phone: '(555) 123-4567',
    address: '123 Storage Drive',
    city: 'Downtown District',
    neighborhood: 'Downtown',
    reviewCount: 247,
    avgRating: 4.9,
    features: [
      '24/7 secure access with keypad entry',
      'Climate-controlled units',
      'Covered loading area',
      'On-site management',
      'No long-term contracts',
      'Month-to-month flexibility'
    ],
    urgencyText: 'Only 3 units left at this price level',
    storedgeWidgetUrl: undefined,
    primaryColor: undefined
  }

  const template = templateDefinitions.find(t => t.id === templateId)

  let Component: any
  switch (templateId) {
    case 'aggressive':
      Component = AggressiveTemplate
      break
    case 'local':
      Component = LocalTemplate
      break
    default:
      Component = StandardTemplate
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      {/* Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template?.icon}</span>
            <div>
              <h3 className="font-bold text-slate-900">{template?.name}</h3>
              <p className="text-xs text-slate-500">Preview Mode</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSelect}
              className={`px-6 py-2 rounded-lg font-semibold text-white transition-all bg-gradient-to-r ${template?.color}`}
            >
              Use This Template
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-16 pb-8 overflow-y-auto">
        <div className="max-w-full">
          <Component {...mockProps} />
        </div>
      </div>

      {/* Footer Info */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            This is a preview with sample data. Your content will populate when published.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onSelect}
              className={`px-6 py-2 rounded-lg font-semibold text-white transition-all bg-gradient-to-r ${template?.color}`}
            >
              Use This Template
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * TemplatePreview - Compact preview card (for dashboard/list views)
 * Shows a snapshot of what the template looks like
 */
export function TemplatePreview({ templateId }: { templateId: TemplateType }) {
  const template = templateDefinitions.find(t => t.id === templateId)

  if (!template) return null

  const previewSizes: Record<TemplateType, { height: string; bgColor: string }> = {
    standard: { height: '300px', bgColor: 'bg-gradient-to-br from-emerald-50 to-white' },
    aggressive: { height: '300px', bgColor: 'bg-black' },
    local: { height: '300px', bgColor: 'bg-gradient-to-br from-blue-50 to-white' }
  }

  const size = previewSizes[templateId]

  return (
    <div className={`rounded-lg overflow-hidden border border-slate-200 ${size.bgColor}`} style={{ height: size.height }}>
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl block mb-3">{template.icon}</span>
          <p className="font-bold text-slate-900">{template.name}</p>
          <p className="text-xs text-slate-500 mt-1">{template.id.charAt(0).toUpperCase() + template.id.slice(1)}</p>
        </div>
      </div>
    </div>
  )
}
