import { eq } from 'drizzle-orm'
import { getDb } from '../../../server/db/client'
import { users, userPreferences, userLists } from '../../../server/db/schema'
import { getSessionUser } from '../../../server/utils/session'

export default defineEventHandler(async (event) => {
  const idRaw = event.context.params?.id
  const id = Number(Array.isArray(idRaw) ? idRaw.join('/') : idRaw)
  if (!Number.isFinite(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = getDb()
  const row = (await db.select({
    id: users.id,
    username: users.username,
    fullName: users.fullName,
    avatarDir: users.avatarDir,
    bio: users.bio,
    role: users.role,
    createdAt: users.createdAt
  }).from(users).where(eq(users.id, id)).limit(1))[0]

  if (!row) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const prefs = (await db.select().from(userPreferences).where(eq(userPreferences.userId, id)).limit(1))[0]

  const sessionUser = await getSessionUser(event)
  const isOwner = sessionUser && sessionUser.id === id
  const isPrivileged = sessionUser && (sessionUser.role === 'admin' || sessionUser.role === 'manager')

  const accountPublic = prefs?.accountPublic === undefined ? 1 : Number(prefs.accountPublic)
  if (!isOwner && !isPrivileged && accountPublic !== 1) {
    throw createError({ statusCode: 403, statusMessage: 'Profile not public' })
  }

  // fetch public lists for this user
  const lists = await db.select().from(userLists).where(eq(userLists.userId, id)).where(eq(userLists.isPublic, 1)).limit(50)

  return {
    ok: true,
    user: row,
    preferences: {
      image_size: prefs?.imageSize ?? 'medium',
      account_public: accountPublic,
      lists_public_by_default: prefs?.listsPublicByDefault ?? 0
    },
    lists
  }
})
