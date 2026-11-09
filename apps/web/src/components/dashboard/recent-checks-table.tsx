'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, AlertTriangle, HelpCircle, ArrowUpRight, Copy, Check } from 'lucide-react'

interface CheckItem {
  check: {
    id: string
    status: string
    pixelDetected: boolean | null
    pixelIdMatched: boolean | null
    eventsObserved: any
    networkRequestsObserved: number | null
    createdAt: Date
    errorMessage: string | null
  }
  website: {
    id: string
    name: string
    url: string
    pixelId: string
  }
}

export function RecentChecksTable({ checks }: { checks: CheckItem[] }) {
  const [filter, setFilter] = useState<'all' | 'issues' | 'passed'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const filtered = checks.filter(({ check }) => {
    if (filter === 'issues') return check.status === 'failed' || check.status === 'warning'
    if (filter === 'passed') return check.status === 'passed'
    return true
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
      {/* Table Header with Filters */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50/50">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Recent Monitoring Checks</h2>
          <p className="text-xs text-gray-500 mt-0.5">Automated headless browser inspections</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-200/60 p-1 rounded-lg text-xs self-start sm:self-center">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === 'all'
                ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({checks.length})
          </button>
          <button
            onClick={() => setFilter('issues')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === 'issues'
                ? 'bg-white text-red-700 shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-red-600'
            }`}
          >
            Issues Only ({checks.filter(c => c.check.status === 'failed' || c.check.status === 'warning').length})
          </button>
          <button
            onClick={() => setFilter('passed')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === 'passed'
                ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-emerald-600'
            }`}
          >
            Passed ({checks.filter(c => c.check.status === 'passed').length})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-500">
          No monitoring checks match the selected filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 border-b border-gray-100 font-semibold text-gray-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3">Website</th>
                <th className="px-6 py-3">Pixel ID</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Observed Events</th>
                <th className="px-6 py-3">Beacons</th>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(({ check, website }) => {
                const events = (check.eventsObserved as any[]) || []
                return (
                  <tr key={check.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-gray-900">
                      <div>
                        <Link
                          href={`/websites/${website.id}`}
                          className="font-semibold text-gray-900 hover:text-blue-600"
                        >
                          {website.name}
                        </Link>
                        <p className="text-[11px] text-gray-400 font-mono truncate max-w-xs">{website.url}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-gray-700">
                      <button
                        onClick={() => copyToClipboard(website.pixelId)}
                        className="inline-flex items-center gap-1 hover:text-blue-600 font-medium px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                        title="Click to copy Pixel ID"
                      >
                        {website.pixelId}
                        {copiedId === website.pixelId ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={check.status} />
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {events.length > 0 ? (
                          events.slice(0, 3).map((e: any, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-mono font-medium"
                            >
                              {e.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                        {events.length > 3 && (
                          <span className="text-[10px] text-gray-400 font-mono">+{events.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-gray-700 font-semibold">
                      {check.networkRequestsObserved ?? 0}
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 whitespace-nowrap">
                      {new Date(check.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/websites/${website.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Inspect
                        <ArrowUpRight className="w-3.5 h-3.5" />
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
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'passed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3 h-3" />
        Passed
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" />
        Failed
      </span>
    )
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3" />
        Warning
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-600 border border-gray-200">
      <HelpCircle className="w-3 h-3" />
      {status}
    </span>
  )
}

