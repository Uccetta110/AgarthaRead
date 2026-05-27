import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { catalogItems, readingProgress } from '../../../db/schema'
import { requireSessionUser } from '../../../utils/session'

function parseItemId(value: unknown) {
  const itemId = Number(Array.isArray(value) ? value[0] : value)
  if (!Number.isFinite(itemId) || itemId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid item id' })
  }
  return itemId
}

function normalizeLocator(locator: unknown) {
  const value = String(locator ?? '').trim()
  if (!value) return 'page:1'
  return value.slice(0, 120)
}

function normalizeLanguageCode(value: unknown) {
  const languageCode = String(value ?? '').trim()
  return languageCode || 'und'
}

function normalizePercentage(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, Number(numeric.toFixed(2))))
}

function toDbPercentage(value: number) {
  return Number(value).toFixed(2)
}

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const routeItemId = String(event.context.params?.id || '').trim()
  const body = await readBody<{
    itemId?: number | string
    locator?: string
    percentage?: number | string
    languageCode?: string
  }>(event)

  const itemId = parseItemId(body.itemId)
  if (!routeItemId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing book id' })
  }

  const db = getDb()
  const item = (await db
    .select({ id: catalogItems.id })
    .from(catalogItems)
    .where(and(eq(catalogItems.id, itemId), eq(catalogItems.type, 'book')))
    .limit(1))[0]

  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Book not found' })
  }

  const locator = normalizeLocator(body.locator)
  const percentage = normalizePercentage(body.percentage)
  const languageCode = normalizeLanguageCode(body.languageCode)

  const existing = (await db
    .select({
      id: readingProgress.id,
      locator: readingProgress.locator,
      percentage: readingProgress.percentage,
    })
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, user.id), eq(readingProgress.itemId, itemId)))
    .limit(1))[0]

  if (existing) {
    const existingPercentage = normalizePercentage(existing.percentage)
    const shouldAdvance = percentage > existingPercentage
    const effectivePercentage = shouldAdvance ? percentage : existingPercentage
    const effectiveLocator = shouldAdvance ? locator : normalizeLocator(existing.locator)

    await db
      .update(readingProgress)
      .set({
        locator: effectiveLocator,
        percentage: toDbPercentage(effectivePercentage),
        languageCode,
        lastReadAt: new Date()
      })
      .where(eq(readingProgress.id, existing.id))
  } else {
    await db.insert(readingProgress).values({
      userId: user.id,
      itemId,
      locator,
      percentage: toDbPercentage(percentage),
      languageCode,
      lastReadAt: new Date()
    })
  }

  const saved = (await db
    .select()
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, user.id), eq(readingProgress.itemId, itemId)))
    .limit(1))[0]

  return {
    ok: true,
    readingProgress: saved
      ? {
          locator: saved.locator,
          percentage: Number(saved.percentage ?? 0),
          languageCode: saved.languageCode,
          lastReadAt: saved.lastReadAt
        }
      : null
  }
})
