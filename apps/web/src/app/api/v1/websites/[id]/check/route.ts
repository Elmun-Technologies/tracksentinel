import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { db, websites, monitoringJobs } from '@tracksentinel/db'
import { eq, and } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_req: Request, { params }: RouteParams) {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  // Verify workspace ownership
  const [site] = await db
    .select({ id: websites.id, name: websites.name })
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.workspaceId, auth.workspaceId)))
    .limit(1)

  if (!site) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 })
  }

  // Enqueue job for background worker execution
  const [job] = await db
    .insert(monitoringJobs)
    .values({
      websiteId: site.id,
      scheduledAt: new Date(),
      status: 'pending',
    })
    .returning()

  return NextResponse.json({
    message: 'Monitoring check enqueued successfully.',
    jobId: job.id,
    websiteId: site.id,
    status: 'pending',
  })
}

