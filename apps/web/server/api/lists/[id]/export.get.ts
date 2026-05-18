import { getDb } from '../../../db/client'
import { getSessionUser } from '../../../utils/session'
import { userLists, userListItems, catalogItems, catalogItemTranslations, itemMedia } from '../../../db/schema'
import { asc, desc, eq, inArray } from 'drizzle-orm'
import { setHeader } from 'h3'

function normalizePathId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

export default defineEventHandler(async (event) => {
  const id = normalizePathId(event.context.params?.id)
  const db = getDb()

  const list = (await db.select().from(userLists).where(eq(userLists.id, Number(id))).limit(1))[0]
  if (!list) {
    throw createError({ statusCode: 404, statusMessage: 'Lista non trovata' })
  }

  const user = await getSessionUser(event)
  const isOwner = !!user && user.id === list.userId
  if (!list.isPublic && !isOwner) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const items = await db
    .select({
      itemId: catalogItems.id,
      type: catalogItems.type,
      searchProvider: catalogItems.searchProvider,
      searchId: catalogItems.searchId,
      contentProvider: catalogItems.contentProvider,
      contentId: catalogItems.contentId,
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

  const uniqueItems = new Map<number, (typeof items)[number] & { cover: string | null }>()
  for (const item of items) {
    if (!item.itemId || uniqueItems.has(item.itemId)) continue
    uniqueItems.set(item.itemId, {
      ...item,
      cover: coverByItemId.get(item.itemId) || null
    })
  }

  const payload = {
    list: {
      id: list.id,
      name: list.name,
      description: list.description,
      coverImage: list.coverImage,
      isPublic: !!list.isPublic,
      tags: list.tags,
      userId: list.userId,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt
    },
    items: Array.from(uniqueItems.values())
  }

  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="list-${list.id}.json"`)

  return payload
})