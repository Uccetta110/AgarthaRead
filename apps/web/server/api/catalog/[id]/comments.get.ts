import { desc, eq } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { comments, users } from '../../../db/schema'

function parseItemId(raw: string | string[] | undefined) {
  const normalized = Array.isArray(raw) ? raw.join('/') : raw
  const itemId = Number(normalized)
  if (!Number.isFinite(itemId) || itemId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid item id' })
  }
  return itemId
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.floor(parsed)
}

export default defineEventHandler(async (event) => {
  const itemId = parseItemId(event.context.params?.id)
  const query = getQuery(event)
  const limit = Math.min(parsePositiveInt(typeof query.limit === 'string' ? query.limit : undefined, 10), 50)
  const offset = parsePositiveInt(typeof query.offset === 'string' ? query.offset : undefined, 0)
  const db = getDb()

  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      rating: comments.rating,
      createdAt: comments.createdAt,
      userId: comments.userId,
      username: users.username,
      avatarDir: users.avatarDir,
      role: users.role
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(eq(comments.itemId, itemId))
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset(offset)

  const total = await db.$count(comments, eq(comments.itemId, itemId))

  return {
    ok: true,
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
    })),
    total: Number(total),
    limit,
    offset
  }
})