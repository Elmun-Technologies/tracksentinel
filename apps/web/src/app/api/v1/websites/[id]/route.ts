import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { db, websites, monitoringChecks, incidents } from '@tracksentinel/db'
import { eq, and, desc } from 'drizzle-orm'
import { websiteUpdateSchema } from '@/lib/validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const [site] = await db
    .select()
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.workspaceId, auth.workspaceId)))
    .limit(1)

  if (!site) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 })
  }

  // Fetch latest check
  const [latestCheck] = await db
    .select()
    .from(monitoringChecks)
    .where(eq(monitoringChecks.websiteId, site.id))
    .orderBy(desc(monitoringChecks.createdAt))
    .limit(1)

  // Fetch open incidents
  const openIncidents = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.websiteId, site.id), eq(incidents.status, 'open')))

  return NextResponse.json({
    website: site,
    latestCheck: latestCheck || null,
    openIncidents,
  })
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  // Verify ownership
  const [existing] = await db
    .select()
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.workspaceId, auth.workspaceId)))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 })
  }

  try {
    const json = await req.json()
    const parsed = websiteUpdateSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(websites)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, id))
      .returning()

    return NextResponse.json({ website: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const [existing] = await db
    .select()
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.workspaceId, auth.workspaceId)))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 })
  }

  await db.delete(websites).where(eq(websites.id, id))

  return NextResponse.json({ success: true, message: 'Website deleted' })
}

