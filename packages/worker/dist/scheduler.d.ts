import { type Website, type MonitoringJob } from '@tracksentinel/db';
/**
 * Polls and claims a single due monitoring job using atomic locking.
 */
export declare function claimNextJob(): Promise<{
    job: MonitoringJob;
    website: Website;
} | null>;
/**
 * Runs a single monitoring job from start to finish.
 */
export declare function processJob(job: MonitoringJob, website: Website): Promise<void>;
/**
 * Ensures all active websites have at least one scheduled job pending.
 */
export declare function scheduleMissingWebsiteChecks(): Promise<void>;
//# sourceMappingURL=scheduler.d.ts.map