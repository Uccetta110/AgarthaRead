import { getDb } from '../../db/client'
import { getQuery } from 'h3'
import { desc, eq, sql } from 'drizzle-orm'
import { userLists, userListItems } from '../../db/schema'
import { requireSessionUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const publicOnly = String(query.public || 'false') === 'true'

  const db = getDb()

  if (publicOnly) {
    const lists = await db.select().from(userLists).where(eq(userLists.isPublic, 1)).limit(50)
    return { lists }
  }

  const user = await requireSessionUser(event)
  const lists = await db.select().from(userLists).where(eq(userLists.userId, user.id)).orderBy(desc(userLists.createdAt)).limit(100)

  // attach item counts
  const enriched = await Promise.all(lists.map(async (l) => {
    const row = (await db.select({ cnt: sql<number>`COUNT(*)` }).from(userListItems).where(eq(userListItems.listId, l.id)))[0]
    const count = row?.cnt || 0
    return { ...l, itemsCount: Number(count) }
  }))

  return { lists: enriched }
})
