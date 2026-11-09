import os from 'node:os';
import { db, monitoringJobs, monitoringChecks, websites, } from '@tracksentinel/db';
import { eq, and, lte } from 'drizzle-orm';
import { executePixelCheck } from './monitor';
import { processIncidentsAndAlerts } from './incidents';
const WORKER_ID = `worker-${os.hostname()}-${process.pid}`;
/**
 * Polls and claims a single due monitoring job using atomic locking.
 */
export async function claimNextJob() {
    const now = new Date();
    // Find due jobs
    const dueJobs = await db
        .select({
        job: monitoringJobs,
        website: websites,
    })
        .from(monitoringJobs)
        .innerJoin(websites, eq(websites.id, monitoringJobs.websiteId))
        .where(and(eq(monitoringJobs.status, 'pending'), lte(monitoringJobs.scheduledAt, now), eq(websites.isActive, true)))
        .limit(1);
    if (dueJobs.length === 0) {
        return null;
    }
    const { job, website } = dueJobs[0];
    // Atomic lock attempt
    const updated = await db
        .update(monitoringJobs)
        .set({
        status: 'running',
        lockedAt: now,
        lockedBy: WORKER_ID,
    })
        .where(and(eq(monitoringJobs.id, job.id), eq(monitoringJobs.status, 'pending')))
        .returning();
    if (updated.length === 0) {
        // Another worker claimed it
        return null;
    }
    return { job: updated[0], website };
}
/**
 * Runs a single monitoring job from start to finish.
 */
export async function processJob(job, website) {
    const startedAt = new Date();
    try {
        // 1. Run Playwright inspection
        const checkResult = await executePixelCheck({
            id: website.id,
            url: website.url,
            pixelId: website.pixelId,
            expectedEvents: website.expectedEvents,
        });
        const completedAt = new Date();
        // 2. Persist monitoring check result
        await db.insert(monitoringChecks).values({
            websiteId: website.id,
            status: checkResult.status,
            startedAt,
            completedAt,
            pixelDetected: checkResult.pixelDetected,
            pixelIdMatched: checkResult.pixelIdMatched,
            eventsObserved: checkResult.eventsObserved,
            networkRequestsObserved: checkResult.networkRequestsObserved,
            duplicateEventsSuspected: checkResult.duplicateEventsSuspected,
            errorMessage: checkResult.errorMessage ?? null,
        });
        // 3. Process incidents and notifications
        await processIncidentsAndAlerts(website, checkResult);
        // 4. Mark job completed
        await db
            .update(monitoringJobs)
            .set({
            status: 'completed',
            completedAt,
        })
            .where(eq(monitoringJobs.id, job.id));
        // 5. Schedule next check based on checkIntervalMinutes
        const nextSchedule = new Date(Date.now() + (website.checkIntervalMinutes || 60) * 60 * 1000);
        await db.insert(monitoringJobs).values({
            websiteId: website.id,
            scheduledAt: nextSchedule,
            status: 'pending',
        });
    }
    catch (err) {
        console.error(`[scheduler] Job ${job.id} failed with error:`, err);
        await db
            .update(monitoringJobs)
            .set({
            status: 'failed',
            completedAt: new Date(),
        })
            .where(eq(monitoringJobs.id, job.id));
    }
}
/**
 * Ensures all active websites have at least one scheduled job pending.
 */
export async function scheduleMissingWebsiteChecks() {
    const activeWebsites = await db.select().from(websites).where(eq(websites.isActive, true));
    for (const site of activeWebsites) {
        const existing = await db
            .select({ id: monitoringJobs.id })
            .from(monitoringJobs)
            .where(and(eq(monitoringJobs.websiteId, site.id), eq(monitoringJobs.status, 'pending')))
            .limit(1);
        if (existing.length === 0) {
            await db.insert(monitoringJobs).values({
                websiteId: site.id,
                scheduledAt: new Date(),
                status: 'pending',
            });
        }
    }
}
//# sourceMappingURL=scheduler.js.map