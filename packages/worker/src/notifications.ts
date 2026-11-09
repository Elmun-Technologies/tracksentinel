export interface AlertMessage {
  websiteName: string
  websiteUrl: string
  issueTitle: string
  detectedTime: string
  relevantEvent?: string
  dashboardUrl: string
  isRecovery?: boolean
}

/**
 * Sends a notification message via Telegram Bot API.
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  alert: AlertMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const icon = alert.isRecovery ? '✅ RECOVERY' : '🚨 ALERT'
    const statusText = alert.isRecovery ? 'Issue Resolved' : 'Tracking Issue Detected'

    const text = `
<b>${icon}: ${statusText}</b>

<b>Website:</b> ${escapeHtml(alert.websiteName)}
<b>URL:</b> ${escapeHtml(alert.websiteUrl)}
<b>Issue:</b> ${escapeHtml(alert.issueTitle)}
${alert.relevantEvent ? `<b>Event:</b> <code>${escapeHtml(alert.relevantEvent)}</code>\n` : ''}<b>Time:</b> ${alert.detectedTime}

🔗 <a href="${alert.dashboardUrl}">View in TrackSentinel Dashboard</a>
`.trim()

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })

    const data = (await res.json()) as any
    if (!res.ok || !data?.ok) {
      return { success: false, error: data?.description || `HTTP ${res.status}` }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' }
  }
}

/**
 * Sends an email notification via Resend API.
 */
export async function sendEmailNotification(
  apiKey: string,
  recipientEmail: string,
  alert: AlertMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const subject = alert.isRecovery
      ? `✅ Resolved: Meta Pixel tracking healthy for ${alert.websiteName}`
      : `🚨 Issue Alert: Meta Pixel tracking problem on ${alert.websiteName}`

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: ${alert.isRecovery ? '#059669' : '#dc2626'}; margin-top: 0;">
          ${alert.isRecovery ? 'Issue Resolved' : 'Meta Pixel Tracking Issue Detected'}
        </h2>
        <p style="color: #4b5563; font-size: 16px;">
          ${alert.isRecovery ? 'The previously detected issue has recovered and tracking is passing.' : 'TrackSentinel detected a problem with your Meta Pixel installation.'}
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Website</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${escapeHtml(alert.websiteName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">URL</td>
            <td style="padding: 8px 0; color: #2563eb;"><a href="${alert.websiteUrl}">${escapeHtml(alert.websiteUrl)}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Issue</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${escapeHtml(alert.issueTitle)}</td>
          </tr>
          ${
            alert.relevantEvent
              ? `<tr><td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Event</td><td style="padding: 8px 0; color: #111827;"><code>${escapeHtml(alert.relevantEvent)}</code></td></tr>`
              : ''
          }
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Detected At</td>
            <td style="padding: 8px 0; color: #4b5563;">${alert.detectedTime}</td>
          </tr>
        </table>
        <div style="margin-top: 28px;">
          <a href="${alert.dashboardUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Open Dashboard
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">TrackSentinel — Marketing Tracking Reliability SaaS</p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TrackSentinel Alerts <alerts@tracksentinel.com>',
        to: [recipientEmail],
        subject,
        html,
      }),
    })

    const data = (await res.json()) as any
    if (!res.ok) {
      return { success: false, error: data?.message || `HTTP ${res.status}` }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Email delivery failed' }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
