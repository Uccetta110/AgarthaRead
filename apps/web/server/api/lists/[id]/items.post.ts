import { getDb } from '../../../db/client'
import { requireSessionUser } from '../../../utils/session'
import { userLists, userListItems } from '../../../db/schema'
import { upsertExternalCatalogItem } from '../../../utils/catalog'
import { eq, sql } from 'drizzle-orm'

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

  let itemId = Number(body?.itemId || 0)
  if (!itemId) {
    // expect external data
    const type = String(body?.item_type || 'book') as any
    const externalProvider = String(body?.external_provider || '').trim()
    const externalId = String(body?.external_id || '').trim()
    if (!externalProvider || !externalId) throw createError({ statusCode: 400, statusMessage: 'Missing external source' })
    itemId = await upsertExternalCatalogItem(db, {
      type,
      externalProvider,
      externalId,
      title: String(body?.title || 'Untitled'),
      description: body?.description || null,
      language: body?.language || null,
      coverUrl: body?.coverUrl || null,
      contentFormat: body?.contentFormat || undefined,
      contentPath: body?.contentPath || null
    })
  }

  // compute next position
  const row = (await db.select({ maxPos: sql`COALESCE(MAX(position),0)` }).from(userListItems).where(eq(userListItems.listId, list.id)))[0]
  const nextPos = (row?.maxPos || 0) + 1

  try {
    await db.insert(userListItems).values({ listId: list.id, itemId: Number(itemId), position: nextPos })
  } catch (e: any) {
    // ignore duplicates
  }

  return { ok: true }
})
