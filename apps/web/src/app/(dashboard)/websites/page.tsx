import { auth } from '@/lib/auth'
import { db, websites, monitoringChecks, incidents } from '@tracksentinel/db'
import { eq, desc, and } from 'drizzle-orm'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { WebsitesListView } from '@/components/websites/websites-list-view'

export default async function WebsitesPage() {
  const session = await auth()
  const workspaceId = (session?.user as any)?.workspaceId as string | null

  let siteList: any[] = []

  if (workspaceId) {
    const rawSites = await db
      .select()
      .from(websites)
      .where(eq(websites.workspaceId, workspaceId))
      .orderBy(desc(websites.createdAt))

    siteList = await Promise.all(
      rawSites.map(async (site) => {
        const [latestCheck] = await db
          .select({
            id: monitoringChecks.id,
            status: monitoringChecks.status,
            pixelDetected: monitoringChecks.pixelDetected,
            pixelIdMatched: monitoringChecks.pixelIdMatched,
            createdAt: monitoringChecks.createdAt,
          })
          .from(monitoringChecks)
          .where(eq(monitoringChecks.websiteId, site.id))
          .orderBy(desc(monitoringChecks.createdAt))
          .limit(1)

        const openIncidents = await db
          .select({ id: incidents.id })
          .from(incidents)
          .where(and(eq(incidents.websiteId, site.id), eq(incidents.status, 'open')))

        return {
          ...site,
          latestCheck: latestCheck || null,
          openIncidentsCount: openIncidents.length,
        }
      })
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Client Websites</h1>
          <p className="text-xs text-gray-500 mt-1">
            Active tracking monitors, inspection frequencies, and Meta Pixel statuses.
          </p>
        </div>
        <div>
          <Link
            href="/websites/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Client Website
          </Link>
        </div>
      </div>

      <WebsitesListView initialWebsites={siteList} />
    </div>
  )
}
