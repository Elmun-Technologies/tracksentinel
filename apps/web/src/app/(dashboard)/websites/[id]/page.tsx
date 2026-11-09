import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db, websites, monitoringChecks, incidents } from '@tracksentinel/db'
import { eq, and, desc } from 'drizzle-orm'
import { ArrowLeft, ExternalLink, CheckCircle, XCircle, AlertTriangle, HelpCircle, Activity, ShieldCheck, Zap } from 'lucide-react'
import { CheckTriggerButton } from '@/components/websites/check-trigger-button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WebsiteDetailPage({ params }: PageProps) {
  const session = await auth()
  const workspaceId = (session?.user as any)?.workspaceId as string | null
  const { id } = await params

  if (!workspaceId) notFound()

  // Fetch website
  const [site] = await db
    .select()
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.workspaceId, workspaceId)))
    .limit(1)

  if (!site) notFound()

  // Fetch checks history
  const checks = await db
    .select()
    .from(monitoringChecks)
    .where(eq(monitoringChecks.websiteId, site.id))
    .orderBy(desc(monitoringChecks.createdAt))
    .limit(25)

  // Fetch incidents
  const siteIncidents = await db
    .select()
    .from(incidents)
    .where(eq(incidents.websiteId, site.id))
    .orderBy(desc(incidents.firstDetectedAt))

  const latestCheck = checks[0] || null
  const openIncidents = siteIncidents.filter((i) => i.status === 'open')
  const eventsObserved = (latestCheck?.eventsObserved as any[]) || []
  const duplicates = (latestCheck?.duplicateEventsSuspected as any[]) || []

  return (
    <div className="space-y-8">
      {/* Navigation & Header */}
      <div>
        <Link
          href="/websites"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Websites
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{site.name}</h1>
              {latestCheck && <StatusBadge status={latestCheck.status} />}
            </div>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mt-1 font-mono"
            >
              {site.url}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="flex items-center gap-3">
            <CheckTriggerButton websiteId={site.id} websiteName={site.name} />
          </div>
        </div>
      </div>

      {/* Active Incidents Alert */}
      {openIncidents.length > 0 && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 space-y-2">
          <div className="flex items-center gap-2 text-red-900 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Active Tracking Issues Detected</span>
          </div>
          {openIncidents.map((inc) => (
            <div key={inc.id} className="text-sm text-red-700 pl-6">
              <strong>{inc.issueType.replace('_', ' ').toUpperCase()}</strong>
              {inc.eventName && <span> on event <code>{inc.eventName}</code></span>} — First detected at{' '}
              {new Date(inc.firstDetectedAt).toLocaleString()}
            </div>
          ))}
        </div>
      )}

      {/* Tracking Reliability Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pixel Presence */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pixel Installation</h3>
            </div>
            {latestCheck?.pixelDetected ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Detected
              </span>
            ) : (
              <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                Not Found
              </span>
            )}
          </div>
          <p className="text-xl font-bold font-mono text-gray-900">{site.pixelId}</p>
          <p className="text-xs text-gray-400 mt-1">
            {latestCheck?.pixelIdMatched
              ? '✓ Matches expected Pixel ID in Meta script'
              : '✗ Pixel ID mismatch or not detected'}
          </p>
        </div>

        {/* Observed Events */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Observed Events</h3>
            </div>
            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
              {eventsObserved.length} events
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {eventsObserved.length > 0 ? (
              eventsObserved.map((ev, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md font-mono"
                >
                  {ev.name} ({ev.source})
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">No events observed on last check</span>
            )}
          </div>
        </div>

        {/* Network Requests */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Meta Network Requests</h3>
            </div>
            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
              {latestCheck?.networkRequestsObserved ?? 0} observed
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 font-mono">
            {latestCheck?.networkRequestsObserved ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            HTTP requests intercepted to <code>facebook.com/tr/</code>
          </p>
        </div>
      </div>

      {/* Duplicate Events Suspected Warning */}
      {duplicates.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Suspected Duplicate Event Firing</span>
          </div>
          <ul className="mt-1.5 list-disc list-inside text-xs text-amber-800 space-y-1">
            {duplicates.map((d: any, idx: number) => (
              <li key={idx}>
                <strong>{d.eventName}</strong>: {d.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Monitoring Checks History Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Monitoring History</h2>
            <p className="text-xs text-gray-500 mt-0.5">Automated Playwright browser checks for this website</p>
          </div>
        </div>

        {checks.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No monitoring checks recorded yet. Click "Run Check" to trigger the first check.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Pixel Detected</th>
                  <th className="px-6 py-3">ID Matched</th>
                  <th className="px-6 py-3">Observed Events</th>
                  <th className="px-6 py-3">Network Req</th>
                  <th className="px-6 py-3">Details / Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checks.map((chk) => {
                  const evs = (chk.eventsObserved as any[]) || []
                  return (
                    <tr key={chk.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 text-xs text-gray-900 whitespace-nowrap">
                        {new Date(chk.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={chk.status} />
                      </td>
                      <td className="px-6 py-3.5 text-xs">
                        {chk.pixelDetected ? (
                          <span className="text-emerald-700 font-medium">✓ Yes</span>
                        ) : (
                          <span className="text-red-700 font-medium">✗ No</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-xs">
                        {chk.pixelIdMatched ? (
                          <span className="text-emerald-700 font-medium">✓ Matched</span>
                        ) : (
                          <span className="text-red-700 font-medium">✗ No</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {evs.map((e, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono"
                            >
                              {e.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs font-mono text-gray-700">
                        {chk.networkRequestsObserved ?? 0}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-500 max-w-xs truncate">
                        {chk.errorMessage || 'All checks passed cleanly'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Website Configuration Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Monitoring Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-400 block mb-1">Check Frequency</span>
            <span className="font-semibold text-gray-800">Every {site.checkIntervalMinutes} minutes</span>
          </div>
          <div>
            <span className="text-gray-400 block mb-1">Monitoring Status</span>
            <span className="font-semibold text-emerald-700">Active</span>
          </div>
          <div>
            <span className="text-gray-400 block mb-1">Expected Standard Events</span>
            <span className="font-semibold text-gray-800 font-mono">
              {site.expectedEvents.join(', ')}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block mb-1">Date Added</span>
            <span className="font-semibold text-gray-800">
              {new Date(site.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
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

