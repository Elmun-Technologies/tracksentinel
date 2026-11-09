import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { db, notificationChannels } from '@tracksentinel/db'
import { eq, and } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const [existing] = await db
    .select({ id: notificationChannels.id })
    .from(notificationChannels)
    .where(and(eq(notificationChannels.id, id), eq(notificationChannels.workspaceId, auth.workspaceId)))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Notification channel not found' }, { status: 404 })
  }

  await db.delete(notificationChannels).where(eq(notificationChannels.id, id))

  return NextResponse.json({ success: true, message: 'Notification channel deleted' })
}

