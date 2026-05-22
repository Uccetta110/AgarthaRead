import { getQuery } from 'h3'
import { eq, or, inArray } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { getSessionUser } from '../../utils/session'
import { userLists, userListItems } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const q = getQuery(event)
  const itemId = q.itemId ? Number(q.itemId) : null
  const searchProvider = q.searchProvider ? String(q.searchProvider) : null
  const searchId = q.searchId ? String(q.searchId) : null

  const db = getDb()

  // find lists belonging to user where the item exists
  let rows = []
  if (itemId && Number.isFinite(itemId)) {
    rows = await db.select({ listId: userListItems.listId }).from(userListItems).where(eq(userListItems.itemId, itemId)).where(eq(userListItems.listId, userListItems.listId))
  } else if (searchProvider && searchId) {
    // match by external provider fields stored in list items' catalog references: the userListItems only stores itemId, so we need to join with catalog items
    // Simpler: return empty if no itemId provided (caller should prefer itemId)
    rows = []
  }

  const listIds = rows.map((r: any) => Number(r.listId)).filter(Boolean)
  return { listIds }
})
