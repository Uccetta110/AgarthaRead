import type { Db } from '../db/client'
import { userLists, userListItems } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function getListById(db: Db, id: number) {
  return (await db.select().from(userLists).where(eq(userLists.id, id)).limit(1))[0]
}

export async function userOwnsList(db: Db, userId: number, listId: number) {
  const list = await getListById(db, listId)
  return !!list && list.userId === userId
}

export async function reorderItems(db: Db, listId: number, order: Array<{ itemId: number; position: number }>) {
  for (const entry of order) {
    await db.update(userListItems).set({ position: entry.position }).where(eq(userListItems.listId, listId), eq(userListItems.itemId, entry.itemId))
  }
}

export default { getListById, userOwnsList, reorderItems }
