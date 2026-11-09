import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { db, websites, monitoringChecks, monitoringJobs } from '@tracksentinel/db'
import { eq, desc } from 'drizzle-orm'
import { websiteCreateSchema } from '@/lib/validation'

export async function GET() {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  const siteList = await db
    .select()
    .from(websites)
    .where(eq(websites.workspaceId, auth.workspaceId))
    .orderBy(desc(websites.createdAt))

  // Fetch the latest check for each website
  const sitesWithLatest = await Promise.all(
    siteList.map(async (site) => {
      const [latestCheck] = await db
        .select()
        .from(monitoringChecks)
        .where(eq(monitoringChecks.websiteId, site.id))
        .orderBy(desc(monitoringChecks.createdAt))
        .limit(1)

      return {
        ...site,
        latestCheck: latestCheck || null,
      }
    })
  )

  return NextResponse.json({ websites: sitesWithLatest })
}

export async function POST(req: Request) {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  try {
    const json = await req.json()
    const parsed = websiteCreateSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, url, pixelId, expectedEvents, checkIntervalMinutes } = parsed.data

    const [created] = await db
      .insert(websites)
      .values({
        workspaceId: auth.workspaceId,
        name,
        url,
        pixelId,
        expectedEvents,
        checkIntervalMinutes,
        isActive: true,
      })
      .returning()

    // Immediately enqueue an initial monitoring check job
    await db.insert(monitoringJobs).values({
      websiteId: created.id,
      scheduledAt: new Date(),
      status: 'pending',
    })

    return NextResponse.json({ website: created }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

