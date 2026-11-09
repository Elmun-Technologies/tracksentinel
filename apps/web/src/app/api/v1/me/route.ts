import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { db, workspaces, workspaceMembers, users } from '@tracksentinel/db'
import { eq } from 'drizzle-orm'

export async function GET() {
  const auth = await getAuthContext()
  if (auth instanceof NextResponse) return auth

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.id, auth.userId))
    .limit(1)

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, auth.workspaceId))
    .limit(1)

  return NextResponse.json({
    user,
    workspace,
    role: auth.role,
  })
}

