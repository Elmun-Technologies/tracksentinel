'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const navItems = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Websites', href: '/websites' },
  { label: 'Alerts', href: '/alerts' },
  { label: 'Settings', href: '/settings' },
]

interface NavUser {
  name?: string | null
  email?: string | null
}

export function DashboardNav({ user }: { user: NavUser }) {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold text-gray-900">TrackSentinel</span>
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-gray-500 hover:text-gray-900 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
