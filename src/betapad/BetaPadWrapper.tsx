import type { ReactNode } from 'react'
import { BetaPadProvider } from './BetaPadContext'
import BetaPadPanel from './BetaPadPanel'

/**
 * Combined wrapper for lazy loading — wraps children in BetaPadProvider
 * and renders the floating BetaPadPanel overlay.
 */
export default function BetaPadWrapper({ children }: { children: ReactNode }) {
  return (
    <BetaPadProvider>
      {children}
      <BetaPadPanel />
    </BetaPadProvider>
  )
}
