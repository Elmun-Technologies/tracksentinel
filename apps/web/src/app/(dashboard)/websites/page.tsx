import { auth } from '@/lib/auth'
import { db, websites, monitoringChecks, incidents } from '@tracksentinel/db'
import { eq, desc, and } from 'drizzle-orm'
import Link from 'next/link'
import { Plus, Globe, CheckCircle, XCircle, AlertTriangle, HelpCircle, ExternalLink } from 'lucide-react'
import { CheckTriggerButton } from '@/components/websites/check-trigger-button'

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
          .select()
          .from(monitoringChecks)
          .where(eq(monitoringChecks.websiteId, site.id))
          .orderBy(desc(monitoringChecks.createdAt))
          .limit(1)

        const openIncidents = await db
          .select()
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Monitored Websites</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your agency's client websites and tracking configurations.
          </p>
        </div>
        <div>
          <Link
            href="/websites/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Website
          </Link>
        </div>
      </div>

      {siteList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-xs">
          <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">No websites added yet</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
            Add a website URL and its Meta Pixel ID to begin automated tracking reliability checks.
          </p>
          <div className="mt-6">
            <Link
              href="/websites/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Website
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Website</th>
                  <th className="px-6 py-3.5">Meta Pixel ID</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Expected Events</th>
                  <th className="px-6 py-3.5">Interval</th>
                  <th className="px-6 py-3.5">Last Check</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {siteList.map((site) => {
                  const check = site.latestCheck
                  return (
                    <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/websites/${site.id}`}
                              className="font-semibold text-gray-900 hover:text-blue-600"
                            >
                              {site.name}
                            </Link>
                            {site.openIncidentsCount > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                {site.openIncidentsCount} issue
                              </span>
                            )}
                          </div>
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 hover:text-blue-500 inline-flex items-center gap-1 mt-0.5"
                          >
                            {site.url}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-medium text-gray-800">
                        {site.pixelId}
                      </td>
                      <td className="px-6 py-4">
                        {check ? (
                          <StatusBadge status={check.status} />
                        ) : (
                          <span className="text-xs text-gray-400 italic">Pending first run</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {site.expectedEvents.map((ev: string) => (
                            <span
                              key={ev}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono"
                            >
                              {ev}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        Every {site.checkIntervalMinutes}m
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {check ? new Date(check.createdAt).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <CheckTriggerButton websiteId={site.id} websiteName={site.name} />
                          <Link
                            href={`/websites/${site.id}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Details →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'passed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3 h-3" />
        Passed
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" />
        Failed
      </span>
    )
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3" />
        Warning
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
      <HelpCircle className="w-3 h-3" />
      {status}
    </span>
  )
}
