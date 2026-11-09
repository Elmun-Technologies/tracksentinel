export interface AlertMessage {
    websiteName: string;
    websiteUrl: string;
    issueTitle: string;
    detectedTime: string;
    relevantEvent?: string;
    dashboardUrl: string;
    isRecovery?: boolean;
}
/**
 * Sends a notification message via Telegram Bot API.
 */
export declare function sendTelegramMessage(botToken: string, chatId: string | number, alert: AlertMessage): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Sends an email notification via Resend API.
 */
export declare function sendEmailNotification(apiKey: string, recipientEmail: string, alert: AlertMessage): Promise<{
    success: boolean;
    error?: string;
}>;
//# sourceMappingURL=notifications.d.ts.map