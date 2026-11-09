import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { websites } from './websites'

export const checkStatusEnum = pgEnum('check_status', [
  'pending',
  'running',
  'passed',
  'failed',
  'warning',
  'inconclusive',
])

export const incidentStatusEnum = pgEnum('incident_status', ['open', 'resolved'])

export const issueTypeEnum = pgEnum('issue_type', [
  'pixel_missing',
  'pixel_id_mismatch',
  'event_missing',
  'duplicate_event',
  'check_inconclusive',
  'site_unreachable',
])

export const monitoringChecks = pgTable('monitoring_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  status: checkStatusEnum('status').notNull().default('pending'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  pixelDetected: boolean('pixel_detected'),
  pixelIdMatched: boolean('pixel_id_matched'),
  eventsObserved: jsonb('events_observed').default([]),
  networkRequestsObserved: integer('network_requests_observed'),
  duplicateEventsSuspected: jsonb('duplicate_events_suspected').default([]),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const incidents = pgTable('incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  fingerprint: text('fingerprint').notNull().unique(),
  issueType: issueTypeEnum('issue_type').notNull(),
  eventName: text('event_name'),
  status: incidentStatusEnum('status').notNull().default('open'),
  firstDetectedAt: timestamp('first_detected_at', { withTimezone: true }).notNull().defaultNow(),
  lastDetectedAt: timestamp('last_detected_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
})

export const monitoringJobs = pgTable('monitoring_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lockedBy: text('locked_by'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed'] }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type MonitoringCheck = typeof monitoringChecks.$inferSelect
export type NewMonitoringCheck = typeof monitoringChecks.$inferInsert
export type Incident = typeof incidents.$inferSelect
export type MonitoringJob = typeof monitoringJobs.$inferSelect
