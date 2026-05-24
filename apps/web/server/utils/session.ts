import { createError } from 'h3'
import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { userSessions, users } from '../db/schema'

export async function getSessionUser(event: H3Event) {
  const sessionToken = getCookie(event, 'session_token')
  if (!sessionToken || typeof sessionToken !== 'string') return null

  const db = getDb()
  const session = (await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.sessionToken, sessionToken))
    .limit(1))[0]

  if (!session || session.expiresAt < new Date()) return null

  const user = (await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1))[0]

  return user ?? null
}

export async function requireSessionUser(event: H3Event) {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }
  // Banned users cannot access the system
  if (user.role === 'banned') {
    throw createError({ statusCode: 403, statusMessage: 'Utente bannato. Contatta supporto@agartharead.local per assistenza.' })
  }

  // Handle suspended expiration: if suspended_until passed, restore role based on email verification
  if (user.role === 'suspended') {
    const now = new Date()
    if (user.suspendedUntil && now >= user.suspendedUntil) {
      const db = getDb()
      const newRole = user.emailVerifiedAt ? 'user' : 'unconfirmed'
      await db.update(users).set({ role: newRole }).where(eq(users.id, user.id))
      const refreshed = (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0]
      return refreshed ?? user
    }
  }

  return user
}
