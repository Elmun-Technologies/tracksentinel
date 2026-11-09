import { auth } from '@/lib/auth'
import { db, websites, monitoringChecks, incidents } from '@tracksentinel/db'
import { eq, desc, and } from 'drizzle-orm'
import Link from 'next/link'
import { ExternalLink, Plus, RefreshCw, AlertTriangle, CheckCircle, HelpCircle, XCircle } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()
  const workspaceId = (session?.user as any)?.workspaceId as string | null

  let allWebsites: any[] = []
  let openIncidentsList: any[] = []
  let recentChecks: any[] = []

  let totalWebsites = 0
  let healthyWebsites = 0
  let issueWebsites = 0
  let inconclusiveChecks = 0
  let openIncidentsCount = 0

  if (workspaceId) {
    allWebsites = await db
      .select()
      .from(websites)
      .where(eq(websites.workspaceId, workspaceId))
      .orderBy(desc(websites.createdAt))

    totalWebsites = allWebsites.length

    // Fetch open incidents
    openIncidentsList = await db
      .select({
        incident: incidents,
        website: websites,
      })
      .from(incidents)
      .innerJoin(websites, eq(websites.id, incidents.websiteId))
      .where(
        and(
          eq(websites.workspaceId, workspaceId),
          eq(incidents.status, 'open')
        )
      )
      .orderBy(desc(incidents.lastDetectedAt))

    openIncidentsCount = openIncidentsList.length

    // Fetch recent checks across all websites in workspace
    if (allWebsites.length > 0) {
      const siteIds = allWebsites.map((w) => w.id)
      recentChecks = await db
        .select({
          check: monitoringChecks,
          website: websites,
        })
        .from(monitoringChecks)
        .innerJoin(websites, eq(websites.id, monitoringChecks.websiteId))
        .where(eq(websites.workspaceId, workspaceId))
        .orderBy(desc(monitoringChecks.createdAt))
        .limit(10)

      // Calculate health breakdown based on latest check of each website
      for (const site of allWebsites) {
        const [latest] = await db
          .select()
          .from(monitoringChecks)
          .where(eq(monitoringChecks.websiteId, site.id))
          .orderBy(desc(monitoringChecks.createdAt))
          .limit(1)

        if (!latest) continue

        if (latest.status === 'passed') {
          healthyWebsites++
        } else if (latest.status === 'failed' || latest.status === 'warning') {
          issueWebsites++
        } else if (latest.status === 'inconclusive') {
          inconclusiveChecks++
        }
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time Meta Pixel tracking health across your agency's client websites.
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard label="Total Websites" value={totalWebsites} subtext="Client accounts" />
        <MetricCard
          label="Healthy"
          value={healthyWebsites}
          subtext="Pixel & events passing"
          badge="Passing"
          badgeColor="text-emerald-700 bg-emerald-50 border-emerald-200"
        />
        <MetricCard
          label="Issues Detected"
          value={issueWebsites}
          subtext="Pixel or event failures"
          badge={issueWebsites > 0 ? 'Action Needed' : 'None'}
          badgeColor={issueWebsites > 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-gray-600 bg-gray-50'}
        />
        <MetricCard
          label="Inconclusive"
          value={inconclusiveChecks}
          subtext="Timeouts / Unreachable"
          badge={inconclusiveChecks > 0 ? 'Check Required' : '0'}
          badgeColor="text-amber-700 bg-amber-50 border-amber-200"
        />
        <MetricCard
          label="Open Incidents"
          value={openIncidentsCount}
          subtext="Unresolved alerts"
          badge={openIncidentsCount > 0 ? `${openIncidentsCount} active` : '0'}
          badgeColor={openIncidentsCount > 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50'}
        />
      </div>

      {/* Active Incidents Banner Section */}
      {openIncidentsList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">Active Tracking Incidents</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {openIncidentsList.map(({ incident, website }) => (
              <div
                key={incident.id}
                className="p-4 rounded-lg border border-red-200 bg-red-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-red-200 text-red-800">
                      {incident.issueType.replace('_', ' ')}
                    </span>
                    <span className="font-semibold text-gray-900">{website.name}</span>
                    <span className="text-xs text-gray-500">
                      Detected {new Date(incident.firstDetectedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-red-700 mt-1 font-medium">
                    {incident.issueType === 'pixel_missing' &&
                      'The Meta Pixel script could not be detected on the target website.'}
                    {incident.issueType === 'pixel_id_mismatch' &&
                      `Observed Pixel ID does not match expected ID: ${website.pixelId}.`}
                    {incident.issueType === 'event_missing' &&
                      `Expected conversion event "${incident.eventName || 'PageView'}" was not observed.`}
                    {incident.issueType === 'duplicate_event' &&
                      `Suspected duplicate event firing detected for "${incident.eventName || 'event'}".`}
                    {incident.issueType === 'check_inconclusive' &&
                      'Website timed out or was unreachable during the scheduled monitoring check.'}
                  </p>
                </div>
                <Link
                  href={`/websites/${website.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 text-red-700 hover:bg-red-100 text-xs font-semibold rounded-md shadow-xs transition-colors whitespace-nowrap self-start sm:self-center"
                >
                  View Details & Fix
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State when no websites added */}
      {totalWebsites === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-xs">
          <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">No websites monitored yet</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
            Add your clients' landing pages and stores to start tracking Meta Pixel installations, standard events, and network requests.
          </p>
          <div className="mt-6">
            <Link
              href="/websites/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Website
            </Link>
          </div>
        </div>
      ) : (
        /* Recent Checks Table */
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Recent Monitoring Checks</h2>
              <p className="text-xs text-gray-500 mt-0.5">Latest automated Playwright inspections across all websites</p>
            </div>
            <Link href="/websites" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              View all websites →
            </Link>
          </div>

          {recentChecks.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Checks are currently scheduled and will run shortly.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Website</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Pixel ID Check</th>
                    <th className="px-6 py-3">Observed Events</th>
                    <th className="px-6 py-3">Requests</th>
                    <th className="px-6 py-3">Checked At</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentChecks.map(({ check, website }) => {
                    const events = (check.eventsObserved as any[]) || []
                    return (
                      <tr key={check.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <div>
                            <Link href={`/websites/${website.id}`} className="hover:underline text-blue-600 font-semibold">
                              {website.name}
                            </Link>
                            <p className="text-xs text-gray-400 truncate max-w-xs">{website.url}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={check.status} />
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {check.pixelDetected ? (
                            check.pixelIdMatched ? (
                              <span className="text-emerald-700 font-medium">✓ Matched ({website.pixelId})</span>
                            ) : (
                              <span className="text-red-700 font-medium">✗ Mismatch</span>
                            )
                          ) : (
                            <span className="text-gray-400">Not detected</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {events.length > 0 ? (
                              events.slice(0, 3).map((e: any, i: number) => (
                                <span
                                  key={i}
                                  className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-mono"
                                >
                                  {e.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">None observed</span>
                            )}
                            {events.length > 3 && (
                              <span className="text-[11px] px-1 text-gray-400">+{events.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-gray-700">
                          {check.networkRequestsObserved ?? 0}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(check.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/websites/${website.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  subtext,
  badge,
  badgeColor,
}: {
  label: string
  value: number | string
  subtext: string
  badge?: string
  badgeColor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{subtext}</p>
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
