import { eq } from 'drizzle-orm'
import { getDb } from '../../../server/db/client'
import { managerPermissions, userLists, userSessions, users } from '../../../server/db/schema'
import { getSessionUser } from '../../../server/utils/session'

const ALLOWED_ROLES = ['user', 'unconfirmed', 'artist', 'manager', 'admin', 'editor', 'suspended', 'banned'] as const

function normalizePathId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return Number(decodeURIComponent(rawId))
}

async function getActorPermissions(db: ReturnType<typeof getDb>, userId: number) {
  const permissions = await db
    .select({ permissionCode: managerPermissions.permissionCode })
    .from(managerPermissions)
    .where(eq(managerPermissions.userId, userId))

  return permissions.map((permission) => permission.permissionCode)
}

export default defineEventHandler(async (event) => {
  const actor = await getSessionUser(event)
  if (!actor) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userId = normalizePathId(event.context.params?.id)
  if (!Number.isFinite(userId) || userId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const body = await readBody<{
    fullName?: string
    username?: string
    bio?: string | null
    role?: string
    suspendedUntil?: string | null
    emailVerifiedAt?: string | null
    countryCode?: string
    avatarDir?: string
    birthDate?: string
  }>(event)

  const db = getDb()
  const target = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0]
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const actorPermissions = actor.role === 'manager' ? await getActorPermissions(db, actor.id) : []
  const isAdmin = actor.role === 'admin'
  const canManageUsers = isAdmin || actorPermissions.includes('MU')

  if (!canManageUsers) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const updates: {
    fullName?: string
    username?: string
    bio?: string | null
    role?: (typeof ALLOWED_ROLES)[number]
    suspendedUntil?: Date | null
    emailVerifiedAt?: Date | null
    countryCode?: string
    avatarDir?: string
    birthDate?: Date
  } = {}

  if (typeof body?.fullName === 'string' && body.fullName.trim()) {
    updates.fullName = body.fullName.trim()
  }

  if (typeof body?.username === 'string' && body.username.trim()) {
    updates.username = body.username.trim()
  }

  if (typeof body?.bio === 'string') {
    updates.bio = body.bio.trim() || null
  }

  if (typeof body?.countryCode === 'string' && body.countryCode.trim()) {
    updates.countryCode = body.countryCode.trim().slice(0, 2).toUpperCase()
  }

  if (typeof body?.avatarDir === 'string' && body.avatarDir.trim()) {
    updates.avatarDir = body.avatarDir.trim()
  }

  if (typeof body?.birthDate === 'string' && body.birthDate.trim()) {
    const parsed = new Date(body.birthDate)
    if (Number.isNaN(parsed.getTime())) {
      throw createError({ statusCode: 400, statusMessage: 'Data di nascita non valida' })
    }
    updates.birthDate = parsed
  }

  const isManager = actor.role === 'manager'

  if (isAdmin && typeof body?.role === 'string') {
    const normalizedRole = body.role.trim().toLowerCase()
    if (!ALLOWED_ROLES.includes(normalizedRole as (typeof ALLOWED_ROLES)[number])) {
      throw createError({ statusCode: 400, statusMessage: 'Ruolo non valido' })
    }
    updates.role = normalizedRole as (typeof ALLOWED_ROLES)[number]
  } else if (typeof body?.role === 'string') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (body?.emailVerifiedAt === null) {
    updates.emailVerifiedAt = null
  } else if (typeof body?.emailVerifiedAt === 'string' && body.emailVerifiedAt.trim()) {
    const parsed = new Date(body.emailVerifiedAt)
    if (Number.isNaN(parsed.getTime())) {
      throw createError({ statusCode: 400, statusMessage: 'emailVerifiedAt non valida' })
    }
    updates.emailVerifiedAt = parsed
  }

  if (body?.suspendedUntil === null) {
    updates.suspendedUntil = null
  } else if (typeof body?.suspendedUntil === 'string' && body.suspendedUntil.trim()) {
    const parsed = new Date(body.suspendedUntil)
    if (Number.isNaN(parsed.getTime())) {
      throw createError({ statusCode: 400, statusMessage: 'suspendedUntil non valida' })
    }
    updates.suspendedUntil = parsed
  }

  if (isManager && 'role' in updates) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true, user: target }
  }

  if (updates.username) {
    const existingUsername = (await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, updates.username))
      .limit(1))[0]

    if (existingUsername && existingUsername.id !== target.id) {
      throw createError({ statusCode: 409, statusMessage: 'Username già utilizzato' })
    }
  }

  const roleAfterUpdate = updates.role ?? target.role
  const emailVerifiedAtAfterUpdate = updates.emailVerifiedAt === undefined ? target.emailVerifiedAt : updates.emailVerifiedAt
  const suspendedUntilAfterUpdate = updates.suspendedUntil === undefined ? target.suspendedUntil : updates.suspendedUntil

  await db.transaction(async (tx) => {
    await tx.update(users).set(updates).where(eq(users.id, userId))

    if (roleAfterUpdate === 'suspended' || suspendedUntilAfterUpdate) {
      await tx.update(userLists).set({ isPublic: 0 }).where(eq(userLists.userId, userId))
    }

    if (roleAfterUpdate === 'banned') {
      await tx.delete(userSessions).where(eq(userSessions.userId, userId))
    }

    if (!suspendedUntilAfterUpdate && roleAfterUpdate !== 'banned' && roleAfterUpdate !== 'suspended') {
      const restoredRole = emailVerifiedAtAfterUpdate ? 'user' : 'unconfirmed'
      if (target.role === 'suspended') {
        await tx.update(users).set({ role: restoredRole }).where(eq(users.id, userId))
      }
    }
  })

  const updated = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0]

  return {
    ok: true,
    user: updated,
  }
})
