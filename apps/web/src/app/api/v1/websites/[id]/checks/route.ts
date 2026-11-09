import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { db, websites, monitoringChecks } from '@tracksentinel/db'
import { eq, and, desc } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: RouteParams) {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

  // Verify ownership
  const [site] = await db
    .select({ id: websites.id })
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.workspaceId, auth.workspaceId)))
    .limit(1)

  if (!site) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 })
  }

  const checks = await db
    .select()
    .from(monitoringChecks)
    .where(eq(monitoringChecks.websiteId, id))
    .orderBy(desc(monitoringChecks.createdAt))
    .limit(limit)

  return NextResponse.json({ checks })
}

