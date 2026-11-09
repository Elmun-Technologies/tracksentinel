import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'

/**
 * Helper endpoint to automatically register TrackSentinel webhook with Telegram Bot API.
 */
export async function POST() {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Only workspace owners/admins can configure Telegram webhook.' }, { status: 403 })
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET

  if (!botToken || botToken === 'placeholder') {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN is not configured in environment variables.' },
      { status: 400 }
    )
  }

  if (!appUrl || appUrl.startsWith('http://localhost')) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_APP_URL must be a public HTTPS domain (e.g. https://app.youragency.com).' },
      { status: 400 }
    )
  }

  const webhookUrl = `${appUrl}/api/v1/telegram/webhook`

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret || undefined,
        allowed_updates: ['message'],
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { error: `Telegram API error: ${data.description || res.status}` },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Telegram webhook configured successfully.',
      webhookUrl,
      telegramResponse: data,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Network error setting webhook' }, { status: 500 })
  }
}
