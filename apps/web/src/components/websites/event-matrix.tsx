import { META_PIXEL_EVENTS } from '@tracksentinel/db/schema'
import { CheckCircle2, AlertCircle, MinusCircle } from 'lucide-react'

interface EventMatrixProps {
  expectedEvents: string[]
  observedEvents: Array<{
    name: string
    source: string
    payload?: any
    timestamp: string
  }>
}

export function EventMatrix({ expectedEvents, observedEvents }: EventMatrixProps) {
  // Count frequency of each observed event
  const eventCounts = new Map<string, number>()
  for (const ev of observedEvents) {
    eventCounts.set(ev.name, (eventCounts.get(ev.name) || 0) + 1)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Meta Standard Event Matrix</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Passive page load verification against configured target events
          </p>
        </div>
        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
          {observedEvents.length} events intercepted
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {META_PIXEL_EVENTS.map((event) => {
          const isExpected = expectedEvents.includes(event)
          const count = eventCounts.get(event) || 0
          const isObserved = count > 0

          let statusStyle = 'bg-gray-50 border-gray-200 text-gray-400'
          let statusText = 'Not Configured'
          let Icon = MinusCircle

          if (isObserved) {
            statusStyle = 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
            statusText = `Observed (${count}x)`
            Icon = CheckCircle2
          } else if (isExpected) {
            statusStyle = 'bg-amber-50/80 border-amber-200 text-amber-800'
            statusText = event === 'PageView' ? 'Missing on Load' : 'Awaiting Trigger'
            Icon = AlertCircle
          }

          return (
            <div
              key={event}
              className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${statusStyle}`}
            >
              <div>
                <span className="font-mono text-xs font-bold block">{event}</span>
                <span className="text-[11px] font-medium opacity-80 mt-0.5 block">
                  {statusText}
                </span>
              </div>
              <Icon className="w-4 h-4 shrink-0 opacity-90" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
