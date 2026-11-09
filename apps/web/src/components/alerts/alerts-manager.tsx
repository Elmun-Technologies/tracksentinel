'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send,
  CheckCircle,
  ExternalLink,
  Trash2,
  Mail,
  Bot,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  ArrowRight,
  Info,
} from 'lucide-react'

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
    botUsername: string
  } | null>(null)

  const [emailInput, setEmailInput] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
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

  function copyToken(token: string) {
    navigator.clipboard.writeText(`/start ${token}`)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
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
        setMessage('Email alert channel added successfully!')
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
        setMessage(data.message || 'Test notification dispatched successfully!')
        router.refresh()
      } else {
        setError(data.error || 'Verification dispatch failed')
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
        setMessage('Notification channel removed.')
        router.refresh()
      }
    } catch {
      setError('Failed to delete channel')
    }
  }

  return (
    <div className="space-y-8">
      {message && (
        <div className="p-4 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 text-xs font-semibold text-red-800 bg-red-50 border border-red-200 rounded-xl shadow-2xs">
          {error}
        </div>
      )}

      {/* Integration Setup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Telegram Connect Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight">Telegram Alerts</h2>
                  <p className="text-[11px] text-gray-500">Real-time incident dispatches via Telegram Bot</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                Primary MVP
              </span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Connect your agency's private chat or team group. TrackSentinel delivers instantaneous alerts when Meta Pixel disappears or events stop firing.
            </p>

            {telegramLink ? (
              <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-950">Secure Linking Flow</span>
                  <span className="text-[10px] font-mono text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                    Expires in 15m
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={telegramLink.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    Open Bot in Telegram
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => copyToken(telegramLink.token)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-sky-100/60 border border-sky-200 text-sky-800 rounded-lg text-xs font-semibold transition-colors font-mono"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copied /start command!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy: /start {telegramLink.token}
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-sky-800 leading-relaxed">
                  Click <strong>Start</strong> in Telegram. Your chat will automatically bind to this workspace without exposing tokens.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  How verification works:
                </div>
                <p className="text-[11px] leading-relaxed">
                  We generate a cryptographically random 1-time token to prevent arbitrary chat ID injection.
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
            {telegramLoading ? 'Generating Link...' : 'Generate New Telegram Connect Link'}
          </button>
        </div>

        {/* Email Connect Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight">Email Alerts</h2>
                  <p className="text-[11px] text-gray-500">Incident and recovery summaries via Resend</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Add email addresses for agency media buyers and tracking specialists to receive detailed recovery reports.
            </p>

            <form onSubmit={handleAddEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="alerts@youragency.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={emailLoading}
                className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                {emailLoading ? 'Adding...' : 'Add Alert Recipient'}
              </button>
            </form>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-[11px] text-gray-500">
            ✓ Deduplicated: initial issue alert + resolution recovery alert only.
          </div>
        </div>
      </div>

      {/* Active Channels List */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Active Notification Channels</h2>
            <p className="text-xs text-gray-500 mt-0.5">Configured channels currently receiving live incident dispatches</p>
          </div>
          <span className="text-xs font-mono font-semibold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
            {channels.length} channels active
          </span>
        </div>

        {channels.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-400">
            No notification channels connected yet. Use the setup cards above to link Telegram or add an email.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {channels.map((ch) => {
              const cfg = (ch.config as any) || {}
              return (
                <div key={ch.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        ch.type === 'telegram'
                          ? 'bg-sky-50 text-sky-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {ch.type === 'telegram' ? <Bot className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          {ch.type === 'telegram'
                            ? `Telegram: ${cfg.username ? '@' + cfg.username : 'Chat ' + cfg.chatId}`
                            : cfg.email}
                        </span>
                        {ch.verified && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 font-mono">
                        Added on {new Date(ch.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerify(ch.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                      title="Send a test notification to verify delivery"
                    >
                      <Send className="w-3 h-3 text-blue-600" />
                      Send Test
                    </button>
                    <button
                      onClick={() => handleDelete(ch.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Recent Alert Deliveries</h2>
          <p className="text-xs text-gray-500 mt-0.5">Audit log of incident opened and recovery messages</p>
        </div>

        {deliveries.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-400">
            No alert notifications dispatched yet. When tracking incidents occur, deliveries will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 border-b border-gray-100 font-semibold text-gray-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Event Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Channel</th>
                  <th className="px-6 py-3">Delivery Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-gray-900 font-mono text-[11px]">
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
                    <td className="px-6 py-3 capitalize font-medium">{del.channelType || 'channel'}</td>
                    <td className="px-6 py-3 text-gray-400 truncate max-w-xs font-mono text-[11px]">
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
