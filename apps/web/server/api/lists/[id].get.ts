import { getDb } from '../../db/client'
import { getSessionUser, requireSessionUser } from '../../utils/session'
import { userLists, userListItems, catalogItems, catalogItemTranslations } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

function normalizePathId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

export default defineEventHandler(async (event) => {
  const id = normalizePathId(event.context.params?.id)
  const db = getDb()

  const list = (await db.select().from(userLists).where(eq(userLists.id, Number(id))).limit(1))[0]
  if (!list) throw createError({ statusCode: 404, statusMessage: 'Lista non trovata' })

  const user = await getSessionUser(event)
  if (!list.isPublic && (!user || user.id !== list.userId)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const items = await db
    .select({ ulid: userListItems.id, itemId: catalogItems.id, type: catalogItems.type, externalProvider: catalogItems.externalProvider, externalId: catalogItems.externalId, title: catalogItemTranslations.title })
    .from(userListItems)
    .leftJoin(catalogItems, eq(userListItems.itemId, catalogItems.id))
    .leftJoin(catalogItemTranslations, and(eq(catalogItemTranslations.itemId, catalogItems.id)))
    .where(eq(userListItems.listId, list.id))
    .orderBy(userListItems.position.asc(), userListItems.addedAt.desc())

  return { list, items }
})
