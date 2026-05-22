import { eq } from 'drizzle-orm'
import { getDb } from '../../../../../server/db/client'
import { artistRequests, userSessions, users } from '../../../../../server/db/schema'

export default defineEventHandler(async (event) => {
  const id = Number(event.context.params?.id)
  const body = await readBody<{ action: 'approve' | 'reject' }>(event)
  if (!id || !body?.action) throw createError({ statusCode: 400, statusMessage: 'Invalid request' })

  const session_token = getCookie(event, 'session_token')
  if (!session_token || typeof session_token !== 'string') throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = getDb()
  const sessionRes = await db.select().from(userSessions).where(eq(userSessions.sessionToken, session_token)).limit(1)
  const session = sessionRes[0]
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const userRes = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
  const actor = userRes[0]
  if (!actor) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  // Only admin or manager with AA permission allowed
  let allowed = false
  if (actor.role === 'admin') allowed = true
  if (actor.role === 'manager') {
    const { managerPermissions } = await import('../../../../../server/db/schema')
    const perms = await db.select().from(managerPermissions).where(eq(managerPermissions.userId, actor.id))
    if (perms.some(p => p.permissionCode === 'AA')) allowed = true
  }
  if (!allowed) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const reqRes = await db.select().from(artistRequests).where(eq(artistRequests.id, id)).limit(1)
  const request = reqRes[0]
  if (!request) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  if (body.action === 'approve') {
    await db.update(artistRequests).set({ status: 'approved', processedBy: actor.id, processedAt: new Date() }).where(eq(artistRequests.id, id))
    // promote user to artist
    await db.update(users).set({ role: 'artist' }).where(eq(users.id, request.userId))
  } else {
    await db.update(artistRequests).set({ status: 'rejected', processedBy: actor.id, processedAt: new Date() }).where(eq(artistRequests.id, id))
  }

  return { ok: true }
})
