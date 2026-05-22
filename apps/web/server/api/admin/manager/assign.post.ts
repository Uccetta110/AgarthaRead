import { eq } from 'drizzle-orm'
import { getDb } from '../../../../server/db/client'
import { users, userSessions, managerPermissions } from '../../../../server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ userId: number; permissions: string[] }>(event)
  if (!body?.userId || !Array.isArray(body.permissions)) throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })

  const session_token = getCookie(event, 'session_token')
  if (!session_token || typeof session_token !== 'string') throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = getDb()
  const sessionRes = await db.select().from(userSessions).where(eq(userSessions.sessionToken, session_token)).limit(1)
  const session = sessionRes[0]
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const actorRes = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
  const actor = actorRes[0]
  if (!actor || actor.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  // set target user role to manager
  await db.update(users).set({ role: 'manager' }).where(eq(users.id, body.userId))

  // replace permissions: delete existing and insert new
  await db.delete(managerPermissions).where(eq(managerPermissions.userId, body.userId))
  const now = new Date()
  for (const p of body.permissions) {
    await db.insert(managerPermissions).values({ userId: body.userId, permissionCode: p, grantedAt: now, grantedBy: actor.id })
  }

  return { ok: true }
})
