import { getDb } from '../../db/client'
import { getSessionUser, requireSessionUser } from '../../utils/session'
import { userLists, userListItems, catalogItems, catalogItemTranslations, itemMedia } from '../../db/schema'
import { asc, desc, eq, inArray } from 'drizzle-orm'

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
    .select({
      ulid: userListItems.id,
      itemId: catalogItems.id,
      type: catalogItems.type,
      searchProvider: catalogItems.searchProvider,
      searchId: catalogItems.searchId,
      contentProvider: catalogItems.contentProvider,
      contentId: catalogItems.contentId,
      externalProvider: catalogItems.searchProvider,
      externalId: catalogItems.searchId,
      title: catalogItemTranslations.title
    })
    .from(userListItems)
    .leftJoin(catalogItems, eq(userListItems.itemId, catalogItems.id))
    .leftJoin(catalogItemTranslations, eq(catalogItemTranslations.itemId, catalogItems.id))
    .where(eq(userListItems.listId, list.id))
    .orderBy(asc(userListItems.position), desc(userListItems.addedAt))

  const itemIds = items.map((item) => item.itemId).filter((itemId): itemId is number => Number.isFinite(itemId))
  const coverRows = itemIds.length === 0
    ? []
    : await db
        .select({ itemId: itemMedia.itemId, storagePath: itemMedia.storagePath })
        .from(itemMedia)
        .where(inArray(itemMedia.itemId, itemIds))
        .orderBy(asc(itemMedia.sortOrder), desc(itemMedia.id))

  const coverByItemId = new Map<number, string>()
  for (const row of coverRows) {
    if (!coverByItemId.has(row.itemId)) {
      coverByItemId.set(row.itemId, row.storagePath)
    }
  }

  const itemsById = new Map<number, (typeof items)[number]>()
  for (const item of items) {
    if (!item.itemId || itemsById.has(item.itemId)) continue
    itemsById.set(item.itemId, {
      ...item,
      cover: coverByItemId.get(item.itemId) || null
    })
  }

  const itemsWithCover = Array.from(itemsById.values())

  return { list, items: itemsWithCover }
})
