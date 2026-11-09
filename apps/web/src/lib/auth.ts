import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db, users, workspaceMembers } from '@tracksentinel/db'
import { eq } from 'drizzle-orm'
import { authConfig } from './auth.config'

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1)

        if (!user) return null

        const passwordMatches = await bcrypt.compare(password, user.passwordHash)
        if (!passwordMatches) return null

        // Get user's active workspace membership
        const [membership] = await db
          .select({ workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, user.id))
          .limit(1)

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          workspaceId: membership?.workspaceId ?? null,
          role: membership?.role ?? null,
        }
      },
    }),
  ],
})
