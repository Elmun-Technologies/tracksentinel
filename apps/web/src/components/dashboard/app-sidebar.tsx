'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Globe,
  BellRing,
  Settings,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  Activity,
  Layers,
} from 'lucide-react'

interface AppSidebarProps {
  user: {
    name?: string | null
    email?: string | null
  }
  workspaceName?: string
  openIncidentsCount?: number
}

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Websites', href: '/websites', icon: Globe },
  { label: 'Alerts', href: '/alerts', icon: BellRing, badge: true },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function AppSidebar({
  user,
  workspaceName = 'My Agency',
  openIncidentsCount = 0,
}: AppSidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-gray-900 block leading-tight">
                TrackSentinel
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
                Meta Reliability
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Switcher / Badge */}
        <div className="px-3 py-3 border-b border-gray-100">
          <div className="px-3 py-2 bg-gray-50 border border-gray-200/80 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-5 h-5 rounded bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-gray-800 truncate">
                {workspaceName}
              </span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white shrink-0">
              Agency
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && openIncidentsCount > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-red-500 text-white'
                        : 'bg-red-100 text-red-700 animate-pulse'
                    }`}
                  >
                    {openIncidentsCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer / User Profile & System Status */}
      <div className="p-3 border-t border-gray-100 space-y-3">
        {/* Live System Indicator */}
        <div className="px-3 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-emerald-800">
              Worker Active
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-600">9090 OK</span>
        </div>

        {/* User Card */}
        <div className="px-3 py-2.5 rounded-lg bg-gray-50 flex items-center justify-between border border-gray-200/60">
          <div className="truncate pr-2">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {user.name || user.email}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-white transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-gray-900">TrackSentinel</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Content */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white z-50 md:hidden transform transition-transform duration-200 ease-in-out border-r border-gray-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>
    </>
  )
}
