import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { catalogItems, managerPermissions } from '../../db/schema'
import { getSessionUser } from '../../utils/session'

async function canPerform(event: Parameters<typeof getSessionUser>[0]) {
  const sessionUser = await getSessionUser(event)
  if (!sessionUser) return null
  if (sessionUser.role === 'admin') return sessionUser

  if (sessionUser.role === 'manager') {
    const db = getDb()
    const perms = await db
      .select({ code: managerPermissions.permissionCode })
      .from(managerPermissions)
      .where(eq(managerPermissions.userId, sessionUser.id))

    if (perms.some((p) => p.code === 'EI')) return sessionUser
  }

  return null
}

export default defineEventHandler(async (event) => {
  const actor = await canPerform(event)
  if (!actor) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const params = getRouterParams(event)
  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = getDb()
  await db.delete(catalogItems).where(eq(catalogItems.id, id))

  return { ok: true }
})
