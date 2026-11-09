import 'dotenv/config'
import bcrypt from 'bcryptjs'
import {
  db,
  users,
  workspaces,
  workspaceMembers,
  websites,
  monitoringJobs,
  notificationChannels,
} from '@tracksentinel/db'
import { eq } from 'drizzle-orm'

async function runSeed() {
  console.log('🌱 Starting TrackSentinel Database Seed...\n')

  const demoEmail = 'demo@agency.com'
  const demoPassword = 'password123'
  const demoName = 'Alex Morgan'

  // 1. Check if demo user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, demoEmail))
    .limit(1)

  let userId: string
  if (existingUser) {
    console.log(`ℹ️ Demo user already exists: ${demoEmail}`)
    userId = existingUser.id
  } else {
    const passwordHash = await bcrypt.hash(demoPassword, 12)
    const [createdUser] = await db
      .insert(users)
      .values({
        email: demoEmail,
        passwordHash,
        fullName: demoName,
        emailVerified: true,
      })
      .returning()
    userId = createdUser.id
    console.log(`✅ Created demo user: ${demoEmail} (Password: ${demoPassword})`)
  }

  // 2. Check / Create Workspace
  let workspaceId: string
  const [existingMembership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1)

  if (existingMembership) {
    workspaceId = existingMembership.workspaceId
    console.log(`ℹ️ User already in workspace: ${workspaceId}`)
  } else {
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: 'Apex Growth Marketing',
        slug: 'apex-growth',
      })
      .returning()

    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: 'owner',
    })

    workspaceId = workspace.id
    console.log(`✅ Created workspace: "Apex Growth Marketing" (ID: ${workspaceId})`)
  }

  // 3. Add Sample Client Websites
  const sampleWebsites = [
    {
      name: 'Nordic Trend Store (E-Commerce)',
      url: 'https://example.com/store',
      pixelId: '284910293847561',
      expectedEvents: ['PageView', 'ViewContent', 'AddToCart', 'Purchase'],
      checkIntervalMinutes: 30,
    },
    {
      name: 'FinFlow SaaS (Lead Gen)',
      url: 'https://example.com/demo',
      pixelId: '918273645019283',
      expectedEvents: ['PageView', 'Lead', 'CompleteRegistration'],
      checkIntervalMinutes: 60,
    },
  ]

  for (const site of sampleWebsites) {
    const [existingSite] = await db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.name, site.name))
      .limit(1)

    if (existingSite) {
      console.log(`ℹ️ Website already exists: "${site.name}"`)
    } else {
      const [newSite] = await db
        .insert(websites)
        .values({
          workspaceId,
          name: site.name,
          url: site.url,
          pixelId: site.pixelId,
          expectedEvents: site.expectedEvents,
          checkIntervalMinutes: site.checkIntervalMinutes,
          isActive: true,
        })
        .returning()

      // Enqueue immediate monitoring job
      await db.insert(monitoringJobs).values({
        websiteId: newSite.id,
        scheduledAt: new Date(),
        status: 'pending',
      })

      console.log(`✅ Added website: "${site.name}" & queued initial check job.`)
    }
  }

  // 4. Add a sample verified email channel
  const [existingChannel] = await db
    .select({ id: notificationChannels.id })
    .from(notificationChannels)
    .where(eq(notificationChannels.workspaceId, workspaceId))
    .limit(1)

  if (!existingChannel) {
    await db.insert(notificationChannels).values({
      workspaceId,
      type: 'email',
      config: { email: 'alerts@apexgrowth.agency' },
      verified: true,
    })
    console.log('✅ Added default verified email alert channel.')
  }

  console.log('\n🎉 Seed complete! You can sign in at http://localhost:3000 with:')
  console.log(`   Email:    ${demoEmail}`)
  console.log(`   Password: ${demoPassword}\n`)
  process.exit(0)
}

runSeed().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
