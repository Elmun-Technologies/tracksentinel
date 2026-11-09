import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'
import { workspaces } from './workspaces'

export const META_PIXEL_EVENTS = [
  'PageView',
  'ViewContent',
  'Lead',
  'CompleteRegistration',
  'AddToCart',
  'InitiateCheckout',
  'Purchase',
  'Contact',
  'Search',
] as const

export type MetaPixelEvent = typeof META_PIXEL_EVENTS[number]

export const websites = pgTable('websites', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  pixelId: text('pixel_id').notNull(),
  expectedEvents: text('expected_events').array().notNull().default(['PageView']),
  checkIntervalMinutes: integer('check_interval_minutes').notNull().default(60),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Website = typeof websites.$inferSelect
export type NewWebsite = typeof websites.$inferInsert
