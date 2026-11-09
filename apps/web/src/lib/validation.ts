import { z } from 'zod'
import { META_PIXEL_EVENTS } from '@tracksentinel/db/schema'

export const websiteCreateSchema = z.object({
  name: z.string().trim().min(1, 'Website name is required').max(200),
  url: z
    .string()
    .trim()
    .url('Must be a valid URL')
    .refine((val) => val.startsWith('http://') || val.startsWith('https://'), {
      message: 'URL must begin with http:// or https://',
    })
    .refine((val) => {
      try {
        const parsed = new URL(val)
        const host = parsed.hostname.toLowerCase()
        if (
          host === 'localhost' ||
          host.endsWith('.localhost') ||
          host === '127.0.0.1' ||
          host === '0.0.0.0' ||
          host.startsWith('192.168.') ||
          host.startsWith('10.') ||
          host === '169.254.169.254'
        ) {
          return false
        }
        return true
      } catch {
        return false
      }
    }, 'Internal or localhost URLs are not permitted for security reasons.'),
  pixelId: z
    .string()
    .trim()
    .regex(/^\d{10,20}$/, 'Meta Pixel ID must contain only numbers (10 to 20 digits)'),
  expectedEvents: z
    .array(z.enum(META_PIXEL_EVENTS))
    .min(1, 'Select at least one expected event'),
  checkIntervalMinutes: z
    .number()
    .int()
    .min(15, 'Interval must be at least 15 minutes')
    .max(1440, 'Interval cannot exceed 24 hours')
    .default(60),
})

export const websiteUpdateSchema = websiteCreateSchema.partial()
