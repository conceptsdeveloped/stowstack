/**
 * Campaign Creative Studio — Template Library & Render Engine
 *
 * Templates define visual ad layouts rendered to HTML5 Canvas.
 * The render engine supports custom colors, text shadows, font sizing,
 * image overlays with brightness/opacity controls, and more.
 */

// ── Category definitions ──
export const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: '📁' },
  { id: 'seasonal', label: 'Seasonal', icon: '🗓️' },
  { id: 'promo', label: 'Promotions', icon: '🏷️' },
  { id: 'urgency', label: 'Urgency', icon: '⚡' },
  { id: 'evergreen', label: 'Evergreen', icon: '🌲' },
  { id: 'specialty', label: 'Specialty', icon: '🔧' },
]

// ── Ad format specs (Meta-compliant) ──
export const AD_FORMATS = {
  feed: { width: 1080, height: 1080, label: 'Feed Post', aspect: '1:1', desc: 'Facebook & Instagram Feed' },
  story: { width: 1080, height: 1920, label: 'Story / Reel', aspect: '9:16', desc: 'Instagram Stories, Reels, TikTok' },
  landscape: { width: 1200, height: 628, label: 'Link Ad', aspect: '1.91:1', desc: 'Facebook Link Ads, Website Cards' },
}

// ── Color palettes ──
export const PALETTES = {
  brand: {
    name: 'StowStack Green',
    bg: ['#052e16', '#14532d'],
    accent: '#22c55e',
    text: '#ffffff',
    subtext: '#86efac',
    cta: '#22c55e',
    ctaText: '#052e16',
  },
  midnight: {
    name: 'Midnight Blue',
    bg: ['#0f172a', '#1e293b'],
    accent: '#38bdf8',
    text: '#ffffff',
    subtext: '#94a3b8',
    cta: '#38bdf8',
    ctaText: '#0f172a',
  },
  sunset: {
    name: 'Sunset Orange',
    bg: ['#7c2d12', '#c2410c'],
    accent: '#fb923c',
    text: '#ffffff',
    subtext: '#fed7aa',
    cta: '#fb923c',
    ctaText: '#7c2d12',
  },
  ocean: {
    name: 'Ocean Teal',
    bg: ['#0c4a6e', '#0369a1'],
    accent: '#22d3ee',
    text: '#ffffff',
    subtext: '#a5f3fc',
    cta: '#22d3ee',
    ctaText: '#0c4a6e',
  },
  slate: {
    name: 'Slate & Gold',
    bg: ['#1e293b', '#334155'],
    accent: '#f59e0b',
    text: '#ffffff',
    subtext: '#cbd5e1',
    cta: '#f59e0b',
    ctaText: '#1e293b',
  },
  forest: {
    name: 'Forest Lime',
    bg: ['#14532d', '#166534'],
    accent: '#a3e635',
    text: '#ffffff',
    subtext: '#bbf7d0',
    cta: '#a3e635',
    ctaText: '#14532d',
  },
  royal: {
    name: 'Royal Purple',
    bg: ['#3b0764', '#6b21a8'],
    accent: '#c084fc',
    text: '#ffffff',
    subtext: '#e9d5ff',
    cta: '#c084fc',
    ctaText: '#3b0764',
  },
  clean: {
    name: 'Clean White',
    bg: ['#f8fafc', '#e2e8f0'],
    accent: '#16a34a',
    text: '#0f172a',
    subtext: '#475569',
    cta: '#16a34a',
    ctaText: '#ffffff',
  },
  charcoal: {
    name: 'Charcoal',
    bg: ['#18181b', '#27272a'],
    accent: '#ef4444',
    text: '#ffffff',
    subtext: '#a1a1aa',
    cta: '#ef4444',
    ctaText: '#ffffff',
  },
  warmearth: {
    name: 'Warm Earth',
    bg: ['#422006', '#713f12'],
    accent: '#fbbf24',
    text: '#ffffff',
    subtext: '#fde68a',
    cta: '#fbbf24',
    ctaText: '#422006',
  },
}

