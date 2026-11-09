import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'

function generateFingerprint(websiteId: string, issueType: string, eventName?: string): string {
  return crypto
    .createHash('sha256')
    .update(`${websiteId}:${issueType}:${eventName || ''}`)
    .digest('hex')
}

describe('Incident Management & Deduplication', () => {
  it('should generate identical fingerprints for matching issue attributes', () => {
    const siteId = 'site-123-uuid'
    const fp1 = generateFingerprint(siteId, 'pixel_missing')
    const fp2 = generateFingerprint(siteId, 'pixel_missing')

    expect(fp1).toBe(fp2)
    expect(fp1.length).toBe(64) // SHA-256 hex string
  })

  it('should generate distinct fingerprints for different issue types on the same site', () => {
    const siteId = 'site-123-uuid'
    const fpPixelMissing = generateFingerprint(siteId, 'pixel_missing')
    const fpPixelMismatch = generateFingerprint(siteId, 'pixel_id_mismatch')
    const fpEventMissing = generateFingerprint(siteId, 'event_missing', 'Purchase')

    expect(fpPixelMissing).not.toBe(fpPixelMismatch)
    expect(fpPixelMissing).not.toBe(fpEventMissing)
  })

  it('should generate distinct fingerprints for different events within same issue type', () => {
    const siteId = 'site-123-uuid'
    const fpAddToCart = generateFingerprint(siteId, 'event_missing', 'AddToCart')
    const fpPurchase = generateFingerprint(siteId, 'event_missing', 'Purchase')

    expect(fpAddToCart).not.toBe(fpPurchase)
  })

  it('should isolate fingerprints across different website IDs', () => {
    const fpSiteA = generateFingerprint('site-A', 'pixel_missing')
    const fpSiteB = generateFingerprint('site-B', 'pixel_missing')

    expect(fpSiteA).not.toBe(fpSiteB)
  })
})
