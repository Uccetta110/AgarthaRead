import { getDb } from '../../db/client'
import { requireSessionUser } from '../../utils/session'
import { userLists } from '../../db/schema'
import { eq } from 'drizzle-orm'

function normalizePathId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = normalizePathId(event.context.params?.id)
  const body = await readBody(event)
  const db = getDb()

  const list = (await db.select().from(userLists).where(eq(userLists.id, Number(id))).limit(1))[0]
  if (!list) throw createError({ statusCode: 404, statusMessage: 'Lista non trovata' })
  if (list.userId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (user.role === 'suspended') {
    throw createError({ statusCode: 403, statusMessage: 'Account sospeso: non puoi modificare le tue liste.' })
  }

  await db.update(userLists).set({ name: body?.name || list.name, description: body?.description ?? list.description, coverImage: body?.coverImage ?? list.coverImage, isPublic: body?.isPublic ? 1 : 0, tags: Array.isArray(body?.tags) ? String(body.tags.join(',')) : (body?.tags ?? list.tags) }).where(eq(userLists.id, list.id))

  return { ok: true }
})