// ── Layout types ──
export const LAYOUTS = {
  'hero-center': {
    name: 'Centered Hero',
    description: 'Big headline centered with CTA below',
    badge: { x: 0.5, y: 0.18, align: 'center' },
    headline: { x: 0.5, y: 0.42, align: 'center', maxWidth: 0.8 },
    subheadline: { x: 0.5, y: 0.58, align: 'center', maxWidth: 0.7 },
    cta: { x: 0.5, y: 0.75, align: 'center' },
    logo: { x: 0.5, y: 0.92, align: 'center' },
  },
  'hero-left': {
    name: 'Left Aligned',
    description: 'Bold left-aligned text with accent bar',
    badge: { x: 0.08, y: 0.18, align: 'left' },
    headline: { x: 0.08, y: 0.40, align: 'left', maxWidth: 0.7 },
    subheadline: { x: 0.08, y: 0.58, align: 'left', maxWidth: 0.65 },
    cta: { x: 0.08, y: 0.75, align: 'left' },
    logo: { x: 0.08, y: 0.92, align: 'left' },
    accentBar: { x: 0.04, yStart: 0.15, yEnd: 0.85, width: 4 },
  },
  'split-diagonal': {
    name: 'Diagonal Split',
    description: 'Diagonal accent with offset text',
    badge: { x: 0.5, y: 0.12, align: 'center' },
    headline: { x: 0.55, y: 0.38, align: 'center', maxWidth: 0.75 },
    subheadline: { x: 0.45, y: 0.56, align: 'center', maxWidth: 0.65 },
    cta: { x: 0.5, y: 0.73, align: 'center' },
    logo: { x: 0.5, y: 0.92, align: 'center' },
    diagonal: true,
  },
  'bold-stack': {
    name: 'Bold Stack',
    description: 'Stacked large text blocks with accent',
    badge: { x: 0.5, y: 0.15, align: 'center' },
    headline: { x: 0.5, y: 0.38, align: 'center', maxWidth: 0.85, fontSize: 1.3 },
    subheadline: { x: 0.5, y: 0.58, align: 'center', maxWidth: 0.75 },
    cta: { x: 0.5, y: 0.78, align: 'center' },
    logo: { x: 0.5, y: 0.93, align: 'center' },
  },
  'photo-overlay': {
    name: 'Photo Overlay',
    description: 'Text over uploaded photo with gradient overlay',
    badge: { x: 0.5, y: 0.15, align: 'center' },
    headline: { x: 0.5, y: 0.50, align: 'center', maxWidth: 0.85, fontSize: 1.2 },
    subheadline: { x: 0.5, y: 0.65, align: 'center', maxWidth: 0.7 },
    cta: { x: 0.5, y: 0.82, align: 'center' },
    logo: { x: 0.5, y: 0.94, align: 'center' },
    photoOverlay: true,
  },
  'hero-right': {
    name: 'Right Aligned',
    description: 'Right-aligned text with accent bar on right',
    badge: { x: 0.92, y: 0.18, align: 'right' },
    headline: { x: 0.92, y: 0.40, align: 'right', maxWidth: 0.7 },
    subheadline: { x: 0.92, y: 0.58, align: 'right', maxWidth: 0.65 },
    cta: { x: 0.92, y: 0.75, align: 'right' },
    logo: { x: 0.92, y: 0.92, align: 'right' },
    accentBar: { x: 0.955, yStart: 0.15, yEnd: 0.85, width: 4 },
  },
}

// ── Decorations ──
export const DECORATIONS = {
  none: { name: 'None' },
  dots: { name: 'Dot Grid' },
  circles: { name: 'Circles' },
  lines: { name: 'Lines' },
  geometric: { name: 'Geometric' },
  radial: { name: 'Radial Glow' },
}

// ── Copy Suggestions Library ──
export const COPY_SUGGESTIONS = {
  seasonal: {
    headlines: [
      'Make Room\nThis Spring', 'Spring Into\nStorage', 'Moving?\nWe\'ve Got\nThe Space.',
      'Summer\nStorage Deals', 'Beat the\nHeat.', 'Clear Space\nFor the\nHolidays',
      'Start Fresh\nThis Year', 'Heading to\nCampus?', 'Store Now.\nSave Later.',
    ],
    subheadlines: [
      'Declutter your home. Store with confidence.\nFirst month starting at $1.',
      'Flexible storage for seasonal needs.\nMonth-to-month. No long-term contracts.',
      'Climate-controlled units to protect\nyour belongings all season long.',
      'Make room for what matters most.\nCancel anytime. No hidden fees.',
    ],
    badges: ['🌿 Spring Special', '☀️ Summer Deals', '🎄 Holiday Special', '📦 Moving Season', '✨ New Year', '🎓 Student Storage'],
    ctas: ['Reserve Your Unit →', 'Check Availability →', 'Get Started →', 'Claim Your Space →', 'See Units & Pricing →'],
  },
  promo: {
    headlines: [
      'First Month\nFREE', '50% Off\nYour First\nMonth', 'Refer a Friend.\nYou Both Save.',
      '$1 First\nMonth', 'Zero Move-In\nFees', 'Free Lock\nWith Move-In',
    ],
    subheadlines: [
      'Move in today and pay nothing\nfor your first 30 days.',
      'Premium storage at half the price.\nNo hidden fees. No contracts.',
      'Limited time offer for new tenants.\nReserve online in 2 minutes.',
      'Get a month free when your referral\nmoves in. Share the savings.',
    ],
    badges: ['🔥 Limited Time Offer', '💰 Move-In Special', '🤝 Referral Reward', '🇺🇸 Military Appreciation', '🎁 Free Gift'],
    ctas: ['Claim Free Month →', 'Get 50% Off →', 'Redeem Offer →', 'See the Deal →', 'Save Now →'],
  },
  urgency: {
    headlines: [
      '93% Full.\nDon\'t Wait.', 'Last Chance\nTo Lock In\nThis Rate', 'Only 3\nUnits Left.',
      'Prices Go Up\nFriday.', 'Almost\nSold Out.', 'This Week\nOnly.',
    ],
    subheadlines: [
      'Only a few units left at this location.\nReserve online in 2 minutes.',
      'Current pricing expires at month end.\nLock in today\'s rate before it\'s gone.',
      'High demand in your area.\nDon\'t miss out on this location.',
      'Rates increase next month.\nSecure your unit at today\'s price.',
    ],
    badges: ['⚠️ Limited Availability', '⏰ Ending Soon', '🔥 High Demand', '🎉 Now Open', '📍 Your Area'],
    ctas: ['Reserve Before It\'s Gone →', 'Lock In My Rate →', 'Reserve Now →', 'Don\'t Miss Out →', 'Secure My Unit →'],
  },
  evergreen: {
    headlines: [
      'Your Stuff\nDeserves\nBetter.', 'Your Stuff\nIs Safe\nWith Us', 'Access Your\nUnit Anytime.',
      'Self Storage\nDone Right.', 'Clean. Secure.\nAffordable.', 'Storage\nMade Simple.',
    ],
    subheadlines: [
      'Temperature-regulated units protect\nagainst heat, cold, and humidity.',
      '24/7 surveillance. Gated access.\nIndividual door alarms. Always monitored.',
      'Drive-up units. Wide aisles.\nNo appointment needed. Open 24/7.',
      'Affordable units in your neighborhood.\nMonth-to-month flexibility.',
    ],
    badges: ['❄️ Climate Controlled', '🔒 Secure Storage', '🕐 24/7 Access', '📸 Your Facility', '⭐ Top Rated'],
    ctas: ['See Climate Units →', 'Tour Our Facility →', 'Find Your Unit →', 'Reserve Online →', 'See Pricing →'],
  },
  specialty: {
    headlines: [
      'RV & Boat\nStorage\nMade Easy', 'Storage\nFor Your\nBusiness', 'Wine Storage\nPerfected.',
      'Contractor\nStorage\nSolutions', 'Document\nStorage\nDone Right.', 'Vehicle\nStorage.',
    ],
    subheadlines: [
      'Covered & uncovered options.\nEasy pull-through access.',
      'Inventory, documents, equipment.\nDelivery acceptance available.',
      'Purpose-built for special items.\nSecurity and climate protection.',
      'Flexible sizes for your business.\n24/7 access when you need it.',
    ],
    badges: ['🚢 Vehicle Storage', '🏢 Business Solutions', '🍷 Specialty Units', '🔧 Contractor Storage'],
    ctas: ['See Vehicle Rates →', 'Get a Business Quote →', 'See Options →', 'Request a Tour →'],
  },
}

