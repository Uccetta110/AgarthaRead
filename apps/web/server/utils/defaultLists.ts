import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import type { Db } from '../db/client'
import { userLists } from '../db/schema'

export const DEFAULT_FAVORITES_LISTS = [
  { key: 'books', name: 'Libri preferiti' },
  { key: 'manga', name: 'Manga preferiti' },
  { key: 'news', name: 'News preferiti' }
] as const


export function getDefaultFavoritesListName(itemType?: string | null) {
  const normalized = String(itemType || '').trim().toLowerCase()
  if (normalized === 'manga') return 'Manga preferiti'
  if (normalized === 'news' || normalized === 'newspaper' || normalized === 'newspapers') return 'News preferiti'
  return 'Libri preferiti'
}

export async function ensureDefaultFavoritesLists(db: Db, userId: number) {
  const existing = await db
    .select({ name: userLists.name })
    .from(userLists)
    .where(eq(userLists.userId, userId))

  const existingNames = new Set(existing.map((row) => String(row.name)))
  const missing = DEFAULT_FAVORITES_LISTS.filter((list) => !existingNames.has(list.name))

  if (missing.length === 0) {
    return
  }

  await db.insert(userLists).values(
    missing.map((list) => ({
      userId,
      name: list.name,
      isPublic: 0,
      isSystem: 1
    }))
  )
}

export async function getOrCreateDefaultFavoritesList(db: Db, userId: number, itemType?: string | null) {
  const name = getDefaultFavoritesListName(itemType)
  const existing = (await db
    .select()
    .from(userLists)
    .where(and(eq(userLists.userId, userId), eq(userLists.name, name)))
    .limit(1))[0]

  if (existing) {
    return existing.id
  }

  await db.insert(userLists).values({
    userId,
    name,
    isPublic: 0,
    isSystem: 1
  })

  const created = (await db
    .select()
    .from(userLists)
    .where(and(eq(userLists.userId, userId), eq(userLists.name, name)))
    .limit(1))[0]

  if (!created) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Impossibile creare la lista preferiti'
    })
  }

  return created.id
}