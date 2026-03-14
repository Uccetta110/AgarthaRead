import { getDb } from '../../db/client'
import { catalogItems } from '../../db/schema'

export default defineEventHandler(async () => {
  const db = getDb()
  const items = await db.select().from(catalogItems).limit(20)
  return { items }
})