// ── Template definitions ──
export const TEMPLATES = [
  // ── SEASONAL ──
  { id: 'spring-cleaning', name: 'Spring Cleaning', category: 'seasonal', palette: 'brand', layout: 'hero-center', decoration: 'circles', badge: '🌿 Spring Special', headline: 'Make Room\nThis Spring', subheadline: 'Declutter your home. Store with confidence.\nFirst month starting at $1.', ctaText: 'Reserve Your Unit →' },
  { id: 'moving-season', name: 'Moving Season', category: 'seasonal', palette: 'ocean', layout: 'hero-left', decoration: 'lines', badge: '📦 Moving Season', headline: 'Moving?\nWe\'ve Got\nThe Space.', subheadline: 'Secure, affordable units available now.\nMonth-to-month. No long-term contracts.', ctaText: 'Check Availability →' },
  { id: 'back-to-school', name: 'Back to School', category: 'seasonal', palette: 'royal', layout: 'split-diagonal', decoration: 'geometric', badge: '🎓 Student Storage', headline: 'Heading to\nCampus?', subheadline: 'Store your stuff over the semester.\nStudent discounts available.', ctaText: 'Get Student Rate →' },
  { id: 'holiday-declutter', name: 'Holiday Declutter', category: 'seasonal', palette: 'sunset', layout: 'bold-stack', decoration: 'dots', badge: '🎄 Holiday Special', headline: 'Clear Space\nFor the\nHolidays', subheadline: 'Make room for what matters this season.\nFlexible storage. Cancel anytime.', ctaText: 'Claim Your Space →' },
  { id: 'new-year', name: 'New Year', category: 'seasonal', palette: 'midnight', layout: 'hero-center', decoration: 'circles', badge: '✨ New Year, New Space', headline: 'Start Fresh\nin 2026', subheadline: 'Organize your life with affordable storage.\nSpecial January move-in rates.', ctaText: 'Start Storing Today →' },
  { id: 'summer-storage', name: 'Summer Storage', category: 'seasonal', palette: 'ocean', layout: 'hero-center', decoration: 'lines', badge: '☀️ Summer Deals', headline: 'Hot Summer\nStorage Deals', subheadline: 'Climate-controlled units to protect\nyour belongings from the heat.', ctaText: 'Stay Cool — Reserve Now →' },
  // ── PROMOTIONS ──
  { id: 'first-month-free', name: 'First Month Free', category: 'promo', palette: 'brand', layout: 'bold-stack', decoration: 'geometric', badge: '🔥 Limited Time Offer', headline: 'First Month\nFREE', subheadline: 'Move in today and pay nothing\nfor your first 30 days.', ctaText: 'Claim Free Month →' },
  { id: 'half-off', name: '50% Off Move-In', category: 'promo', palette: 'sunset', layout: 'hero-center', decoration: 'dots', badge: '💰 Move-In Special', headline: '50% Off\nYour First\nMonth', subheadline: 'Premium storage at half the price.\nNo hidden fees. No contracts.', ctaText: 'Get 50% Off →' },
  { id: 'referral', name: 'Refer a Friend', category: 'promo', palette: 'forest', layout: 'hero-left', decoration: 'circles', badge: '🤝 Referral Reward', headline: 'Refer a Friend.\nYou Both Save.', subheadline: 'Get a month free when your referral\nmoves in. Share the savings.', ctaText: 'Learn More →' },
  { id: 'military-discount', name: 'Military Discount', category: 'promo', palette: 'midnight', layout: 'hero-center', decoration: 'lines', badge: '🇺🇸 Military Appreciation', headline: 'Thank You\nFor Your\nService', subheadline: 'Active duty & veterans receive\nexclusive storage discounts.', ctaText: 'Get Military Rate →' },
  // ── URGENCY ──
  { id: 'almost-full', name: 'Almost Full', category: 'urgency', palette: 'sunset', layout: 'bold-stack', decoration: 'none', badge: '⚠️ Limited Availability', headline: '93% Full.\nDon\'t Wait.', subheadline: 'Only a few units left at this location.\nReserve online in 2 minutes.', ctaText: 'Reserve Before It\'s Gone →' },
  { id: 'last-chance', name: 'Last Chance', category: 'urgency', palette: 'slate', layout: 'hero-center', decoration: 'geometric', badge: '⏰ Ending Soon', headline: 'Last Chance\nTo Lock In\nThis Rate', subheadline: 'Current pricing expires at month end.\nLock in today\'s rate before it\'s gone.', ctaText: 'Lock In My Rate →' },
  { id: 'new-facility', name: 'Grand Opening', category: 'urgency', palette: 'brand', layout: 'split-diagonal', decoration: 'circles', badge: '🎉 Now Open', headline: 'Brand New\nFacility.\nBrand New\nRates.', subheadline: 'Be one of our first tenants and lock\nin founding member pricing.', ctaText: 'See Grand Opening Deals →' },
  // ── EVERGREEN ──
  { id: 'climate-controlled', name: 'Climate Controlled', category: 'evergreen', palette: 'ocean', layout: 'hero-left', decoration: 'lines', badge: '❄️ Climate Controlled', headline: 'Your Stuff\nDeserves\nBetter.', subheadline: 'Temperature-regulated units protect\nagainst heat, cold, and humidity.', ctaText: 'See Climate Units →' },
  { id: 'security', name: '24/7 Security', category: 'evergreen', palette: 'midnight', layout: 'hero-center', decoration: 'dots', badge: '🔒 Secure Storage', headline: 'Your Stuff\nIs Safe\nWith Us', subheadline: '24/7 surveillance. Gated access.\nIndividual door alarms. Always monitored.', ctaText: 'Tour Our Facility →' },
  { id: 'convenience', name: 'Easy Access', category: 'evergreen', palette: 'slate', layout: 'hero-left', decoration: 'geometric', badge: '🕐 24/7 Access', headline: 'Access Your\nUnit Anytime.\nDay or Night.', subheadline: 'Drive-up units. Wide aisles.\nNo appointment needed.', ctaText: 'Find Your Unit →' },
  // ── SPECIALTY ──
  { id: 'rv-boat', name: 'RV & Boat Storage', category: 'specialty', palette: 'forest', layout: 'hero-center', decoration: 'lines', badge: '🚢 Vehicle Storage', headline: 'RV & Boat\nStorage\nMade Easy', subheadline: 'Covered & uncovered options.\nEasy pull-through access.', ctaText: 'See Vehicle Rates →' },
  { id: 'business-storage', name: 'Business Storage', category: 'specialty', palette: 'slate', layout: 'split-diagonal', decoration: 'dots', badge: '🏢 Business Solutions', headline: 'Storage\nFor Your\nBusiness', subheadline: 'Inventory, documents, equipment.\nDelivery acceptance available.', ctaText: 'Get a Business Quote →' },
  { id: 'photo-template', name: 'Facility Photo Ad', category: 'evergreen', palette: 'brand', layout: 'photo-overlay', decoration: 'none', badge: '📸 Your Facility', headline: 'Self Storage\nDone Right.', subheadline: 'Upload your facility photo to create\na stunning branded ad.', ctaText: 'Reserve Online →' },
  // ── NEW TEMPLATES ──
  { id: 'downsizing', name: 'Downsizing', category: 'seasonal', palette: 'warmearth', layout: 'hero-left', decoration: 'radial', badge: '🏡 Downsizing?', headline: 'Keep What\nYou Love.\nStore the\nRest.', subheadline: 'Transitioning to a smaller home?\nSecure, affordable storage nearby.', ctaText: 'Find Your Unit →' },
  { id: 'senior-discount', name: 'Senior Discount', category: 'promo', palette: 'clean', layout: 'hero-center', decoration: 'circles', badge: '💛 Senior Savings', headline: '10% Off\nFor Seniors', subheadline: 'We appreciate our community elders.\nExclusive discount for 55+.', ctaText: 'Get Senior Rate →' },
  { id: 'contractor-special', name: 'Contractor Storage', category: 'specialty', palette: 'charcoal', layout: 'bold-stack', decoration: 'geometric', badge: '🔧 Contractor Solutions', headline: 'Job Site\nStorage.', subheadline: 'Tools, materials, equipment.\n24/7 access. Month-to-month.', ctaText: 'Get a Quote →' },
  { id: 'wine-storage', name: 'Wine Storage', category: 'specialty', palette: 'royal', layout: 'hero-center', decoration: 'radial', badge: '🍷 Wine Storage', headline: 'Protect\nYour\nCollection.', subheadline: 'Climate-controlled wine storage.\nPrecise temperature and humidity control.', ctaText: 'See Wine Units →' },
  { id: 'price-lock', name: 'Price Lock Guarantee', category: 'promo', palette: 'brand', layout: 'hero-right', decoration: 'dots', badge: '🔐 Price Lock', headline: 'Your Rate.\nGuaranteed.\n12 Months.', subheadline: 'Lock in today\'s rate with our\nprice protection guarantee.', ctaText: 'Lock My Rate →' },
  { id: 'weekend-special', name: 'Weekend Flash Sale', category: 'urgency', palette: 'charcoal', layout: 'bold-stack', decoration: 'none', badge: '⚡ This Weekend Only', headline: 'Flash Sale.\n48 Hours\nOnly.', subheadline: 'Move in this weekend and save big.\nOffer expires Sunday at midnight.', ctaText: 'Shop the Sale →' },
  { id: 'family-storage', name: 'Family Storage', category: 'evergreen', palette: 'warmearth', layout: 'hero-left', decoration: 'circles', badge: '👨‍👩‍👧‍👦 Family-Friendly', headline: 'More Space\nFor Your\nFamily.', subheadline: 'Growing family? Store seasonal items,\nsports gear, and memories safely.', ctaText: 'See Family Units →' },
  { id: 'testimonial', name: 'Customer Testimonial', category: 'evergreen', palette: 'clean', layout: 'hero-center', decoration: 'none', badge: '⭐⭐⭐⭐⭐ 5-Star Review', headline: '"Best Storage\nFacility\nIn Town."', subheadline: 'Join hundreds of happy tenants.\nSee why we\'re rated #1 locally.', ctaText: 'Read Reviews →' },
]

