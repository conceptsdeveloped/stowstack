import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, PageBreak, Header, Footer,
  TableOfContents
} from 'docx'
import { saveAs } from 'file-saver'
import { getLetterGrade, CATEGORY_LABELS } from './scoreUtils'
import { calculateProjections } from './projectionModel'

const BRAND_GREEN = '22C55E'
const DARK_BG = '0F172A'
const SLATE_700 = '334155'

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 300, after: 100 }, children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 22, color: '1E293B' })] })
}

function body(text) {
  return new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text, size: 20, color: '475569' })] })
}

function bold(label, value) {
  return new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `${label}: `, bold: true, size: 20, color: '1E293B' }), new TextRun({ text: value || '—', size: 20, color: '475569' })] })
}

function bulletItem(text, color = '475569') {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text, size: 20, color })] })
}

function flagSection(title, flags, color) {
  if (!flags?.length) return []
  return [
    new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: title, bold: true, size: 22, color })] }),
    ...flags.flatMap(f => [
      new Paragraph({ bullet: { level: 0 }, spacing: { after: 30 }, children: [new TextRun({ text: f.finding, bold: true, size: 20, color: '1E293B' })] }),
      ...(f.evidence ? [new Paragraph({ indent: { left: 360 }, spacing: { after: 20 }, children: [new TextRun({ text: `Evidence: ${f.evidence}`, size: 18, italics: true, color: '64748B' })] })] : []),
      ...(f.impact ? [new Paragraph({ indent: { left: 360 }, spacing: { after: 20 }, children: [new TextRun({ text: `Impact: ${f.impact}`, size: 18, color: '64748B' })] })] : []),
      ...(f.recommendation ? [new Paragraph({ indent: { left: 360 }, spacing: { after: 40 }, children: [new TextRun({ text: `Recommendation: ${f.recommendation}`, size: 18, color: BRAND_GREEN })] })] : []),
    ])
  ]
}

