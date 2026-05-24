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

  if (user.role === 'suspended') throw createError({ statusCode: 403, statusMessage: 'Account sospeso: non puoi modificare le tue liste.' })

  let itemId = Number(body?.itemId || 0)
  if (!itemId) {
    // expect external data
    const type = String(body?.item_type || 'book') as any
    const searchProvider = String(body?.search_provider || body?.searchProvider || body?.external_provider || body?.externalProvider || '').trim()
    const searchId = String(body?.search_id || body?.searchId || body?.external_id || body?.externalId || '').trim()
    const contentProvider = String(body?.content_provider || body?.contentProvider || '').trim()
    const contentId = String(body?.content_id || body?.contentId || '').trim()
    if (!searchProvider || !searchId) throw createError({ statusCode: 400, statusMessage: 'Missing external source' })
    itemId = await upsertExternalCatalogItem(db, {
      type,
      searchProvider,
      searchId,
      contentProvider: contentProvider || undefined,
      contentId: contentId || undefined,
      externalProvider: searchProvider,
      externalId: searchId,
      releaseDate: body?.releaseDate || body?.publishedAt || null,
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
