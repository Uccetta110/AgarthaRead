import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { catalogItems, comments } from '../../../db/schema'
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
  const body = await readBody<{ body?: string; rating?: number | null }>(event)
  const text = String(body?.body ?? '').trim()
  const db = getDb()

  if (text.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'Commento troppo corto' })
  }

  if (text.length > 2000) {
    throw createError({ statusCode: 400, statusMessage: 'Commento troppo lungo' })
  }

  const item = (await db
    .select({ id: catalogItems.id })
    .from(catalogItems)
    .where(eq(catalogItems.id, itemId))
    .limit(1))[0]

  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Item not found' })
  }

  const engagement = await getItemEngagementState(db, itemId, user.id)
  if (!engagement.canComment) {
    throw createError({ statusCode: 403, statusMessage: 'Devi completare la lettura per commentare' })
  }

  const inserted = await db.insert(comments).values({
    itemId,
    userId: user.id,
    body: text,
    rating: typeof body?.rating === 'number' ? body.rating : null
  })

  const newComment = (await db
    .select({
      id: comments.id,
      body: comments.body,
      rating: comments.rating,
      createdAt: comments.createdAt
    })
    .from(comments)
    .where(eq(comments.id, Number(inserted[0].insertId)))
    .limit(1))[0]

  if (!newComment) {
    throw createError({ statusCode: 500, statusMessage: 'Unable to load created comment' })
  }

  return {
    ok: true,
    comment: {
      id: newComment.id,
      body: newComment.body,
      rating: newComment.rating,
      createdAt: newComment.createdAt,
      user: {
        id: user.id,
        username: user.username,
        avatarDir: user.avatarDir,
        role: user.role
      }
    }
  }
})