export async function generateReport(audit) {
  const facilityName = audit.facility_summary?.name || 'Facility'
  const score = audit.overall_score?.score || 0
  const grade = getLetterGrade(score)

  const sections = []

  // Cover page
  sections.push(
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'STOWSTACK', bold: true, size: 48, color: BRAND_GREEN })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'Facility Diagnostic Report', size: 36, color: '1E293B' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: facilityName, bold: true, size: 28, color: '475569' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `Overall Score: ${score}/100 (${grade})`, bold: true, size: 26, color: BRAND_GREEN })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), size: 20, color: '94A3B8' })] }),
    new Paragraph({ children: [new PageBreak()] }),
  )

  // Executive summary
  sections.push(
    heading('Executive Summary'),
    body(audit.overall_score?.summary || ''),
    new Paragraph({ spacing: { before: 100 } }),
  )

  if (audit.overall_score?.top_3_issues?.length) {
    sections.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: 'Top Issues:', bold: true, size: 22, color: 'EF4444' })] }))
    audit.overall_score.top_3_issues.forEach(issue => sections.push(bulletItem(issue, 'EF4444')))
  }

  if (audit.overall_score?.top_3_strengths?.length) {
    sections.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: 'Top Strengths:', bold: true, size: 22, color: BRAND_GREEN })] }))
    audit.overall_score.top_3_strengths.forEach(s => sections.push(bulletItem(s, BRAND_GREEN)))
  }

  sections.push(new Paragraph({ children: [new PageBreak()] }))

  // Category-by-category findings
  sections.push(heading('Detailed Category Analysis'))

  const categoryKeys = [
    'occupancy_momentum', 'unit_mix_vacancy', 'lead_flow_conversion',
    'sales_followup', 'marketing_adspend', 'digital_presence',
    'revenue_management', 'operations_staffing', 'competitive_position',
  ]

  for (const key of categoryKeys) {
    const cat = audit.categories?.[key]
    if (!cat) continue

    sections.push(
      heading(CATEGORY_LABELS[key] || key, HeadingLevel.HEADING_2),
      bold('Score', `${cat.score}/100 — ${cat.severity}`),
      bold('Headline', cat.headline),
      body(cat.analysis || ''),
      ...flagSection('Red Flags', cat.red_flags, 'EF4444'),
      ...flagSection('Yellow Flags', cat.yellow_flags, 'F59E0B'),
      ...flagSection('Green Flags', cat.green_flags, BRAND_GREEN),
    )
  }

  sections.push(new Paragraph({ children: [new PageBreak()] }))

  // Conversion funnel
  if (audit.conversion_funnel) {
    sections.push(heading('Conversion Funnel Analysis'))
    audit.conversion_funnel.stages?.forEach(stage => {
      sections.push(bold(stage.name, `${stage.status} (${stage.leak_percentage_estimate}% leak)`))
      if (stage.evidence) sections.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 40 }, children: [new TextRun({ text: stage.evidence, size: 18, italics: true, color: '64748B' })] }))
    })
    if (audit.conversion_funnel.biggest_leak) sections.push(bold('Biggest Leak', audit.conversion_funnel.biggest_leak))
    if (audit.conversion_funnel.funnel_narrative) sections.push(body(audit.conversion_funnel.funnel_narrative))
  }

  // Priority action plan
  if (audit.priority_action_plan?.length) {
    sections.push(
      new Paragraph({ children: [new PageBreak()] }),
      heading('Priority Action Plan'),
    )
    audit.priority_action_plan.forEach(action => {
      sections.push(
        new Paragraph({ spacing: { before: 150, after: 40 }, children: [new TextRun({ text: `#${action.rank}: ${action.action}`, bold: true, size: 22, color: '1E293B' })] }),
        bold('Category', action.category),
        bold('Impact / Effort', `${action.impact} impact · ${action.effort} effort`),
        bold('Timeline', action.timeline?.replace('_', ' ')),
        bold('Est. Revenue Impact', action.estimated_monthly_revenue_impact || '—'),
        ...(action.details ? [body(action.details)] : []),
      )
    })
  }

  // Revenue impact
  if (audit.revenue_impact) {
    sections.push(
      new Paragraph({ children: [new PageBreak()] }),
      heading('Revenue Impact'),
      bold('Current Estimated Monthly Revenue', audit.revenue_impact.current_estimated_monthly_revenue),
      bold('Potential Monthly Revenue', audit.revenue_impact.potential_monthly_revenue_with_fixes),
      bold('Estimated Monthly Gap', audit.revenue_impact.estimated_monthly_gap),
      body(audit.revenue_impact.assumptions || ''),
    )
    if (audit.revenue_impact.key_revenue_levers?.length) {
      sections.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: 'Key Revenue Levers:', bold: true, size: 22, color: '1E293B' })] }))
      audit.revenue_impact.key_revenue_levers.filter(Boolean).forEach(l => sections.push(bulletItem(l, BRAND_GREEN)))
    }
  }

  // Revenue decay projections
  try {
    const proj = calculateProjections(audit)
    if (proj) {
      const fmt = (n) => `$${n.toLocaleString()}`
      sections.push(
        new Paragraph({ children: [new PageBreak()] }),
        heading('What Happens If You Do Nothing'),
        body('Projected revenue over 12 months across three scenarios based on current facility trends and audit findings.'),
        new Paragraph({ spacing: { before: 150 } }),
        bold('Do Nothing (12-month total)', fmt(proj.summary.month12.doNothing)),
        bold('Quick Wins Only (12-month total)', fmt(proj.summary.month12.quickWins)),
        bold('Full StowStack Plan (12-month total)', fmt(proj.summary.month12.fullPlan)),
        new Paragraph({ spacing: { before: 150 } }),
        new Paragraph({ spacing: { after: 60 }, children: [
          new TextRun({ text: 'Revenue left on the table by doing nothing over 12 months: ', size: 22, color: '475569' }),
          new TextRun({ text: fmt(proj.summary.revenueLostDoingNothing12), bold: true, size: 24, color: 'EF4444' }),
        ]}),
        body(`Assumptions: Current occupancy at ${proj.meta.currentOccupancy}%, ${proj.meta.totalUnits} total units, monthly trend of ${proj.meta.monthlyDecayRate > 0 ? '+' : ''}${proj.meta.monthlyDecayRate}% occupancy change, targeting ${proj.meta.targetOccupancy}% stabilized occupancy.`),
      )
    }
  } catch (e) {
    // Projection calculation failed — skip section
  }

  // StowStack opportunities
  if (audit.stowstack_opportunities) {
    sections.push(
      heading('StowStack Recommendations'),
      bold('Meta Ads Fit', audit.stowstack_opportunities.meta_ads_fit),
      body(audit.stowstack_opportunities.meta_ads_rationale || ''),
      bold('Recommended Monthly Budget', audit.stowstack_opportunities.recommended_monthly_budget),
      bold('Expected Cost per Lead', audit.stowstack_opportunities.expected_cost_per_lead),
      bold('Expected Cost per Move-In', audit.stowstack_opportunities.expected_cost_per_movein),
      bold('Projected Additional Move-Ins/Month', audit.stowstack_opportunities.projected_additional_moveins_per_month),
    )
  }

  // Facility summary appendix
  if (audit.facility_summary) {
    sections.push(
      new Paragraph({ children: [new PageBreak()] }),
      heading('Appendix: Facility Information'),
    )
    const fs = audit.facility_summary
    const fields = [
      ['Name', fs.name], ['Address', fs.address], ['Contact', fs.contact_name],
      ['Email', fs.email], ['Phone', fs.phone], ['Website', fs.website],
      ['Role', fs.role], ['Tenure', fs.tenure], ['Stage', fs.stage],
      ['PMS', fs.pms], ['Unit Count', fs.unit_count_range], ['Occupancy', fs.occupancy_range],
    ]
    fields.forEach(([label, value]) => {
      if (value) sections.push(bold(label, value))
    })
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20 } },
      },
    },
    sections: [{
      properties: {},
      headers: {
        default: new Header({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'StowStack Facility Diagnostic', size: 16, color: '94A3B8', italics: true })] })]
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Confidential — Prepared by StowStack', size: 16, color: '94A3B8' })] })]
        }),
      },
      children: sections,
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `StowStack-Diagnostic-${facilityName.replace(/[^a-zA-Z0-9]/g, '-')}.docx`)
}
