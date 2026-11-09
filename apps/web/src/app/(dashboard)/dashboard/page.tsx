import { auth } from '@/lib/auth'
import { db, websites, monitoringChecks, incidents, notificationChannels } from '@tracksentinel/db'
import { eq, desc, and } from 'drizzle-orm'
import Link from 'next/link'
import {
  ExternalLink,
  Plus,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  XCircle,
  Bot,
  Mail,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { RecentChecksTable } from '@/components/dashboard/recent-checks-table'

export default async function DashboardPage() {
  const session = await auth()
  const workspaceId = (session?.user as any)?.workspaceId as string | null

  let allWebsites: any[] = []
  let openIncidentsList: any[] = []
  let recentChecks: any[] = []
  let channels: any[] = []

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

    // Fetch notification channels to see if Telegram is linked
    channels = await db
      .select({ type: notificationChannels.type })
      .from(notificationChannels)
      .where(eq(notificationChannels.workspaceId, workspaceId))

    // Fetch recent checks across all websites in workspace
    if (allWebsites.length > 0) {
      recentChecks = await db
        .select({
          check: monitoringChecks,
          website: websites,
        })
        .from(monitoringChecks)
        .innerJoin(websites, eq(websites.id, monitoringChecks.websiteId))
        .where(eq(websites.workspaceId, workspaceId))
        .orderBy(desc(monitoringChecks.createdAt))
        .limit(15)

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

  const hasTelegram = channels.some((c) => c.type === 'telegram')
  const reliabilityRate =
    totalWebsites > 0 ? Math.round((healthyWebsites / totalWebsites) * 100) : 100

  return (
    <div className="space-y-8">
      {/* Top Banner if no notification channel is connected */}
      {!hasTelegram && (
        <div className="p-4 rounded-xl border border-sky-200 bg-linear-to-r from-sky-50 to-blue-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-sky-950">
                Connect Telegram for Real-Time Alerts
              </p>
              <p className="text-[11px] text-sky-700">
                Get notified in 5 seconds when client Meta tracking breaks — before it affects ad spend.
              </p>
            </div>
          </div>
          <Link
            href="/alerts"
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors self-start sm:self-center whitespace-nowrap"
          >
            Connect Bot →
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Agency Overview</h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time Meta Pixel tracking health across your agency's client portfolio.
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

      {/* Health Ratio Progress Bar */}
      {totalWebsites > 0 && (
        <div className="p-4 rounded-xl bg-white border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">Portfolio Reliability Score</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {reliabilityRate}% Reliable
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {healthyWebsites} of {totalWebsites} websites passing all standard event checks cleanly
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                reliabilityRate >= 80 ? 'bg-emerald-500' : reliabilityRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${reliabilityRate}%` }}
            />
          </div>
        </div>
      )}

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
          badgeColor={issueWebsites > 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-gray-600 bg-gray-50 border-gray-200'}
        />
        <MetricCard
          label="Inconclusive"
          value={inconclusiveChecks}
          subtext="Timeout / Site down"
          badge={inconclusiveChecks > 0 ? 'Check Required' : '0'}
          badgeColor="text-amber-700 bg-amber-50 border-amber-200"
        />
        <MetricCard
          label="Open Incidents"
          value={openIncidentsCount}
          subtext="Active tracking errors"
          badge={openIncidentsCount > 0 ? `${openIncidentsCount} active` : '0'}
          badgeColor={openIncidentsCount > 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}
        />
      </div>

      {/* Active Tracking Incidents Banner */}
      {openIncidentsList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Active Tracking Incidents</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {openIncidentsList.map(({ incident, website }) => (
              <div
                key={incident.id}
                className="p-4 rounded-xl border border-red-200 bg-red-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-200 text-red-900">
                      {incident.issueType.replace('_', ' ')}
                    </span>
                    <span className="font-bold text-xs text-gray-900">{website.name}</span>
                    <span className="text-[11px] text-gray-500">
                      • {new Date(incident.firstDetectedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-red-700 mt-1 font-medium">
                    {incident.issueType === 'pixel_missing' &&
                      'Meta Pixel script could not be observed on page load. Check GTM or theme code.'}
                    {incident.issueType === 'pixel_id_mismatch' &&
                      `Observed Pixel ID does not match expected ID: ${website.pixelId}.`}
                    {incident.issueType === 'event_missing' &&
                      `Expected standard event "${incident.eventName || 'PageView'}" failed to trigger.`}
                    {incident.issueType === 'duplicate_event' &&
                      `Suspected duplicate event firing detected for "${incident.eventName || 'event'}".`}
                    {incident.issueType === 'check_inconclusive' &&
                      'Website timed out or was unreachable during the automated test.'}
                  </p>
                </div>
                <Link
                  href={`/websites/${website.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-red-300 text-red-700 hover:bg-red-100 text-xs font-semibold rounded-lg shadow-2xs transition-colors whitespace-nowrap self-start sm:self-center"
                >
                  Inspect & Fix
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State when no websites added */}
      {totalWebsites === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200/80 p-12 text-center shadow-xs">
          <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">No client websites added yet</h3>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
            Add your agency's first client website URL and its Meta Pixel ID to begin autonomous monitoring.
          </p>
          <div className="mt-6">
            <Link
              href="/websites/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First Client Website
            </Link>
          </div>
        </div>
      ) : (
        /* Filterable Recent Checks Component */
        <RecentChecksTable checks={recentChecks} />
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
    <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      <p className="mt-1 text-[11px] text-gray-400">{subtext}</p>
    </div>
  )
}
