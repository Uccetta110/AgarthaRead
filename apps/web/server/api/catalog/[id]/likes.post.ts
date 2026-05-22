import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { catalogItems, itemLikes } from '../../../db/schema'
import { getItemEngagementState } from '../../../utils/engagement'
import { requireSessionUser } from '../../../utils/session'

function parseItemId(raw: string | string[] | undefined) {
  const normalized = Array.isArray(raw) ? raw.join('/') : raw
  const itemId = Number(normalized)
  if (!Number.isFinite(itemId) || itemId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid item id' })
  }
  return itemId
}

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const itemId = parseItemId(event.context.params?.id)
  const db = getDb()

  const item = (await db
    .select({ id: catalogItems.id })
    .from(catalogItems)
    .where(eq(catalogItems.id, itemId))
    .limit(1))[0]

  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Item not found' })
  }

  const engagement = await getItemEngagementState(db, itemId, user.id)
  if (!engagement.canLike) {
    throw createError({ statusCode: 403, statusMessage: 'Devi completare la lettura per mettere like' })
  }

  const existing = (await db
    .select({ userId: itemLikes.userId })
    .from(itemLikes)
    .where(and(eq(itemLikes.itemId, itemId), eq(itemLikes.userId, user.id)))
    .limit(1))[0]

  if (existing) {
    await db
      .delete(itemLikes)
      .where(and(eq(itemLikes.itemId, itemId), eq(itemLikes.userId, user.id)))
  } else {
    await db.insert(itemLikes).values({ itemId, userId: user.id })
  }

  const likesRow = (await db
    .select({ count: sql<number>`count(*)` })
    .from(itemLikes)
    .where(eq(itemLikes.itemId, itemId)))[0]

  return {
    ok: true,
    liked: !existing,
    likesCount: Number(likesRow?.count ?? 0)
  }
})