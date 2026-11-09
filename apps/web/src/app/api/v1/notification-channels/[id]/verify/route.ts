import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { db, notificationChannels } from '@tracksentinel/db'
import { eq, and } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_req: Request, { params }: RouteParams) {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const [channel] = await db
    .select()
    .from(notificationChannels)
    .where(and(eq(notificationChannels.id, id), eq(notificationChannels.workspaceId, auth.workspaceId)))
    .limit(1)

  if (!channel) {
    return NextResponse.json({ error: 'Notification channel not found' }, { status: 404 })
  }

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  const resendApiKey = process.env.RESEND_API_KEY

  if (channel.type === 'telegram') {
    const cfg = channel.config as { chatId?: string | number }
    if (!cfg.chatId) {
      return NextResponse.json({ error: 'Telegram channel has no linked chat ID' }, { status: 400 })
    }

    if (!telegramBotToken) {
      return NextResponse.json({
        success: true,
        mock: true,
        message: 'Telegram test notification simulated (TELEGRAM_BOT_TOKEN not configured yet).',
      })
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cfg.chatId,
          text: '✅ <b>TrackSentinel Test Alert</b>\nYour Telegram alerts are properly configured and active!',
          parse_mode: 'HTML',
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        return NextResponse.json({ error: `Telegram error: ${data.description || res.status}` }, { status: 502 })
      }

      await db
        .update(notificationChannels)
        .set({ verified: true })
        .where(eq(notificationChannels.id, id))

      return NextResponse.json({ success: true, message: 'Test message sent to Telegram successfully.' })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to dispatch Telegram message' }, { status: 500 })
    }
  }

  if (channel.type === 'email') {
    const cfg = channel.config as { email?: string }
    if (!cfg.email) {
      return NextResponse.json({ error: 'Email configuration is missing destination address' }, { status: 400 })
    }

    if (!resendApiKey) {
      return NextResponse.json({
        success: true,
        mock: true,
        message: 'Email test notification simulated (RESEND_API_KEY not configured yet).',
      })
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'TrackSentinel <alerts@tracksentinel.com>',
          to: [cfg.email],
          subject: '✅ TrackSentinel Test Notification',
          html: '<p>Your TrackSentinel email alert delivery is working properly.</p>',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        return NextResponse.json({ error: data.message || `HTTP ${res.status}` }, { status: 502 })
      }

      await db
        .update(notificationChannels)
        .set({ verified: true })
        .where(eq(notificationChannels.id, id))

      return NextResponse.json({ success: true, message: 'Test email sent successfully.' })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to dispatch email' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unsupported channel type' }, { status: 400 })
}

