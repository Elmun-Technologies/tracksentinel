'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeleteWebsiteButton({
  websiteId,
  websiteName,
}: {
  websiteId: string
  websiteName: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    const confirmed = confirm(
      `Are you sure you want to stop monitoring and delete "${websiteName}"? This will delete all check history and incidents.`
    )
    if (!confirmed) return

    setLoading(true)
    try {
      const res = await fetch(`/api/v1/websites/${websiteId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/websites')
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete website')
        setLoading(false)
      }
    } catch {
      alert('Network error while deleting website')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
      title="Delete this website"
    >
      <Trash2 className="w-3.5 h-3.5" />
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  )
}

