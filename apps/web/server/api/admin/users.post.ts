import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { eq, or } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { authChallenges, users, userPreferences, userSessions } from '../../db/schema'
import { ensureDefaultFavoritesLists } from '../../utils/defaultLists'
import { getSessionUser } from '../../utils/session'

const ALLOWED_ROLES = ['user', 'unconfirmed', 'artist', 'manager', 'admin', 'editor', 'suspended', 'banned'] as const

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export default defineEventHandler(async (event) => {
  const actor = await getSessionUser(event)
  if (!actor) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (actor.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody<{
    email?: string
    username?: string
    password?: string
    fullName?: string
    role?: (typeof ALLOWED_ROLES)[number]
    countryCode?: string
    birthDate?: string
    avatarDir?: string | null
    bio?: string | null
    emailVerifiedAt?: string | null
    suspendedUntil?: string | null
    twoFactorMethod?: 'none' | 'email' | 'totp'
  }>(event)

  const email = String(body?.email ?? '').trim().toLowerCase()
  const username = String(body?.username ?? '').trim()
  const password = String(body?.password ?? '')
  const fullName = String(body?.fullName ?? '').trim()
  const role = (body?.role && ALLOWED_ROLES.includes(body.role) ? body.role : 'user')
  const countryCode = String(body?.countryCode ?? 'IT').trim().slice(0, 2).toUpperCase() || 'IT'
  const birthDate = String(body?.birthDate ?? '').trim()
  const avatarDir = normalizeOptionalString(body?.avatarDir) ?? '1.png'
  const bio = normalizeOptionalString(body?.bio)
  const twoFactorMethod = body?.twoFactorMethod && ['none', 'email', 'totp'].includes(body.twoFactorMethod)
    ? body.twoFactorMethod
    : 'none'

  if (!email || !username || !password || !fullName || !birthDate) {
    throw createError({ statusCode: 400, statusMessage: 'Tutti i campi obbligatori devono essere compilati' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Email non valida' })
  }

  if (username.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'Username troppo corto' })
  }

  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'La password deve contenere almeno 8 caratteri' })
  }

  const parsedBirthDate = new Date(birthDate)
  if (Number.isNaN(parsedBirthDate.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Data di nascita non valida' })
  }

  const emailVerifiedAt = body?.emailVerifiedAt === undefined
    ? new Date()
    : body.emailVerifiedAt === null
      ? null
      : new Date(body.emailVerifiedAt)

  if (emailVerifiedAt && Number.isNaN(emailVerifiedAt.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'emailVerifiedAt non valida' })
  }

  const suspendedUntil = body?.suspendedUntil === undefined
    ? null
    : body.suspendedUntil === null
      ? null
      : new Date(body.suspendedUntil)

  if (suspendedUntil && Number.isNaN(suspendedUntil.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'suspendedUntil non valida' })
  }

  const db = getDb()
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1)

  if (existing.length > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Email o username già utilizzato' })
  }

  const hash = await bcrypt.hash(password, 10)

  const created = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(users)
      .values({
        email,
        username,
        passwordHash: hash,
        fullName,
        role,
        countryCode,
        birthDate: parsedBirthDate,
        avatarDir,
        bio,
        emailVerifiedAt,
        twoFactorMethod,
        suspendedUntil,
      })

    const userId = Number(inserted[0]?.insertId || 0)
    if (!userId) {
      throw createError({ statusCode: 500, statusMessage: 'Creazione utente fallita' })
    }

    await tx.insert(userPreferences).values({
      userId,
      theme: 'light',
      fontSize: 16,
      imageSize: 'medium',
      uiLanguage: 'it',
      accountPublic: 1,
      listsPublicByDefault: 0,
    })

    await ensureDefaultFavoritesLists(tx, userId)

    return userId
  })

  const user = (await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      avatarDir: users.avatarDir,
      role: users.role,
      countryCode: users.countryCode,
      birthDate: users.birthDate,
      bio: users.bio,
      emailVerifiedAt: users.emailVerifiedAt,
      suspendedUntil: users.suspendedUntil,
      twoFactorMethod: users.twoFactorMethod,
    })
    .from(users)
    .where(eq(users.id, created))
    .limit(1))[0]

  return {
    ok: true,
    user,
  }
})
