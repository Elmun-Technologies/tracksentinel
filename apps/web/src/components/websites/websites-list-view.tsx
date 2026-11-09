'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Copy,
  Check,
  Settings,
  Plus,
} from 'lucide-react'
import { CheckTriggerButton } from './check-trigger-button'

interface WebsiteItem {
  id: string
  name: string
  url: string
  pixelId: string
  expectedEvents: string[]
  checkIntervalMinutes: number
  latestCheck: {
    id: string
    status: string
    pixelDetected: boolean | null
    pixelIdMatched: boolean | null
    createdAt: Date
  } | null
  openIncidentsCount: number
}

export function WebsitesListView({ initialWebsites }: { initialWebsites: WebsiteItem[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'issues'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const filtered = initialWebsites.filter((site) => {
    const matchesSearch =
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.url.toLowerCase().includes(search.toLowerCase()) ||
      site.pixelId.includes(search)

    if (!matchesSearch) return false

    if (filter === 'issues') {
      return (
        site.openIncidentsCount > 0 ||
        site.latestCheck?.status === 'failed' ||
        site.latestCheck?.status === 'warning'
      )
    }

    return true
  })

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client name, URL or Pixel ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({initialWebsites.length})
            </button>
            <button
              onClick={() => setFilter('issues')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'issues'
                  ? 'bg-white text-red-700 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              Issues ({initialWebsites.filter((s) => s.openIncidentsCount > 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* Websites Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No websites match your search query or selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 border-b border-gray-100 font-semibold text-gray-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">Client Website</th>
                  <th className="px-6 py-3.5">Meta Pixel ID</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Monitored Events</th>
                  <th className="px-6 py-3.5">Frequency</th>
                  <th className="px-6 py-3.5">Last Inspected</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((site) => {
                  const check = site.latestCheck
                  return (
                    <tr key={site.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/websites/${site.id}`}
                              className="font-bold text-gray-900 hover:text-blue-600 text-xs"
                            >
                              {site.name}
                            </Link>
                            {site.openIncidentsCount > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700 animate-pulse">
                                {site.openIncidentsCount} issue
                              </span>
                            )}
                          </div>
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-gray-400 hover:text-blue-500 inline-flex items-center gap-1 mt-0.5 font-mono truncate max-w-xs"
                          >
                            {site.url}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-gray-700 font-medium">
                        <button
                          onClick={() => copyToClipboard(site.pixelId)}
                          className="inline-flex items-center gap-1 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                          title="Click to copy Pixel ID"
                        >
                          {site.pixelId}
                          {copiedId === site.pixelId ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                      </td>

                      <td className="px-6 py-4">
                        {check ? (
                          <StatusBadge status={check.status} />
                        ) : (
                          <span className="text-gray-400 italic">Pending run</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {site.expectedEvents.slice(0, 3).map((ev) => (
                            <span
                              key={ev}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono font-medium"
                            >
                              {ev}
                            </span>
                          ))}
                          {site.expectedEvents.length > 3 && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              +{site.expectedEvents.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-gray-600 font-medium">
                        Every {site.checkIntervalMinutes}m
                      </td>

                      <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                        {check ? new Date(check.createdAt).toLocaleTimeString() : '—'}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <CheckTriggerButton websiteId={site.id} websiteName={site.name} />
                          <Link
                            href={`/websites/${site.id}/edit`}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit settings"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/websites/${site.id}`}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 ml-1"
                          >
                            Inspect →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'passed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3 h-3" />
        Passed
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" />
        Failed
      </span>
    )
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3" />
        Warning
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-600 border border-gray-200">
      <HelpCircle className="w-3 h-3" />
      {status}
    </span>
  )
}

