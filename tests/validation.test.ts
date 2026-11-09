import { describe, it, expect } from 'vitest'
import { websiteCreateSchema } from './apps/web/src/lib/validation'

describe('Website Input Validation Schema', () => {
  it('should accept valid website creation input', () => {
    const validData = {
      name: 'Client Store',
      url: 'https://store.acme.com/shop',
      pixelId: '123456789012345',
      expectedEvents: ['PageView', 'AddToCart', 'Purchase'],
      checkIntervalMinutes: 30,
    }

    const res = websiteCreateSchema.safeParse(validData)
    expect(res.success).toBe(true)
  })

  it('should reject invalid Pixel IDs', () => {
    // Contains letters
    const r1 = websiteCreateSchema.safeParse({
      name: 'Store',
      url: 'https://example.com',
      pixelId: '12345ABCDE',
      expectedEvents: ['PageView'],
    })
    expect(r1.success).toBe(false)

    // Too short (< 10 digits)
    const r2 = websiteCreateSchema.safeParse({
      name: 'Store',
      url: 'https://example.com',
      pixelId: '12345678',
      expectedEvents: ['PageView'],
    })
    expect(r2.success).toBe(false)

    // Too long (> 20 digits)
    const r3 = websiteCreateSchema.safeParse({
      name: 'Store',
      url: 'https://example.com',
      pixelId: '12345678901234567890123',
      expectedEvents: ['PageView'],
    })
    expect(r3.success).toBe(false)
  })

  it('should reject invalid or internal URLs', () => {
    const r1 = websiteCreateSchema.safeParse({
      name: 'Store',
      url: 'http://localhost:3000',
      pixelId: '123456789012345',
      expectedEvents: ['PageView'],
    })
    expect(r1.success).toBe(false)

    const r2 = websiteCreateSchema.safeParse({
      name: 'Store',
      url: 'not-a-valid-url',
      pixelId: '123456789012345',
      expectedEvents: ['PageView'],
    })
    expect(r2.success).toBe(false)
  })

  it('should require at least one expected event', () => {
    const res = websiteCreateSchema.safeParse({
      name: 'Store',
      url: 'https://example.com',
      pixelId: '123456789012345',
      expectedEvents: [],
    })
    expect(res.success).toBe(false)
  })

  it('should enforce check interval boundaries (15m to 1440m)', () => {
    // Below minimum (< 15)
    const r1 = websiteCreateSchema.safeParse({
      name: 'Store',
      url: 'https://example.com',
      pixelId: '123456789012345',
      expectedEvents: ['PageView'],
      checkIntervalMinutes: 5,
    })
    expect(r1.success).toBe(false)

    // Above maximum (> 1440)
    const r2 = websiteCreateSchema.safeParse({
      name: 'Store',
      url: 'https://example.com',
      pixelId: '123456789012345',
      expectedEvents: ['PageView'],
      checkIntervalMinutes: 2000,
    })
    expect(r2.success).toBe(false)
  })
})
