import { getDb } from '../../db/client'
import { getQuery } from 'h3'
import { sql } from 'drizzle-orm'
import { userLists, userListItems } from '../../db/schema'
import { requireSessionUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const publicOnly = String(query.public || 'false') === 'true'

  const db = getDb()

  if (publicOnly) {
    const lists = await db.select().from(userLists).where({ isPublic: 1 }).limit(50)
    return { lists }
  }

  const user = await requireSessionUser(event)
  const lists = await db.select().from(userLists).where({ userId: user.id }).orderBy(userLists.createdAt.desc()).limit(100)

  // attach item counts
  const enriched = await Promise.all(lists.map(async (l: any) => {
    const row = (await db.select({ cnt: sql`COUNT(*)` }).from(userListItems).where({ listId: l.id }))[0]
    const count = row?.cnt || 0
    return { ...l, itemsCount: Number(count) }
  }))

  return { lists: enriched }
})
