import { auth } from '@/lib/auth'
import { db, workspaceMembers, workspaces } from '@tracksentinel/db'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export interface AuthContext {
  userId: string
  userEmail: string
  workspaceId: string
  role: 'owner' | 'admin' | 'member'
}

/**
 * Validates session and ensures the user belongs to a workspace.
 * Returns AuthContext or a NextResponse error to immediately return.
 */
export async function getAuthContext(): Promise<AuthContext | NextResponse> {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
  }

  const userId = session.user.id
  const userEmail = session.user.email || ''

  // Retrieve user's active workspace membership
  const [membership] = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1)

  if (!membership) {
    // If no workspace exists yet, create a default one for the user
    const baseSlug = userEmail.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const slug = `${baseSlug}-${userId.substring(0, 8)}`

    const [newWs] = await db
      .insert(workspaces)
      .values({
        name: session.user.name ? `${session.user.name}'s Agency` : 'My Agency',
        slug,
      })
      .returning()

    await db.insert(workspaceMembers).values({
      workspaceId: newWs.id,
      userId,
      role: 'owner',
    })

    return {
      userId,
      userEmail,
      workspaceId: newWs.id,
      role: 'owner',
    }
  }

  return {
    userId,
    userEmail,
    workspaceId: membership.workspaceId,
    role: membership.role as 'owner' | 'admin' | 'member',
  }
}

