import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { eq, or } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { users, userSessions } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email: string
    username: string
    password: string
    fullName: string
  }>(event)

  const email = String(body?.email ?? '').trim().toLowerCase()
  const username = String(body?.username ?? '').trim()
  const password = String(body?.password ?? '')
  const fullName = String(body?.fullName ?? '').trim()

  if (!email || !username || !password || !fullName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tutti i campi sono obbligatori'
    })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email non valida'
    })
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La password deve contenere almeno 8 caratteri'
    })
  }

  const db = getDb()
  const existing = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1)

  if (existing.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email o username già utilizzato'
    })
  }

  const hash = await bcrypt.hash(password, 10)

  await db.insert(users).values({
    email,
    username,
    passwordHash: hash,
    fullName,
    countryCode: 'IT',
    birthDate: new Date('2000-01-01')
  })

  const userResult = await db
    .select({ id: users.id, username: users.username, email: users.email, avatarDir: users.avatarDir })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  const user = userResult[0]

  if (!user) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Errore durante la registrazione'
    })
  }

  const sessionToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.insert(userSessions).values({
    userId: user.id,
    sessionToken,
    ip: getRequestIP(event, { xForwardedFor: true }) || '0.0.0.0',
    userAgent: getHeader(event, 'user-agent') || 'unknown',
    deviceLabel: 'web',
    expiresAt
  })

  setCookie(event, 'session_token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
    maxAge: 7 * 24 * 60 * 60
  })

  return {
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_dir: user.avatarDir
    }
  }
})