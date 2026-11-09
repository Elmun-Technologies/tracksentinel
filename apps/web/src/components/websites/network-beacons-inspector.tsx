'use client'

import { useState } from 'react'
import { Activity, ChevronDown, ChevronRight, Radio, ExternalLink } from 'lucide-react'

interface NetworkBeaconsInspectorProps {
  events: Array<{
    name: string
    pixelId?: string
    source: string
    payload?: Record<string, any>
    timestamp: string
  }>
  networkRequestsObserved: number
}

export function NetworkBeaconsInspector({
  events,
  networkRequestsObserved,
}: NetworkBeaconsInspectorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  function toggleExpand(index: number) {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">
              Meta Network Beacon Stream
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Live HTTP request payloads intercepted to <code>facebook.com/tr/</code>
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/60">
          {networkRequestsObserved} beacons intercepted
        </span>
      </div>

      {events.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-400 italic">
          No network beacons intercepted during the last inspection.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {events.map((ev, index) => {
            const isExpanded = expandedIndex === index
            const payload = ev.payload || {}
            const hasPayload = Object.keys(payload).length > 0

            return (
              <div key={index} className="transition-colors hover:bg-gray-50/60">
                <button
                  type="button"
                  onClick={() => toggleExpand(index)}
                  className="w-full px-6 py-3.5 flex items-center justify-between text-left focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-1 rounded text-gray-400 hover:text-gray-600">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </span>
                    <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                      {ev.name}
                    </span>
                    <span className="text-[11px] font-mono text-gray-500">
                      Source: <span className="text-gray-700 font-semibold">{ev.source}</span>
                    </span>
                    {ev.pixelId && (
                      <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">
                        Pixel ID: {ev.pixelId}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-gray-400 whitespace-nowrap">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </button>

                {isExpanded && hasPayload && (
                  <div className="px-6 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Parsed Query Parameters & Beacon Payload:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs">
                      {Object.entries(payload).map(([key, val]) => (
                        <div
                          key={key}
                          className="p-2 rounded bg-white border border-gray-200/80 truncate shadow-2xs"
                        >
                          <span className="text-blue-600 font-semibold">{key}: </span>
                          <span className="text-gray-800" title={String(val)}>
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

