import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db, users, workspaces, workspaceMembers } from '@tracksentinel/db'
import { eq } from 'drizzle-orm'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  fullName: z.string().min(1).max(100).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password, fullName } = parsed.data
    const normalizedEmail = email.toLowerCase()

    // Check if email already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)

    if (existing) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 409 })
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user + workspace in a transaction
    const result = await db.transaction(async (tx) => {
      // Create user
      const [user] = await tx
        .insert(users)
        .values({ email: normalizedEmail, passwordHash, fullName: fullName ?? null })
        .returning({ id: users.id, email: users.email })

      // Generate workspace slug from email
      const baseSlug = normalizedEmail.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase()
      const slug = `${baseSlug}-${user.id.substring(0, 8)}`

      // Create default workspace
      const [workspace] = await tx
        .insert(workspaces)
        .values({
          name: fullName ? `${fullName}'s Workspace` : `${baseSlug}'s Workspace`,
          slug,
        })
        .returning({ id: workspaces.id })

      // Make user the owner
      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: 'owner',
      })

      return { userId: user.id, workspaceId: workspace.id }
    })

    return NextResponse.json(
      { message: 'Account created successfully.', ...result },
      { status: 201 }
    )
  } catch (error) {
    console.error('[register] Error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
