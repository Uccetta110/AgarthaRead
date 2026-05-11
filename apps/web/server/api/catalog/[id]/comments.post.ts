import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { catalogItems, comments, readingProgress } from '../../../db/schema'
import { requireSessionUser } from '../../../utils/session'

const READING_THRESHOLD = 10

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

  const body = await readBody<{ body?: string; rating?: number }>(event)
  const text = String(body?.body ?? '').trim()

  if (text.length < 3 || text.length > 2000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Commento non valido'
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
        statusMessage: 'Devi completare la lettura per commentare'
      })
    }
  }

  const rating = typeof body?.rating === 'number' && Number.isFinite(body.rating)
    ? Math.max(1, Math.min(5, Math.round(body.rating)))
    : null

  await db.insert(comments).values({
    userId: user.id,
    itemId,
    body: text,
    rating
  })

  const created = (await db
    .select()
    .from(comments)
    .where(and(eq(comments.userId, user.id), eq(comments.itemId, itemId)))
    .orderBy(desc(comments.id))
    .limit(1))[0]

  return {
    ok: true,
    comment: {
      id: created?.id ?? null,
      body: text,
      rating,
      createdAt: created?.createdAt ?? new Date(),
      user: {
        id: user.id,
        username: user.username,
        avatarDir: user.avatarDir,
        role: user.role
      }
    }
  }
})
