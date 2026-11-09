'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, CheckCircle, ExternalLink, Trash2, Mail, Bot } from 'lucide-react'

export function AlertsManager({
  channels,
  deliveries,
}: {
  channels: any[]
  deliveries: any[]
}) {
  const router = useRouter()
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [telegramLink, setTelegramLink] = useState<{
    linkUrl: string
    token: string
    instruction: string
  } | null>(null)

  const [emailInput, setEmailInput] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generateTelegramLink() {
    setTelegramLoading(true)
    setError(null)
    setMessage(null)

    try {
      const res = await fetch('/api/v1/telegram/link-token', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setTelegramLink(data)
      } else {
        setError(data.error || 'Failed to generate Telegram connection link')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setTelegramLoading(false)
    }
  }

  async function handleAddEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!emailInput || !emailInput.includes('@')) {
      setError('Please provide a valid email address.')
      return
    }

    setEmailLoading(true)
    setError(null)
    setMessage(null)

    try {
      const res = await fetch('/api/v1/notification-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          config: { email: emailInput.trim() },
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setEmailInput('')
        setMessage('Email notification channel added successfully!')
        router.refresh()
      } else {
        setError(data.error || 'Failed to add email channel')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleVerify(channelId: string) {
    setMessage(null)
    setError(null)

    try {
      const res = await fetch(`/api/v1/notification-channels/${channelId}/verify`, {
        method: 'POST',
      })
      const data = await res.json()

      if (res.ok) {
        setMessage(data.message || 'Test notification sent!')
        router.refresh()
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch (err: any) {
      setError(err.message || 'Error sending test')
    }
  }

  async function handleDelete(channelId: string) {
    if (!confirm('Are you sure you want to remove this notification channel?')) return

    try {
      const res = await fetch(`/api/v1/notification-channels/${channelId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setMessage('Channel deleted.')
        router.refresh()
      }
    } catch {
      setError('Failed to delete channel')
    }
  }

  return (
    <div className="space-y-8">
      {message && (
        <div className="p-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Telegram Connect */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Telegram Alerts</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Connect your agency's Telegram account or group chat to receive instant Meta Pixel alerts as soon as an issue is detected.
            </p>

            {telegramLink && (
              <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-lg mb-4 text-xs space-y-2">
                <p className="font-semibold text-sky-900">One-click connect:</p>
                <a
                  href={telegramLink.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700 transition-colors"
                >
                  Open in Telegram
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <p className="text-sky-700 text-[11px] mt-1 font-mono">
                  Or send to bot: <code>/start {telegramLink.token}</code>
                </p>
              </div>
            )}
          </div>

          <button
            onClick={generateTelegramLink}
            disabled={telegramLoading}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <Bot className="w-4 h-4" />
            {telegramLoading ? 'Generating Link...' : 'Generate Telegram Connect Link'}
          </button>
        </div>

        {/* Email Connect */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Email Notifications</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Add email addresses to receive detailed incident breakdowns and recovery reports delivered via Resend.
            </p>

            <form onSubmit={handleAddEmail} className="space-y-3">
              <div>
                <input
                  type="email"
                  required
                  placeholder="alerts@agency.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={emailLoading}
                className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                {emailLoading ? 'Adding...' : 'Add Alert Email'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Active Channels List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Active Notification Channels</h2>
          <p className="text-xs text-gray-500 mt-0.5">Channels configured to receive real-time alerts</p>
        </div>

        {channels.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No notification channels connected yet. Use the cards above to connect Telegram or add an email.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {channels.map((ch) => {
              const cfg = (ch.config as any) || {}
              return (
                <div key={ch.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-gray-100 text-gray-600">
                      {ch.type === 'telegram' ? <Bot className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {ch.type === 'telegram' ? `Telegram (${cfg.username || 'Chat ' + cfg.chatId})` : cfg.email}
                        </span>
                        {ch.verified && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">Added {new Date(ch.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerify(ch.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-md shadow-2xs transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      Send Test
                    </button>
                    <button
                      onClick={() => handleDelete(ch.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                      title="Remove channel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Alert Deliveries Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Recent Alert Deliveries</h2>
          <p className="text-xs text-gray-500 mt-0.5">Audit log of sent alerts and recovery messages</p>
        </div>

        {deliveries.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No alert notifications have been triggered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Channel</th>
                  <th className="px-6 py-3">Error / Status Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap text-gray-900">
                      {new Date(del.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                          del.eventType === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {del.eventType}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-semibold">
                      {del.status === 'sent' ? (
                        <span className="text-emerald-700">✓ Sent</span>
                      ) : (
                        <span className="text-red-700">✗ {del.status}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 capitalize">{del.channelType || 'channel'}</td>
                    <td className="px-6 py-3 text-gray-400 truncate max-w-xs">
                      {del.errorMessage || 'Delivered successfully'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

