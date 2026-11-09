import Link from 'next/link'
import { WebsiteForm } from '@/components/websites/website-form'
import { ArrowLeft } from 'lucide-react'

export default function NewWebsitePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/websites"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Websites
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Add New Website</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure a client website URL, expected Meta Pixel ID, and monitored conversion events.
        </p>
      </div>

      <WebsiteForm />
    </div>
  )
}

