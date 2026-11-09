import crypto from 'node:crypto';
import { db, incidents, notificationChannels, alertDeliveries, } from '@tracksentinel/db';
import { eq, and } from 'drizzle-orm';
import { sendTelegramMessage, sendEmailNotification } from './notifications';
function generateFingerprint(websiteId, issueType, eventName) {
    return crypto
        .createHash('sha256')
        .update(`${websiteId}:${issueType}:${eventName || ''}`)
        .digest('hex');
}
export async function processIncidentsAndAlerts(website, checkResult) {
    const now = new Date();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const dashboardUrl = `${appUrl}/websites/${website.id}`;
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const resendApiKey = process.env.RESEND_API_KEY;
    // 1. If check passed -> resolve existing open incidents and send recovery alerts
    if (checkResult.status === 'passed') {
        const openIncidents = await db
            .select()
            .from(incidents)
            .where(and(eq(incidents.websiteId, website.id), eq(incidents.status, 'open')));
        if (openIncidents.length === 0)
            return;
        // Fetch verified notification channels for this workspace
        const channels = await db
            .select()
            .from(notificationChannels)
            .where(and(eq(notificationChannels.workspaceId, website.workspaceId), eq(notificationChannels.verified, true)));
        for (const incident of openIncidents) {
            // Mark incident resolved
            await db
                .update(incidents)
                .set({ status: 'resolved', resolvedAt: now })
                .where(eq(incidents.id, incident.id));
            // Send recovery alerts
            const alertMsg = {
                websiteName: website.name,
                websiteUrl: website.url,
                issueTitle: `Resolved: ${incident.issueType.replace('_', ' ')}`,
                detectedTime: now.toUTCString(),
                relevantEvent: incident.eventName ?? undefined,
                dashboardUrl,
                isRecovery: true,
            };
            for (const ch of channels) {
                let sent = false;
                let errorMsg;
                if (ch.type === 'telegram' && telegramBotToken) {
                    const cfg = ch.config;
                    if (cfg.chatId) {
                        const res = await sendTelegramMessage(telegramBotToken, cfg.chatId, alertMsg);
                        sent = res.success;
                        errorMsg = res.error;
                    }
                }
                else if (ch.type === 'email' && resendApiKey) {
                    const cfg = ch.config;
                    if (cfg.email) {
                        const res = await sendEmailNotification(resendApiKey, cfg.email, alertMsg);
                        sent = res.success;
                        errorMsg = res.error;
                    }
                }
                // Record delivery
                await db.insert(alertDeliveries).values({
                    incidentId: incident.id,
                    channelId: ch.id,
                    eventType: 'resolved',
                    status: sent ? 'sent' : 'failed',
                    attemptCount: 1,
                    sentAt: sent ? now : null,
                    errorMessage: errorMsg ?? null,
                });
            }
        }
        return;
    }
    // 2. If check is inconclusive due to site unreachable/timeout, handle as inconclusive incident
    // (Spec: timeout must not automatically be classified as pixel failure)
    let issueType = 'pixel_missing';
    let eventName;
    if (checkResult.status === 'inconclusive') {
        issueType = 'check_inconclusive';
    }
    else if (!checkResult.pixelDetected) {
        issueType = 'pixel_missing';
    }
    else if (!checkResult.pixelIdMatched) {
        issueType = 'pixel_id_mismatch';
    }
    else if (checkResult.duplicateEventsSuspected.length > 0) {
        issueType = 'duplicate_event';
        eventName = checkResult.duplicateEventsSuspected[0]?.eventName;
    }
    else {
        issueType = 'event_missing';
    }
    const fingerprint = generateFingerprint(website.id, issueType, eventName);
    // Check if active incident already exists
    const [existingIncident] = await db
        .select()
        .from(incidents)
        .where(and(eq(incidents.websiteId, website.id), eq(incidents.fingerprint, fingerprint)))
        .limit(1);
    if (existingIncident) {
        // If still open, update timestamp without sending duplicate notification
        if (existingIncident.status === 'open') {
            await db
                .update(incidents)
                .set({ lastDetectedAt: now })
                .where(eq(incidents.id, existingIncident.id));
            return;
        }
        // If previously resolved, reopen it
        await db
            .update(incidents)
            .set({ status: 'open', lastDetectedAt: now, resolvedAt: null })
            .where(eq(incidents.id, existingIncident.id));
    }
    else {
        // Create new incident
        const [newIncident] = await db
            .insert(incidents)
            .values({
            websiteId: website.id,
            fingerprint,
            issueType,
            eventName: eventName ?? null,
            status: 'open',
            firstDetectedAt: now,
            lastDetectedAt: now,
        })
            .returning();
        // Fetch verified channels
        const channels = await db
            .select()
            .from(notificationChannels)
            .where(and(eq(notificationChannels.workspaceId, website.workspaceId), eq(notificationChannels.verified, true)));
        const alertMsg = {
            websiteName: website.name,
            websiteUrl: website.url,
            issueTitle: checkResult.errorMessage || `Tracking issue: ${issueType.replace('_', ' ')}`,
            detectedTime: now.toUTCString(),
            relevantEvent: eventName,
            dashboardUrl,
            isRecovery: false,
        };
        for (const ch of channels) {
            let sent = false;
            let errorMsg;
            if (ch.type === 'telegram' && telegramBotToken) {
                const cfg = ch.config;
                if (cfg.chatId) {
                    const res = await sendTelegramMessage(telegramBotToken, cfg.chatId, alertMsg);
                    sent = res.success;
                    errorMsg = res.error;
                }
            }
            else if (ch.type === 'email' && resendApiKey) {
                const cfg = ch.config;
                if (cfg.email) {
                    const res = await sendEmailNotification(resendApiKey, cfg.email, alertMsg);
                    sent = res.success;
                    errorMsg = res.error;
                }
            }
            await db.insert(alertDeliveries).values({
                incidentId: newIncident.id,
                channelId: ch.id,
                eventType: 'opened',
                status: sent ? 'sent' : 'failed',
                attemptCount: 1,
                sentAt: sent ? now : null,
                errorMessage: errorMsg ?? null,
            });
        }
    }
}
//# sourceMappingURL=incidents.js.map