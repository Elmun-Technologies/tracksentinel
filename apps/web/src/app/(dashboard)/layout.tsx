import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db, workspaces, incidents, websites } from '@tracksentinel/db'
import { eq, and } from 'drizzle-orm'
import { AppSidebar } from '@/components/dashboard/app-sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const workspaceId = (session.user as any)?.workspaceId as string | null
  let workspaceName = 'My Agency'
  let openIncidentsCount = 0

  if (workspaceId) {
    const [ws] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
    if (ws) workspaceName = ws.name

    const openIncs = await db
      .select({ id: incidents.id })
      .from(incidents)
      .innerJoin(websites, eq(websites.id, incidents.websiteId))
      .where(and(eq(websites.workspaceId, workspaceId), eq(incidents.status, 'open')))

    openIncidentsCount = openIncs.length
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] text-gray-900 font-sans">
      <AppSidebar
        user={session.user}
        workspaceName={workspaceName}
        openIncidentsCount={openIncidentsCount}
      />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-8 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  )
}
