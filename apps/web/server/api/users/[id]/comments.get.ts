import { eq, desc } from 'drizzle-orm'
import { getDb } from '../../../../server/db/client'
import { comments } from '../../../../server/db/schema'

export default defineEventHandler(async (event) => {
  const idRaw = event.context.params?.id
  const id = Number(Array.isArray(idRaw) ? idRaw.join('/') : idRaw)
  if (!Number.isFinite(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = getDb()
  try {
    const rows = await db.select({
      id: comments.id,
      itemId: comments.itemId,
      body: comments.body,
      createdAt: comments.createdAt
    }).from(comments).where(eq(comments.userId, id)).orderBy(desc(comments.createdAt)).limit(20)

    return { ok: true, comments: rows }
  } catch (err) {
    throw createError({ statusCode: 500, statusMessage: 'Unable to load comments' })
  }
})
