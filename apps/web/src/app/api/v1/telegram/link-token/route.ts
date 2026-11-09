import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { db, telegramLinkTokens } from '@tracksentinel/db'

export async function POST() {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  // Generate cryptographically secure random 12-char linking token
  const token = `ts_${crypto.randomBytes(6).toString('hex')}`
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 mins expiry

  await db.insert(telegramLinkTokens).values({
    workspaceId: auth.workspaceId,
    token,
    expiresAt,
  })

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TrackSentinelBot'
  const linkUrl = `https://t.me/${botUsername}?start=${token}`

  return NextResponse.json({
    token,
    expiresAt,
    botUsername,
    linkUrl,
    instruction: `Open the Telegram link and click Start, or send: /start ${token}`,
  })
}

