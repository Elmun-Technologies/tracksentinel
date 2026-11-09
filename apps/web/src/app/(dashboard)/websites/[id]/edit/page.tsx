import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db, websites } from '@tracksentinel/db'
import { eq, and } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import { EditWebsiteForm } from '@/components/websites/edit-website-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditWebsitePage({ params }: PageProps) {
  const session = await auth()
  const workspaceId = (session?.user as any)?.workspaceId as string | null
  const { id } = await params

  if (!workspaceId) notFound()

  const [site] = await db
    .select()
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.workspaceId, workspaceId)))
    .limit(1)

  if (!site) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/websites/${site.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Website Details
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit Website Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Update tracking configuration and monitoring schedule for {site.name}.
        </p>
      </div>

      <EditWebsiteForm website={site} />
    </div>
  )
}
