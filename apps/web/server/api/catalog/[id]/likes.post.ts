import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { catalogItems, itemLikes, readingProgress, userListItems, userLists } from '../../../db/schema'
import { requireSessionUser } from '../../../utils/session'

const READING_THRESHOLD = 10
const FAVORITES_LIST_NAME = 'Preferiti'

async function getOrCreateFavoritesList(db: ReturnType<typeof getDb>, userId: number) {
  const existing = (await db
    .select()
    .from(userLists)
    .where(and(eq(userLists.userId, userId), eq(userLists.name, FAVORITES_LIST_NAME)))
    .limit(1))[0]

  if (existing) return existing.id

  await db.insert(userLists).values({
    userId,
    name: FAVORITES_LIST_NAME,
    isSystem: 1
  })

  const created = (await db
    .select()
    .from(userLists)
    .where(and(eq(userLists.userId, userId), eq(userLists.name, FAVORITES_LIST_NAME)))
    .limit(1))[0]

  if (!created) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Impossibile creare la lista preferiti'
    })
  }

  return created.id
}

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const rawId = event.context.params?.id
  const itemId = Number.parseInt(String(rawId ?? ''), 10)

  if (!Number.isFinite(itemId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Item ID non valido'
    })
  }

  const db = getDb()
  const item = (await db
    .select()
    .from(catalogItems)
    .where(eq(catalogItems.id, itemId))
    .limit(1))[0]

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Oggetto non trovato'
    })
  }

  const progressRow = (await db
    .select()
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, user.id), eq(readingProgress.itemId, itemId)))
    .limit(1))[0]

  if (progressRow) {
    const percent = Number(progressRow.percentage ?? 0)
    if (!Number.isFinite(percent) || percent < READING_THRESHOLD) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Devi completare la lettura per mettere like'
      })
    }
  }

  const existing = (await db
    .select()
    .from(itemLikes)
    .where(and(eq(itemLikes.userId, user.id), eq(itemLikes.itemId, itemId)))
    .limit(1))[0]

  let liked = false

  if (existing) {
    await db
      .delete(itemLikes)
      .where(and(eq(itemLikes.userId, user.id), eq(itemLikes.itemId, itemId)))

    const list = (await db
      .select()
      .from(userLists)
      .where(and(eq(userLists.userId, user.id), eq(userLists.name, FAVORITES_LIST_NAME)))
      .limit(1))[0]

    if (list) {
      await db
        .delete(userListItems)
        .where(and(eq(userListItems.listId, list.id), eq(userListItems.itemId, itemId)))
    }
  } else {
    await db.insert(itemLikes).values({
      userId: user.id,
      itemId
    })

    const listId = await getOrCreateFavoritesList(db, user.id)
    await db.insert(userListItems).values({
      listId,
      itemId
    })

    liked = true
  }

  const likesRow = (await db
    .select({ count: sql<number>`count(*)` })
    .from(itemLikes)
    .where(eq(itemLikes.itemId, itemId)))[0]

  return {
    liked,
    likesCount: Number(likesRow?.count ?? 0),
    saved: liked
  }
})