/**
 * Render a template to a canvas context.
 *
 * Extended overrides:
 * - headlineFontSize: multiplier (0.5–2.0, default 1.0)
 * - subFontSize: multiplier (0.5–2.0)
 * - uppercase: boolean — render headline in uppercase
 * - textShadow: boolean — add text drop shadow
 * - customAccent: hex color string to override palette accent
 * - overlayOpacity: 0–1 for photo overlay darkness
 * - imgBrightness: 0–2 for photo brightness
 * - letterSpacing: pixels to add between letters
 * - ctaStyle: 'filled' | 'outline' | 'pill'
 */
export function renderTemplate(ctx, template, overrides = {}, format = 'feed', uploadedImage = null) {
  const { width, height } = AD_FORMATS[format]
  const basePalette = PALETTES[overrides.palette || template.palette]
  // Allow custom accent color override
  const palette = overrides.customAccent
    ? { ...basePalette, accent: overrides.customAccent, cta: overrides.customAccent }
    : basePalette
  const layoutKey = overrides.layout || template.layout
  const layout = LAYOUTS[layoutKey]
  const decoration = overrides.decoration || template.decoration

  let badge = overrides.badge ?? template.badge
  let headline = overrides.headline ?? template.headline
  let subheadline = overrides.subheadline ?? template.subheadline
  const ctaText = overrides.ctaText ?? template.ctaText
  const facilityName = overrides.facilityName || ''
  const facilityLocation = overrides.facilityLocation || ''

  // Advanced overrides with defaults
  const headlineFontMul = overrides.headlineFontSize ?? 1.0
  const subFontMul = overrides.subFontSize ?? 1.0
  const uppercase = overrides.uppercase ?? false
  const textShadow = overrides.textShadow ?? false
  const overlayOpacity = overrides.overlayOpacity ?? 0.6
  const imgBrightness = overrides.imgBrightness ?? 1.0
  const letterSpacing = overrides.letterSpacing ?? 0
  const ctaStyle = overrides.ctaStyle ?? 'filled'

  if (uppercase) headline = headline.toUpperCase()

  const scale = width / 1080
  const aspectRatio = width / height
  const isLandscape = aspectRatio > 1.2
  const vCompress = isLandscape ? 0.85 : 1

  // ── Background ──
  if (layout.photoOverlay && uploadedImage) {
    const imgRatio = uploadedImage.width / uploadedImage.height
    const canvasRatio = width / height
    let sx = 0, sy = 0, sw = uploadedImage.width, sh = uploadedImage.height
    if (imgRatio > canvasRatio) {
      sw = uploadedImage.height * canvasRatio
      sx = (uploadedImage.width - sw) / 2
    } else {
      sh = uploadedImage.width / canvasRatio
      sy = (uploadedImage.height - sh) / 2
    }
    // Apply brightness via filter
    ctx.save()
    ctx.filter = `brightness(${imgBrightness})`
    ctx.drawImage(uploadedImage, sx, sy, sw, sh, 0, 0, width, height)
    ctx.restore()
    // Dark gradient overlay with controllable opacity
    const overlay = ctx.createLinearGradient(0, 0, 0, height)
    overlay.addColorStop(0, `rgba(0,0,0,${overlayOpacity * 0.5})`)
    overlay.addColorStop(0.5, `rgba(0,0,0,${overlayOpacity * 0.7})`)
    overlay.addColorStop(1, `rgba(0,0,0,${overlayOpacity})`)
    ctx.fillStyle = overlay
    ctx.fillRect(0, 0, width, height)
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height)
    grad.addColorStop(0, palette.bg[0])
    grad.addColorStop(1, palette.bg[1])
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)
  }

  // ── Decorations ──
  renderDecoration(ctx, decoration, palette, width, height)

  // ── Diagonal accent ──
  if (layout.diagonal) {
    ctx.save()
    ctx.globalAlpha = 0.08
    ctx.fillStyle = palette.accent
    ctx.beginPath()
    ctx.moveTo(0, height * 0.6)
    ctx.lineTo(width, height * 0.3)
    ctx.lineTo(width, height * 0.45)
    ctx.lineTo(0, height * 0.75)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // ── Accent bar ──
  if (layout.accentBar) {
    ctx.fillStyle = palette.accent
    ctx.fillRect(
      layout.accentBar.x * width,
      layout.accentBar.yStart * height,
      layout.accentBar.width * scale,
      (layout.accentBar.yEnd - layout.accentBar.yStart) * height
    )
  }

  // Text shadow helper
  function applyShadow() {
    if (textShadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 12 * scale
      ctx.shadowOffsetX = 2 * scale
      ctx.shadowOffsetY = 2 * scale
    }
  }
  function clearShadow() {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  // ── Badge ──
  if (badge) {
    const bx = layout.badge.x * width
    const by = layout.badge.y * height
    const fontSize = Math.round(22 * scale)
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`
    ctx.textAlign = layout.badge.align
    const metrics = ctx.measureText(badge)
    const padX = 20 * scale
    const padY = 10 * scale
    const bw = metrics.width + padX * 2
    const bh = fontSize + padY * 2
    const bLeft = layout.badge.align === 'center' ? bx - bw / 2
      : layout.badge.align === 'right' ? bx - bw : bx
    ctx.fillStyle = palette.accent + '30'
    roundRect(ctx, bLeft, by - bh / 2, bw, bh, 25 * scale)
    ctx.fill()
    ctx.strokeStyle = palette.accent + '50'
    ctx.lineWidth = 1.5 * scale
    roundRect(ctx, bLeft, by - bh / 2, bw, bh, 25 * scale)
    ctx.stroke()
    ctx.fillStyle = palette.accent
    ctx.fillText(badge, bx, by + fontSize * 0.35)
  }

  // ── Headline ──
  if (headline) {
    const hx = layout.headline.x * width
    const hy = layout.headline.y * height
    const baseFontSize = Math.round(72 * scale * (layout.headline.fontSize || 1) * vCompress * headlineFontMul)
    const maxW = (layout.headline.maxWidth || 0.8) * width

    applyShadow()
    ctx.textAlign = layout.headline.align
    ctx.fillStyle = palette.text
    if (letterSpacing > 0) ctx.letterSpacing = `${letterSpacing}px`

    const lines = headline.split('\n')
    const lineHeight = baseFontSize * 1.15
    const totalH = lines.length * lineHeight
    const startY = hy - totalH / 2 + lineHeight

    lines.forEach((line, i) => {
      let fs = baseFontSize
      ctx.font = `800 ${fs}px Inter, system-ui, sans-serif`
      while (ctx.measureText(line).width > maxW && fs > 20) {
        fs -= 2
        ctx.font = `800 ${fs}px Inter, system-ui, sans-serif`
      }
      ctx.fillText(line, hx, startY + i * lineHeight)
    })
    clearShadow()
    if (letterSpacing > 0) ctx.letterSpacing = '0px'
  }

  // ── Subheadline ──
  if (subheadline) {
    const sx2 = layout.subheadline.x * width
    const subY = isLandscape ? Math.min(layout.subheadline.y + 0.05, 0.72) : layout.subheadline.y
    const sy2 = subY * height
    const fontSize = Math.round(26 * scale * subFontMul)
    const maxW = (layout.subheadline.maxWidth || 0.7) * width

    applyShadow()
    ctx.font = `400 ${fontSize}px Inter, system-ui, sans-serif`
    ctx.textAlign = layout.subheadline.align
    ctx.fillStyle = palette.subtext

    const lines = subheadline.split('\n')
    const lineHeight = fontSize * 1.5
    const totalH = lines.length * lineHeight
    const startY = sy2 - totalH / 2 + fontSize

    lines.forEach((line, i) => {
      ctx.fillText(line, sx2, startY + i * lineHeight, maxW)
    })
    clearShadow()
  }

  // ── CTA Button ──
  if (ctaText) {
    const cx = layout.cta.x * width
    const cy = layout.cta.y * height
    const fontSize = Math.round(28 * scale)
    ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`
    const metrics = ctx.measureText(ctaText)
    const padX = 40 * scale
    const padY = 18 * scale
    const bw = metrics.width + padX * 2
    const bh = fontSize + padY * 2
    const bLeft = layout.cta.align === 'center' ? cx - bw / 2
      : layout.cta.align === 'right' ? cx - bw : cx
    const radius = ctaStyle === 'pill' ? bh / 2 : 14 * scale

    if (ctaStyle === 'outline') {
      ctx.strokeStyle = palette.cta
      ctx.lineWidth = 3 * scale
      roundRect(ctx, bLeft, cy - bh / 2, bw, bh, radius)
      ctx.stroke()
      ctx.fillStyle = palette.cta
    } else {
      ctx.fillStyle = palette.cta
      roundRect(ctx, bLeft, cy - bh / 2, bw, bh, radius)
      ctx.fill()
      ctx.fillStyle = palette.ctaText
    }
    ctx.textAlign = layout.cta.align
    ctx.fillText(ctaText, cx, cy + fontSize * 0.35)
  }

  // ── Facility name & location ──
  const lx = layout.logo.x * width
  const ly = layout.logo.y * height
  if (facilityName || facilityLocation) {
    const fontSize = Math.round(18 * scale)
    ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`
    ctx.textAlign = layout.logo.align
    ctx.fillStyle = palette.subtext + 'aa'
    const displayText = [facilityName, facilityLocation].filter(Boolean).join(' · ')
    ctx.fillText(displayText, lx, ly)
  }

  // ── Safe zone guides ──
  if (overrides._showSafeZone) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255,0,0,0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([8, 4])
    const margin = 0.14
    ctx.strokeRect(width * margin, height * margin, width * (1 - margin * 2), height * (1 - margin * 2))
    ctx.restore()
  }

  // ── Grid overlay ──
  if (overrides._showGrid) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(width * (i / 3), 0)
      ctx.lineTo(width * (i / 3), height)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, height * (i / 3))
      ctx.lineTo(width, height * (i / 3))
      ctx.stroke()
    }
    ctx.restore()
  }
}

// ── Decoration renderer ──
function renderDecoration(ctx, type, palette, width, height) {
  ctx.save()
  ctx.globalAlpha = 0.06
  switch (type) {
    case 'dots': {
      ctx.fillStyle = palette.accent
      const spacing = width / 12
      for (let x = spacing; x < width; x += spacing)
        for (let y = spacing; y < height; y += spacing) {
          ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
        }
      break
    }
    case 'circles': {
      ctx.strokeStyle = palette.accent; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(width * 0.85, height * 0.12, width * 0.15, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.arc(width * 0.15, height * 0.88, width * 0.2, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha = 0.03; ctx.fillStyle = palette.accent
      ctx.beginPath(); ctx.arc(width * 0.7, height * 0.7, width * 0.25, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'lines': {
      ctx.strokeStyle = palette.accent; ctx.lineWidth = 1
      for (let i = 0; i < 8; i++) {
        const y = height * (0.1 + i * 0.1)
        ctx.beginPath(); ctx.moveTo(width * 0.7, y); ctx.lineTo(width * 0.95, y); ctx.stroke()
      }
      break
    }
    case 'geometric': {
      ctx.strokeStyle = palette.accent; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(width * 0.75, height * 0.05); ctx.lineTo(width * 0.95, height * 0.05); ctx.lineTo(width * 0.95, height * 0.2); ctx.closePath(); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(width * 0.1, height * 0.85); ctx.lineTo(width * 0.18, height * 0.78); ctx.lineTo(width * 0.26, height * 0.85); ctx.lineTo(width * 0.18, height * 0.92); ctx.closePath(); ctx.stroke()
      break
    }
    case 'radial': {
      const grad = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.4, width * 0.6)
      grad.addColorStop(0, palette.accent)
      grad.addColorStop(1, 'transparent')
      ctx.globalAlpha = 0.08
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
      break
    }
  }
  ctx.restore()
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/**
 * Generate A/B variations of a template with different palettes and copy.
 * Returns 3 variation override objects.
 */
export function generateVariations(template) {
  const paletteKeys = Object.keys(PALETTES).filter(k => k !== template.palette)
  const suggestions = COPY_SUGGESTIONS[template.category] || COPY_SUGGESTIONS.evergreen
  const shuffled = arr => [...arr].sort(() => Math.random() - 0.5)
  const pick = arr => arr[Math.floor(Math.random() * arr.length)]

  const altPalettes = shuffled(paletteKeys).slice(0, 3)
  const altHeadlines = shuffled(suggestions.headlines).slice(0, 3)

  return [
    { palette: altPalettes[0], headline: altHeadlines[0] },
    { palette: altPalettes[1], headline: altHeadlines[1], ctaText: pick(suggestions.ctas) },
    { palette: altPalettes[2], headline: altHeadlines[2], badge: pick(suggestions.badges) },
  ]
}

// ── Ad Copy Presets (text that goes OUTSIDE the creative, in the ad itself) ──
export const AD_COPY_PRESETS = {
  seasonal: {
    primaryText: [
      "Spring cleaning? We've got the space you need. 🌿 Flexible month-to-month leases, no hidden fees, and units starting at just $1 for the first month.",
      "Moving this summer? Don't stress about storage. Climate-controlled units available now with easy drive-up access.",
      "Make room for what matters this holiday season. Secure, affordable storage with 24/7 access.",
    ],
    headlines: [
      "Storage Units Available Now",
      "First Month Starting at $1",
      "Flexible Month-to-Month Storage",
      "Climate-Controlled Units Available",
    ],
    descriptions: [
      "Reserve online in 2 minutes. No long-term commitment required.",
      "Clean, secure, and affordable. See unit sizes and pricing.",
      "24/7 access. Individual door alarms. Drive-up units available.",
    ],
  },
  promo: {
    primaryText: [
      "🔥 For a limited time, get your first month FREE when you move in. No hidden fees, no long-term contracts. Reserve your unit online in under 2 minutes.",
      "Why pay full price? New tenants get 50% off their first month. Premium storage at half the cost. Don't miss this deal.",
      "Know someone who needs storage? Refer a friend and you BOTH get a month free. It's a win-win. 🤝",
    ],
    headlines: [
      "First Month FREE — Move In Today",
      "50% Off Your First Month",
      "Refer a Friend, Both Save",
      "Military Discount Available",
    ],
    descriptions: [
      "Limited time offer. Reserve online now.",
      "No contracts. No hidden fees. Cancel anytime.",
      "Active duty & veterans welcome. Thank you for your service.",
    ],
  },
  urgency: {
    primaryText: [
      "⚠️ Our facility is almost full. Only a handful of units remain at this location. Once they're gone, they're gone. Reserve yours now before it's too late.",
      "Heads up — our current rates won't last. Prices increase next month. Lock in today's rate and save.",
      "🎉 Our brand new facility is NOW OPEN! Be one of our first tenants and get exclusive founding member pricing.",
    ],
    headlines: [
      "Only a Few Units Left",
      "Prices Increase Next Month",
      "Now Open — Grand Opening Rates",
      "Don't Wait — Reserve Today",
    ],
    descriptions: [
      "Reserve online in 2 minutes before units sell out.",
      "Lock in today's rate. Limited availability.",
      "Grand opening specials won't last. Act now.",
    ],
  },
  evergreen: {
    primaryText: [
      "Looking for clean, secure, affordable storage? We offer 24/7 access, individual door alarms, and climate-controlled units to keep your belongings safe.",
      "Self storage done right. 🔒 Gated access, HD surveillance, and drive-up convenience. See why our tenants stay an average of 14 months.",
      "Need extra space? Our facility features wide aisles, well-lit hallways, and friendly staff. Month-to-month flexibility with no long-term commitment.",
    ],
    headlines: [
      "Clean, Secure Storage Near You",
      "24/7 Access — Drive-Up Units",
      "Climate-Controlled Units Available",
      "Month-to-Month — No Contracts",
    ],
    descriptions: [
      "See unit sizes, pricing, and availability online.",
      "Gated access. HD surveillance. Individual door alarms.",
      "Reserve online or call for a free quote today.",
    ],
  },
  specialty: {
    primaryText: [
      "Need a safe place for your RV or boat this season? We offer covered and uncovered parking with easy pull-through access. Affordable monthly rates.",
      "Business storage solutions: inventory, documents, equipment. We accept deliveries on your behalf and offer 24/7 access for your team.",
      "Specialty storage for items that need extra care. Climate-controlled, secure, and conveniently located.",
    ],
    headlines: [
      "RV & Boat Storage Available",
      "Business Storage Solutions",
      "Specialty Storage Units",
      "Vehicle Storage — Easy Access",
    ],
    descriptions: [
      "Covered & uncovered options. Easy pull-through access.",
      "Inventory, documents, equipment. Delivery acceptance.",
      "Purpose-built for special items. Call for a quote.",
    ],
  },
}

// ── Brand Kit persistence ──
const BRAND_KIT_STORAGE_KEY = 'stowstack_studio_brand_kits'
const FAVORITES_STORAGE_KEY = 'stowstack_studio_favorites'
const RECENT_STORAGE_KEY = 'stowstack_studio_recent'

export function loadBrandKits() {
  try {
    return JSON.parse(localStorage.getItem(BRAND_KIT_STORAGE_KEY) || '[]')
  } catch { return [] }
}

export function saveBrandKit(kit) {
  const kits = loadBrandKits()
  const existing = kits.findIndex(k => k.id === kit.id)
  if (existing >= 0) kits[existing] = kit
  else kits.push({ ...kit, id: Date.now().toString(36) })
  localStorage.setItem(BRAND_KIT_STORAGE_KEY, JSON.stringify(kits))
  return kits
}

export function deleteBrandKit(id) {
  const kits = loadBrandKits().filter(k => k.id !== id)
  localStorage.setItem(BRAND_KIT_STORAGE_KEY, JSON.stringify(kits))
  return kits
}

export function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]')
  } catch { return [] }
}

export function toggleFavorite(templateId) {
  const favs = loadFavorites()
  const idx = favs.indexOf(templateId)
  if (idx >= 0) favs.splice(idx, 1)
  else favs.push(templateId)
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favs))
  return favs
}

export function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]')
  } catch { return [] }
}

export function addRecent(templateId) {
  let recent = loadRecent().filter(id => id !== templateId)
  recent.unshift(templateId)
  if (recent.length > 8) recent = recent.slice(0, 8)
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent))
  return recent
}

// ── Color Harmony Suggestions ──
// Given a hex color, generate complementary, analogous, and triadic suggestions
function hexToHSL(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function generateColorHarmony(hex) {
  try {
    const [h, s, l] = hexToHSL(hex)
    return {
      complementary: hslToHex(h + 180, s, l),
      analogous: [hslToHex(h + 30, s, l), hslToHex(h - 30, s, l)],
      triadic: [hslToHex(h + 120, s, l), hslToHex(h + 240, s, l)],
      splitComplementary: [hslToHex(h + 150, s, l), hslToHex(h + 210, s, l)],
      lighter: hslToHex(h, s, Math.min(90, l + 20)),
      darker: hslToHex(h, s, Math.max(10, l - 20)),
    }
  } catch { return null }
}
