import { auth } from '@/lib/auth'
import { db, notificationChannels, alertDeliveries } from '@tracksentinel/db'
import { eq, desc } from 'drizzle-orm'
import { AlertsManager } from '@/components/alerts/alerts-manager'

export default async function AlertsPage() {
  const session = await auth()
  const workspaceId = (session?.user as any)?.workspaceId as string | null

  let channels: any[] = []
  let deliveries: any[] = []

  if (workspaceId) {
    channels = await db
      .select()
      .from(notificationChannels)
      .where(eq(notificationChannels.workspaceId, workspaceId))
      .orderBy(desc(notificationChannels.createdAt))

    deliveries = await db
      .select({
        id: alertDeliveries.id,
        eventType: alertDeliveries.eventType,
        status: alertDeliveries.status,
        sentAt: alertDeliveries.sentAt,
        errorMessage: alertDeliveries.errorMessage,
        createdAt: alertDeliveries.createdAt,
        channelType: notificationChannels.type,
      })
      .from(alertDeliveries)
      .innerJoin(notificationChannels, eq(notificationChannels.id, alertDeliveries.channelId))
      .where(eq(notificationChannels.workspaceId, workspaceId))
      .orderBy(desc(alertDeliveries.createdAt))
      .limit(30)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Alerts & Notification Channels</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure Telegram and email notification channels to receive instant alerts when Meta tracking breaks.
        </p>
      </div>

      <AlertsManager channels={channels} deliveries={deliveries} />
    </div>
  )
}
