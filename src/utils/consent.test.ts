import { describe, it, expect, beforeEach } from 'vitest'
import {
  getConsentStatus,
  setConsent,
  hasTrackingConsent,
  revokeConsent,
} from './consent'

describe('consent utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getConsentStatus', () => {
    it('returns "pending" when no localStorage value exists', () => {
      expect(getConsentStatus()).toBe('pending')
    })

    it('returns "granted" after setConsent("granted")', () => {
      setConsent('granted')
      expect(getConsentStatus()).toBe('granted')
    })

    it('returns "denied" after setConsent("denied")', () => {
      setConsent('denied')
      expect(getConsentStatus()).toBe('denied')
    })
  })

  describe('hasTrackingConsent', () => {
    it('returns false when consent is pending', () => {
      expect(hasTrackingConsent()).toBe(false)
    })

    it('returns true only when consent is granted', () => {
      setConsent('granted')
      expect(hasTrackingConsent()).toBe(true)
    })

    it('returns false when consent is denied', () => {
      setConsent('denied')
      expect(hasTrackingConsent()).toBe(false)
    })
  })

  describe('revokeConsent', () => {
    it('sets consent status to denied', () => {
      setConsent('granted')
      expect(getConsentStatus()).toBe('granted')

      revokeConsent()
      expect(getConsentStatus()).toBe('denied')
    })
  })
})
