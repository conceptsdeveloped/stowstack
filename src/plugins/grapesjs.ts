/**
 * GrapesJS — Open source drag-and-drop page builder
 * Fully free (MIT license), no hosted tier needed
 * https://grapesjs.com
 *
 * This module provides helpers for embedding GrapesJS as a landing page editor
 * in the ClientPortal or AdminDashboard. The actual editor is loaded lazily
 * to avoid bloating the main bundle.
 */

export interface PageBuilderConfig {
  container: string | HTMLElement
  initialHtml?: string
  initialCss?: string
  height?: string
  storageType?: 'local' | 'remote'
  onSave?: (html: string, css: string) => void
}

/**
 * Lazily load and initialize the GrapesJS editor.
 * Returns a cleanup function to destroy the editor.
 *
 * Requires: npm install grapesjs grapesjs-preset-webpage
 * (only install when you want to enable the page builder)
 */
export async function initPageBuilder(config: PageBuilderConfig) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadModule = (name: string): Promise<any> => import(/* @vite-ignore */ name)
  const [{ default: grapesjs }, { default: grapesjsPresetWebpage }] = await Promise.all([
    loadModule('grapesjs'),
    loadModule('grapesjs-preset-webpage'),
  ])

  // Also load GrapesJS CSS
  if (!document.getElementById('grapesjs-css')) {
    const link = document.createElement('link')
    link.id = 'grapesjs-css'
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/grapesjs/dist/css/grapes.min.css'
    document.head.appendChild(link)
  }

  const editor = grapesjs.init({
    container: config.container,
    height: config.height || '600px',
    fromElement: false,
    storageManager: config.storageType === 'remote' ? false : {
      type: 'local',
      autosave: true,
      autoload: true,
      stepsBeforeSave: 1,
    },
    plugins: [grapesjsPresetWebpage],
    pluginsOpts: {
      [grapesjsPresetWebpage as unknown as string]: {},
    },
    canvas: {
      styles: [
        'https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css',
      ],
    },
  })

  // Load initial content
  if (config.initialHtml) {
    editor.setComponents(config.initialHtml)
  }
  if (config.initialCss) {
    editor.setStyle(config.initialCss)
  }

  // Add custom StowStack blocks
  addStowStackBlocks(editor)

  // Wire up save callback
  if (config.onSave) {
    editor.on('storage:store', () => {
      const html = editor.getHtml()
      const css = editor.getCss()
      config.onSave!(html, css || '')
    })
  }

  return {
    editor,
    getHtml: () => editor.getHtml(),
    getCss: () => editor.getCss() || '',
    destroy: () => editor.destroy(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addStowStackBlocks(editor: any) {
  const bm = editor.BlockManager

  bm.add('stow-hero', {
    label: 'Hero Section',
    category: 'StowStack',
    content: `
      <section style="padding: 80px 20px; text-align: center; background: linear-gradient(135deg, #16a34a 0%, #065f46 100%); color: white;">
        <h1 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 16px;">Your Facility Name</h1>
        <p style="font-size: 1.25rem; opacity: 0.9; margin-bottom: 32px;">Secure, affordable storage units near you</p>
        <a href="#reserve" style="background: white; color: #16a34a; padding: 14px 32px; border-radius: 8px; font-weight: 600; text-decoration: none;">Reserve Your Unit</a>
      </section>
    `,
  })

  bm.add('stow-units', {
    label: 'Unit Pricing Grid',
    category: 'StowStack',
    content: `
      <section style="padding: 60px 20px; max-width: 1000px; margin: 0 auto;">
        <h2 style="font-size: 2rem; font-weight: bold; text-align: center; margin-bottom: 40px;">Available Units</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
          <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center;">
            <h3 style="font-size: 1.25rem; font-weight: 600;">5×5</h3>
            <p style="color: #64748b;">Closet-sized</p>
            <p style="font-size: 1.5rem; font-weight: bold; color: #16a34a;">$49/mo</p>
          </div>
          <div style="border: 2px solid #16a34a; border-radius: 12px; padding: 24px; text-align: center;">
            <h3 style="font-size: 1.25rem; font-weight: 600;">10×10</h3>
            <p style="color: #64748b;">Small bedroom</p>
            <p style="font-size: 1.5rem; font-weight: bold; color: #16a34a;">$99/mo</p>
          </div>
          <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center;">
            <h3 style="font-size: 1.25rem; font-weight: 600;">10×20</h3>
            <p style="color: #64748b;">1-car garage</p>
            <p style="font-size: 1.5rem; font-weight: bold; color: #16a34a;">$159/mo</p>
          </div>
        </div>
      </section>
    `,
  })

  bm.add('stow-cta', {
    label: 'CTA Section',
    category: 'StowStack',
    content: `
      <section style="padding: 60px 20px; text-align: center; background: #f8fafc;">
        <h2 style="font-size: 2rem; font-weight: bold; margin-bottom: 16px;">Ready to Reserve?</h2>
        <p style="color: #64748b; margin-bottom: 24px;">Lock in your rate today — no credit card required</p>
        <a href="#reserve" style="background: #16a34a; color: white; padding: 14px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-block;">Reserve Now</a>
      </section>
    `,
  })

  bm.add('stow-trust', {
    label: 'Trust Bar',
    category: 'StowStack',
    content: `
      <div style="background: #f0fdf4; padding: 16px 20px; display: flex; justify-content: center; gap: 32px; flex-wrap: wrap;">
        <span style="font-weight: 500; color: #16a34a;">⭐ 4.9 Rating</span>
        <span style="font-weight: 500; color: #16a34a;">🔒 24/7 Security</span>
        <span style="font-weight: 500; color: #16a34a;">🕐 Month-to-Month</span>
        <span style="font-weight: 500; color: #16a34a;">✅ Drive-Up Access</span>
      </div>
    `,
  })

  bm.add('stow-testimonials', {
    label: 'Testimonials',
    category: 'StowStack',
    content: `
      <section style="padding: 60px 20px; max-width: 800px; margin: 0 auto;">
        <h2 style="font-size: 2rem; font-weight: bold; text-align: center; margin-bottom: 40px;">What Renters Say</h2>
        <div style="display: grid; gap: 24px;">
          <blockquote style="border-left: 3px solid #16a34a; padding: 16px 24px; background: #f8fafc; border-radius: 0 8px 8px 0;">
            <p style="font-style: italic;">"Clean, secure, and the online reservation was super easy."</p>
            <cite style="color: #64748b; font-size: 0.875rem;">— Sarah M.</cite>
          </blockquote>
          <blockquote style="border-left: 3px solid #16a34a; padding: 16px 24px; background: #f8fafc; border-radius: 0 8px 8px 0;">
            <p style="font-style: italic;">"Best price in town and I was moved in within 24 hours."</p>
            <cite style="color: #64748b; font-size: 0.875rem;">— James R.</cite>
          </blockquote>
        </div>
      </section>
    `,
  })
}
