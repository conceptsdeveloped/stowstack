import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConsentBanner from './ConsentBanner'
import { getConsentStatus } from '../utils/consent'

describe('ConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders when consent is pending', () => {
    render(<ConsentBanner />)
    expect(screen.getByRole('dialog', { name: /cookie consent/i })).toBeInTheDocument()
  })

  it('does not render when consent is already granted', () => {
    localStorage.setItem('stowstack_tracking_consent', 'granted')
    localStorage.setItem('stowstack_tracking_consent_at', String(Date.now()))
    render(<ConsentBanner />)
    expect(screen.queryByRole('dialog', { name: /cookie consent/i })).not.toBeInTheDocument()
  })

  it('hides banner and sets granted on Accept click', async () => {
    const user = userEvent.setup()
    render(<ConsentBanner />)

    await user.click(screen.getByRole('button', { name: /accept/i }))

    expect(screen.queryByRole('dialog', { name: /cookie consent/i })).not.toBeInTheDocument()
    expect(getConsentStatus()).toBe('granted')
  })

  it('hides banner and sets denied on Decline click', async () => {
    const user = userEvent.setup()
    render(<ConsentBanner />)

    await user.click(screen.getByRole('button', { name: /decline/i }))

    expect(screen.queryByRole('dialog', { name: /cookie consent/i })).not.toBeInTheDocument()
    expect(getConsentStatus()).toBe('denied')
  })
})
