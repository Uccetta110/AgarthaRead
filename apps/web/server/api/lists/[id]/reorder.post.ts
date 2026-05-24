import { getDb } from '../../../db/client'
import { requireSessionUser } from '../../../utils/session'
import { userLists } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { reorderItems, getListById } from '../../../repositories/lists'

function normalizePathId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = Number(normalizePathId(event.context.params?.id))
  const body = await readBody(event)
  const db = getDb()

  const list = await getListById(db, id)
  if (!list) throw createError({ statusCode: 404, statusMessage: 'Lista non trovata' })
  if (list.userId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (user.role === 'suspended') throw createError({ statusCode: 403, statusMessage: 'Account sospeso: non puoi modificare le tue liste.' })

  // Accept body as array of ids [itemId, ...] or array of objects [{itemId, position}]
  let order: Array<{ itemId: number; position: number }> = []
  if (Array.isArray(body)) {
    if (body.length === 0) return { ok: true }
    if (typeof body[0] === 'number') {
      order = (body as number[]).map((itemId, idx) => ({ itemId: Number(itemId), position: idx + 1 }))
    } else {
      order = (body as any[]).map((e, idx) => ({ itemId: Number(e.itemId), position: Number(e.position ?? (idx + 1)) }))
    }
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }

  await reorderItems(db, id, order)
  return { ok: true }
})
