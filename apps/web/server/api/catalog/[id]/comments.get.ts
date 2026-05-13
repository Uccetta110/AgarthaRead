import { desc, eq, sql } from 'drizzle-orm'
import { getQuery } from 'h3'
import { getDb } from '../../../db/client'
import { comments, users } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const rawId = event.context.params?.id
  const itemId = Number.parseInt(String(rawId ?? ''), 10)

  if (!Number.isFinite(itemId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Item ID non valido'
    })
  }

  const query = getQuery(event)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  const offset = Math.max(0, Number(query.offset) || 0)

  const db = getDb()
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      rating: comments.rating,
      createdAt: comments.createdAt,
      userId: users.id,
      username: users.username,
      avatarDir: users.avatarDir,
      role: users.role
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.itemId, itemId))
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset(offset)

  const countRow = (await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.itemId, itemId)))[0]

  const total = Number(countRow?.count ?? 0)

  return {
    total,
    limit,
    offset,
    comments: rows.map((row) => ({
      id: row.id,
      body: row.body,
      rating: row.rating,
      createdAt: row.createdAt,
      user: {
        id: row.userId,
        username: row.username,
        avatarDir: row.avatarDir,
        role: row.role
      }
    }))
  }
})
