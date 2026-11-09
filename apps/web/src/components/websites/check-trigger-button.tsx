'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, CheckCircle2, Clock } from 'lucide-react'

export function CheckTriggerButton({ websiteId }: { websiteId: string; websiteName?: string }) {
  const [status, setStatus] = useState<'idle' | 'enqueuing' | 'running' | 'completed'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleCheck() {
    setStatus('enqueuing')
    setMessage(null)

    try {
      const res = await fetch(`/api/v1/websites/${websiteId}/check`, {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || 'Failed to trigger check')
        setStatus('idle')
        return
      }

      setStatus('running')
      setMessage('Inspection queued — worker analyzing...')

      // Poll every 3 seconds for up to 24 seconds to detect completion
      let attempts = 0
      const pollInterval = setInterval(async () => {
        attempts++
        try {
          const pollRes = await fetch(`/api/v1/websites/${websiteId}`)
          if (pollRes.ok) {
            const pollData = await pollRes.json()
            const latest = pollData.latestCheck

            // If a check was completed within the last 15 seconds
            if (latest && new Date(latest.createdAt).getTime() > Date.now() - 15000) {
              clearInterval(pollInterval)
              setStatus('completed')
              setMessage(`Inspection finished: ${latest.status.toUpperCase()}`)
              router.refresh()
              setTimeout(() => {
                setStatus('idle')
                setMessage(null)
              }, 4000)
              return
            }
          }
        } catch {
          // ignore transient poll error
        }

        if (attempts >= 8) {
          clearInterval(pollInterval)
          setStatus('idle')
          setMessage('Check running in background. Refresh in a moment.')
          router.refresh()
        }
      }, 3000)
    } catch (err: any) {
      setMessage(err.message || 'Error triggering check')
      setStatus('idle')
    }
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        onClick={handleCheck}
        disabled={status === 'enqueuing' || status === 'running'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-2xs transition-all ${
          status === 'running'
            ? 'bg-blue-50 border border-blue-200 text-blue-700'
            : status === 'completed'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700'
        } disabled:opacity-80`}
      >
        {status === 'running' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />}
        {status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
        {status === 'idle' && <RefreshCw className="w-3.5 h-3.5 text-gray-500" />}
        {status === 'enqueuing' && <Clock className="w-3.5 h-3.5 animate-pulse text-gray-400" />}

        {status === 'running'
          ? 'Inspecting Site...'
          : status === 'completed'
          ? 'Done!'
          : status === 'enqueuing'
          ? 'Queueing...'
          : 'Run Check'}
      </button>

      {message && (
        <span
          className={`text-[10px] font-medium mt-1 text-right animate-fadeIn ${
            status === 'completed'
              ? 'text-emerald-700 font-semibold'
              : status === 'running'
              ? 'text-blue-600'
              : 'text-gray-500'
          }`}
        >
          {message}
        </span>
      )}
    </div>
  )
}
