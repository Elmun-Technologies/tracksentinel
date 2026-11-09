'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { META_PIXEL_EVENTS } from '@tracksentinel/db/schema'

export function WebsiteForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [pixelId, setPixelId] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['PageView'])
  const [interval, setInterval] = useState(60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleEvent(eventName: string) {
    if (selectedEvents.includes(eventName)) {
      if (selectedEvents.length === 1) {
        setError('At least one expected event must be selected.')
        return
      }
      setSelectedEvents(selectedEvents.filter((e) => e !== eventName))
    } else {
      setSelectedEvents([...selectedEvents, eventName])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Basic frontend checks
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Website URL must start with http:// or https://')
      setLoading(false)
      return
    }

    if (!/^\d{10,20}$/.test(pixelId.trim())) {
      setError('Meta Pixel ID must be 10 to 20 digits.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/v1/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          pixelId: pixelId.trim(),
          expectedEvents: selectedEvents,
          checkIntervalMinutes: Number(interval),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create website.')
        setLoading(false)
        return
      }

      router.push(`/websites/${data.website.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Network error')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl border border-gray-200 shadow-xs max-w-2xl">
      {error && (
        <div role="alert" className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-1">
          Website / Client Name
        </label>
        <input
          id="name"
          type="text"
          required
          placeholder="e.g. Acme Ecommerce Store"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">A clear name for this client account or brand.</p>
      </div>

      <div>
        <label htmlFor="url" className="block text-sm font-semibold text-gray-900 mb-1">
          Website URL to Monitor
        </label>
        <input
          id="url"
          type="url"
          required
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
        />
        <p className="mt-1 text-xs text-gray-500">
          The public landing page or storefront where Meta Pixel is expected to be installed.
        </p>
      </div>

      <div>
        <label htmlFor="pixelId" className="block text-sm font-semibold text-gray-900 mb-1">
          Expected Meta Pixel ID
        </label>
        <input
          id="pixelId"
          type="text"
          required
          placeholder="e.g. 123456789012345"
          value={pixelId}
          onChange={(e) => setPixelId(e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
        />
        <p className="mt-1 text-xs text-gray-500">
          10–20 digit numeric Meta Pixel ID from Meta Events Manager.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Expected Standard Events
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Select standard events relevant to this website. Initial checks passively verify PageView and page-load triggers.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {META_PIXEL_EVENTS.map((event) => {
            const isSelected = selectedEvents.includes(event)
            return (
              <button
                type="button"
                key={event}
                onClick={() => toggleEvent(event)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{event}</span>
                {isSelected && <span>✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="interval" className="block text-sm font-semibold text-gray-900 mb-1">
          Monitoring Frequency
        </label>
        <select
          id="interval"
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value))}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value={15}>Every 15 minutes (Critical accounts)</option>
          <option value={30}>Every 30 minutes</option>
          <option value={60}>Every 1 hour (Recommended default)</option>
          <option value={360}>Every 6 hours</option>
          <option value={1440}>Every 24 hours</option>
        </select>
      </div>

      <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          {loading ? 'Adding Website...' : 'Add Website & Start Monitoring'}
        </button>
      </div>
    </form>
  )
}
