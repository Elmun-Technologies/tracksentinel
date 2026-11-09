import { auth } from '@/lib/auth'
import { db, workspaces, users, workspaceMembers } from '@tracksentinel/db'
import { eq } from 'drizzle-orm'
import { Building2, User, Shield, Server, CheckCircle2 } from 'lucide-react'

export default async function SettingsPage() {
  const session = await auth()
  const userId = session?.user?.id
  const workspaceId = (session?.user as any)?.workspaceId as string | null

  let workspace: any = null
  let currentUser: any = null
  let membersList: any[] = []

  if (userId) {
    const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    currentUser = u
  }

  if (workspaceId) {
    const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
    workspace = ws

    membersList = await db
      .select({
        id: workspaceMembers.id,
        role: workspaceMembers.role,
        createdAt: workspaceMembers.createdAt,
        userEmail: users.email,
        userName: users.fullName,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Agency workspace profile, member access, and monitoring infrastructure status.
        </p>
      </div>

      {/* Workspace Details */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Agency Workspace</h2>
            <p className="text-xs text-gray-500">Your organization identifier and tenant space</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <span className="text-xs font-medium text-gray-500 block mb-1">Agency Name</span>
            <span className="text-sm font-semibold text-gray-900">{workspace?.name || 'My Agency'}</span>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 block mb-1">Workspace Slug</span>
            <span className="text-sm font-mono text-gray-700 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200 inline-block">
              {workspace?.slug || 'agency'}
            </span>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">My Profile</h2>
            <p className="text-xs text-gray-500">Signed in account details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <span className="text-xs font-medium text-gray-500 block mb-1">Full Name</span>
            <span className="text-sm font-semibold text-gray-900">{currentUser?.fullName || 'Not set'}</span>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 block mb-1">Email Address</span>
            <span className="text-sm font-mono text-gray-800">{currentUser?.email}</span>
          </div>
        </div>
      </div>

      {/* Workspace Members */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">Team Members</h2>
          </div>
          <span className="text-xs text-gray-400">{membersList.length} member(s)</span>
        </div>

        <div className="divide-y divide-gray-100">
          {membersList.map((m) => (
            <div key={m.id} className="px-6 py-3.5 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-gray-900">{m.userName || m.userEmail}</p>
                <p className="text-gray-400 font-mono">{m.userEmail}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* System & Architecture Info */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Infrastructure & Reliability</h2>
            <p className="text-xs text-gray-500">Autonomous monitoring engine state</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-gray-500 block mb-1 font-medium">Browser Automation</span>
            <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              Playwright Chromium
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-gray-500 block mb-1 font-medium">Database</span>
            <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              PostgreSQL 16 + Drizzle
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-gray-500 block mb-1 font-medium">Target Deployment</span>
            <div className="flex items-center gap-1.5 font-semibold text-gray-800">
              Hetzner Cloud VPS (Docker)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
