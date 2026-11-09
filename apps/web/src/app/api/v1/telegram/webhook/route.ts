import { NextResponse } from 'next/server'
import { db, telegramLinkTokens, notificationChannels } from '@tracksentinel/db'
import { eq, and, gt, isNull } from 'drizzle-orm'

export async function POST(req: Request) {
  // Verify Telegram secret token header if configured
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (webhookSecret) {
    const headerSecret = req.headers.get('x-telegram-bot-api-secret-token')
    if (headerSecret !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 })
    }
  }

  try {
    const body = await req.json()
    const message = body?.message
    if (!message || !message.text) {
      return NextResponse.json({ ok: true })
    }

    const text = (message.text as string).trim()
    const chatId = message.chat?.id
    const username = message.from?.username || message.from?.first_name || 'User'

    // Match /start <token>
    if (text.startsWith('/start')) {
      const parts = text.split(/\s+/)
      const token = parts[1]?.trim()

      if (!token) {
        if (chatId) {
          await sendReply(
            chatId,
            '👋 Welcome to <b>TrackSentinel</b>!\n\nTo link this Telegram chat for Meta Pixel tracking alerts, open your TrackSentinel dashboard and click "Connect Telegram".'
          )
        }
        return NextResponse.json({ ok: true })
      }

      const now = new Date()

      // Validate linking token
      const [linkRecord] = await db
        .select()
        .from(telegramLinkTokens)
        .where(
          and(
            eq(telegramLinkTokens.token, token),
            isNull(telegramLinkTokens.usedAt),
            gt(telegramLinkTokens.expiresAt, now)
          )
        )
        .limit(1)

      if (!linkRecord) {
        if (chatId) {
          await sendReply(
            chatId,
            '⚠️ <b>Invalid or expired linking token.</b>\nPlease generate a new link in your TrackSentinel dashboard.'
          )
        }
        return NextResponse.json({ ok: true })
      }

      // Mark token as used
      await db
        .update(telegramLinkTokens)
        .set({ usedAt: now })
        .where(eq(telegramLinkTokens.id, linkRecord.id))

      // Check if channel already exists for this chat ID in the workspace
      const [existing] = await db
        .select()
        .from(notificationChannels)
        .where(eq(notificationChannels.workspaceId, linkRecord.workspaceId))
        .limit(1)

      await db.insert(notificationChannels).values({
        workspaceId: linkRecord.workspaceId,
        type: 'telegram',
        config: {
          chatId,
          username,
          linkedAt: now.toISOString(),
        },
        verified: true,
      })

      if (chatId) {
        await sendReply(
          chatId,
          `✅ <b>TrackSentinel Connected Successfully!</b>\n\nYour agency workspace is now connected to receive instant alerts whenever Meta Pixel issues or tracking breakages occur on your client websites.`
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[telegram-webhook] Error:', err)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

async function sendReply(chatId: string | number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })
  } catch {
    // ignore reply send failure
  }
}

