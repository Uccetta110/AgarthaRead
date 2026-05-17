import { getDb } from '../../db/client'
import { requireSessionUser } from '../../utils/session'
import { userLists } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const body = await readBody(event)
  const name = String(body?.name || '').trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Nome lista richiesto' })

  const db = getDb()
  const res = await db.insert(userLists).values({ userId: user.id, name, isPublic: body?.isPublic ? 1 : 0, description: body?.description || null, coverImage: body?.coverImage || null, tags: Array.isArray(body?.tags) ? String(body.tags.join(',')) : (body?.tags || null) })

  return { id: (res.insertId || null) }
})
