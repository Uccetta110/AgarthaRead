import { and, desc, eq, like, or} from 'drizzle-orm'
import { getDb } from '../../../server/db/client'
import { managerPermissions, userPreferences, users } from '../../../server/db/schema'
import { getSessionUser } from '../../../server/utils/session'

const ALLOWED_ROLES = ['user', 'unconfirmed', 'artist', 'manager', 'admin', 'editor', 'suspended', 'banned'] as const

function toInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function canAccessUserAdminArea(event: Parameters<typeof getSessionUser>[0]) {
  const sessionUser = await getSessionUser(event)
  if (!sessionUser) return null

  if (sessionUser.role === 'admin') return sessionUser

  if (sessionUser.role === 'manager') {
    const db = getDb()
    const permissions = await db
      .select({ permissionCode: managerPermissions.permissionCode })
      .from(managerPermissions)
      .where(eq(managerPermissions.userId, sessionUser.id))

    if (permissions.some((permission) => permission.permissionCode === 'AA')) {
      return sessionUser
    }
  }

  return null
}

export default defineEventHandler(async (event) => {
  const actor = await canAccessUserAdminArea(event)
  if (!actor) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const query = getQuery(event)
  const q = String(query.q || '').trim()
  const role = String(query.role || '').trim().toLowerCase()
  const page = Math.max(1, toInt(query.page, 1))
  const pageSize = Math.min(50, Math.max(1, toInt(query.limit, 20)))

  const conditions = []
  if (q) {
    const pattern = `%${q}%`
    conditions.push(
      or(
        like(users.username, pattern),
        like(users.fullName, pattern),
        like(users.email, pattern),
      ),
    )
  }

  if (ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
    conditions.push(eq(users.role, role as (typeof ALLOWED_ROLES)[number]))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const db = getDb()
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      countryCode: users.countryCode,
      birthDate: users.birthDate,
      avatarDir: users.avatarDir,
      bio: users.bio,
      emailVerifiedAt: users.emailVerifiedAt,
      suspendedUntil: users.suspendedUntil,
      createdAt: users.createdAt,
      accountPublic: userPreferences.accountPublic,
      listsPublicByDefault: userPreferences.listsPublicByDefault,
    })
    .from(users)
    .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
    .where(whereClause)
    .orderBy(desc(users.id))
    .limit(pageSize + 1)

  const hasMore = rows.length > pageSize
  const items = rows.slice(0, pageSize).map((row) => ({
    id: row.id,
    email: row.email,
    username: row.username,
    full_name: row.fullName,
    role: row.role,
    country_code: row.countryCode,
    birth_date: row.birthDate instanceof Date ? row.birthDate.toISOString().slice(0, 10) : row.birthDate,
    avatar: row.avatarDir,
    bio: row.bio,
    email_verified_at: row.emailVerifiedAt,
    suspended_until: row.suspendedUntil,
    created_at: row.createdAt,
    preferences: {
      account_public: row.accountPublic ?? 1,
      lists_public_by_default: row.listsPublicByDefault ?? 0,
    },
  }))

  return {
    ok: true,
    items,
    page,
    pageSize,
    hasMore,
    actor: {
      id: actor.id,
      role: actor.role,
    },
  }
})