import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { db, websites, incidents } from '@tracksentinel/db'
import { eq, and, desc } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  // Verify ownership
  const [site] = await db
    .select({ id: websites.id })
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.workspaceId, auth.workspaceId)))
    .limit(1)

  if (!site) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 })
  }

  const siteIncidents = await db
    .select()
    .from(incidents)
    .where(eq(incidents.websiteId, id))
    .orderBy(desc(incidents.firstDetectedAt))

  return NextResponse.json({ incidents: siteIncidents })
}

