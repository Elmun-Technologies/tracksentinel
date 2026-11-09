import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { db, notificationChannels, alertDeliveries } from '@tracksentinel/db'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

const channelCreateSchema = z.object({
  type: z.enum(['telegram', 'email']),
  config: z.record(z.any()),
})

export async function GET() {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  const channels = await db
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.workspaceId, auth.workspaceId))
    .orderBy(desc(notificationChannels.createdAt))

  return NextResponse.json({ channels })
}

export async function POST(req: Request) {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  try {
    const json = await req.json()
    const parsed = channelCreateSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { type, config } = parsed.data

    if (type === 'email' && (!config.email || typeof config.email !== 'string')) {
      return NextResponse.json({ error: 'Valid email is required in config' }, { status: 400 })
    }

    const [created] = await db
      .insert(notificationChannels)
      .values({
        workspaceId: auth.workspaceId,
        type,
        config,
        verified: type === 'email', // Email channels verified immediately or via verify endpoint
      })
      .returning()

    return NextResponse.json({ channel: created }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

