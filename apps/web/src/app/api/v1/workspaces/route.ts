import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { db, workspaces, workspaceMembers } from '@tracksentinel/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
})

export async function GET() {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  const userWorkspaces = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
      createdAt: workspaces.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, auth.userId))

  return NextResponse.json({ workspaces: userWorkspaces })
}

export async function POST(req: Request) {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  try {
    const json = await req.json()
    const parsed = workspaceSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const baseSlug = parsed.data.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`

    const [created] = await db
      .insert(workspaces)
      .values({
        name: parsed.data.name,
        slug,
      })
      .returning()

    await db.insert(workspaceMembers).values({
      workspaceId: created.id,
      userId: auth.userId,
      role: 'owner',
    })

    return NextResponse.json({ workspace: created }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

