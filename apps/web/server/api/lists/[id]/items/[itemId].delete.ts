import { getDb } from '../../../../db/client'
import { requireSessionUser } from '../../../../utils/session'
import { userLists, userListItems } from '../../../../db/schema'
import { eq } from 'drizzle-orm'

function normalizePathId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const listId = normalizePathId(event.context.params?.id)
  const itemId = normalizePathId(event.context.params?.itemId)
  const db = getDb()

  const list = (await db.select().from(userLists).where(eq(userLists.id, Number(listId))).limit(1))[0]
  if (!list) throw createError({ statusCode: 404, statusMessage: 'Lista non trovata' })
  if (list.userId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  await db.delete(userListItems).where(eq(userListItems.listId, list.id), eq(userListItems.itemId, Number(itemId)))
  return { ok: true }
})
