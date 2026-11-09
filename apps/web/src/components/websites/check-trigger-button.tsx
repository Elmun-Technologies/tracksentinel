'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function CheckTriggerButton({ websiteId, websiteName }: { websiteId: string; websiteName?: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleCheck() {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/v1/websites/${websiteId}/check`, {
        method: 'POST',
      })
      const data = await res.json()

      if (res.ok) {
        setMessage('Check enqueued! Background worker will inspect site shortly.')
        router.refresh()
      } else {
        setMessage(data.error || 'Failed to trigger check')
      }
    } catch (err: any) {
      setMessage(err.message || 'Error triggering check')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        onClick={handleCheck}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
        {loading ? 'Queueing...' : 'Run Check'}
      </button>
      {message && <span className="text-[11px] text-blue-600 mt-1 max-w-xs text-right">{message}</span>}
    </div>
  )
}

