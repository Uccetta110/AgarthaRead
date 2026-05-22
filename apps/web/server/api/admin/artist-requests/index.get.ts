import { eq, desc } from 'drizzle-orm'
import { getDb } from '../../../../server/db/client'
import { artistRequests, userSessions, users, managerPermissions } from '../../../../server/db/schema'

export default defineEventHandler(async (event) => {
  const session_token = getCookie(event, 'session_token')
  if (!session_token || typeof session_token !== 'string') return createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = getDb()
  const sessionRes = await db.select().from(userSessions).where(eq(userSessions.sessionToken, session_token)).limit(1)
  const session = sessionRes[0]
  if (!session) return createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const userRes = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
  const user = userRes[0]
  if (!user) return createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  // Admin can access; managers need AA permission
  let allowed = false
  if (user.role === 'admin') allowed = true
  if (user.role === 'manager') {
    const perms = await db.select().from(managerPermissions).where(eq(managerPermissions.userId, user.id))
    if (perms.some(p => p.permissionCode === 'AA')) allowed = true
  }
  if (!allowed) return createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const reqs = await db.select().from(artistRequests).orderBy(desc(artistRequests.createdAt))
  return { ok: true, requests: reqs }
})
