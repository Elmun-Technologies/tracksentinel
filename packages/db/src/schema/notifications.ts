import { pgTable, uuid, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core'
import { workspaces } from './workspaces'
import { incidents } from './monitoring'

export const notificationChannels = pgTable('notification_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['telegram', 'email'] }).notNull(),
  config: jsonb('config').notNull().default({}),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const alertDeliveries = pgTable('alert_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentId: uuid('incident_id').notNull().references(() => incidents.id, { onDelete: 'cascade' }),
  channelId: uuid('channel_id').notNull().references(() => notificationChannels.id, { onDelete: 'cascade' }),
  eventType: text('event_type', { enum: ['opened', 'resolved'] }).notNull(),
  status: text('status', { enum: ['pending', 'sent', 'failed'] }).notNull().default('pending'),
  attemptCount: integer('attempt_count').notNull().default(0),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const telegramLinkTokens = pgTable('telegram_link_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type NotificationChannel = typeof notificationChannels.$inferSelect
export type AlertDelivery = typeof alertDeliveries.$inferSelect
export type TelegramLinkToken = typeof telegramLinkTokens.$inferSelect
