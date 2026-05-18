import { and, eq, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { catalogItems, catalogItemTranslations, itemMedia } from '../db/schema'

type CatalogItemType = 'book' | 'comic' | 'manga' | 'newspaper'

type ContentFormat = 'txt' | 'html_like' | 'markdown' | 'image_sequence'

type ExternalCatalogInput = {
  type: CatalogItemType
  searchProvider?: string
  searchId?: string
  contentProvider?: string | null
  contentId?: string | null
  externalProvider: string
  externalId: string
  releaseDate?: string | Date | null
  title: string
  description?: string | null
  language?: string | null
  coverUrl?: string | null
  contentFormat?: ContentFormat
  contentPath?: string | null
}

const DEFAULT_LANGUAGE_CODE = 'und'
const DEFAULT_CONTENT_FORMAT: ContentFormat = 'txt'

function normalizeLanguageCode(value?: string | null) {
  const trimmed = String(value ?? '').trim()
  return trimmed || DEFAULT_LANGUAGE_CODE
}

function guessMimeType(url: string) {
  const lower = url.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

function normalizeSourceValue(value?: string | null) {
  return String(value ?? '').trim()
}

function normalizeReleaseDate(value?: string | Date | null) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  const trimmed = String(value).trim()
  if (!trimmed) return null
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

export async function upsertExternalCatalogItem(db: Db, input: ExternalCatalogInput) {
  const searchProvider = normalizeSourceValue(input.searchProvider || input.externalProvider)
  const searchId = normalizeSourceValue(input.searchId || input.externalId)
  const contentProvider = normalizeSourceValue(input.contentProvider) || searchProvider
  const contentId = normalizeSourceValue(input.contentId) || searchId
  const releaseDate = normalizeReleaseDate(input.releaseDate)
  const title = String(input.title || '').trim() || 'Titolo non disponibile'

  if (!searchProvider || !searchId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dati sorgente non validi'
    })
  }

  const existingBySearch = (await db
    .select()
    .from(catalogItems)
    .where(
      and(
        eq(catalogItems.source, 'api'),
        eq(catalogItems.type, input.type),
        eq(catalogItems.searchProvider, searchProvider),
        eq(catalogItems.searchId, searchId)
      )
    )
    .limit(1))[0]

  const existingByContent = contentProvider && contentId && (contentProvider !== searchProvider || contentId !== searchId)
    ? (await db
        .select()
        .from(catalogItems)
        .where(
          and(
            eq(catalogItems.source, 'api'),
            eq(catalogItems.type, input.type),
            eq(catalogItems.contentProvider, contentProvider),
            eq(catalogItems.contentId, contentId)
          )
        )
        .limit(1))[0]
    : null

  const existing = existingBySearch ?? existingByContent

  if (!existing) {
    await db.insert(catalogItems).values({
      type: input.type,
      source: 'api',
      searchProvider,
      searchId,
      contentProvider,
      contentId,
      releaseDate,
      price: '0.00',
      currency: 'EUR'
    })
  } else {
    await db
      .update(catalogItems)
      .set({
        searchProvider,
        searchId,
        contentProvider,
        contentId,
        releaseDate,
        updatedAt: new Date()
      })
      .where(eq(catalogItems.id, existing.id))
  }

  const item = existing ?? (await db
    .select()
    .from(catalogItems)
    .where(
      and(
        eq(catalogItems.source, 'api'),
        eq(catalogItems.type, input.type),
        eq(catalogItems.searchProvider, searchProvider),
        eq(catalogItems.searchId, searchId)
      )
    )
    .limit(1))[0]

  if (!item) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Impossibile salvare il catalogo'
    })
  }

  const languageCode = normalizeLanguageCode(input.language)
  const description = input.description?.trim() || null
  const contentFormat = input.contentFormat || DEFAULT_CONTENT_FORMAT
  const contentPath = input.contentPath?.trim() || null

  const existingTranslation = (await db
    .select()
    .from(catalogItemTranslations)
    .where(
      and(
        eq(catalogItemTranslations.itemId, item.id),
        eq(catalogItemTranslations.languageCode, languageCode)
      )
    )
    .limit(1))[0]

  if (existingTranslation) {
    await db
      .update(catalogItemTranslations)
      .set({
        title,
        description,
        contentPath,
        contentFormat
      })
      .where(eq(catalogItemTranslations.id, existingTranslation.id))
  } else {
    await db.insert(catalogItemTranslations).values({
      itemId: item.id,
      languageCode,
      title,
      description,
      contentPath,
      contentFormat
    })
  }

  if (input.coverUrl) {
    const existingCover = (await db
      .select()
      .from(itemMedia)
      .where(
        and(
          eq(itemMedia.itemId, item.id),
          eq(itemMedia.mediaType, 'cover')
        )
      )
      .limit(1))[0]

    const mimeType = guessMimeType(input.coverUrl)

    if (existingCover) {
      await db
        .update(itemMedia)
        .set({
          storagePath: input.coverUrl,
          mimeType
        })
        .where(eq(itemMedia.id, existingCover.id))
    } else {
      await db.insert(itemMedia).values({
        itemId: item.id,
        mediaType: 'cover',
        storagePath: input.coverUrl,
        mimeType,
        sortOrder: 0
      })
    }
  }

  return item.id
}

export async function incrementCatalogItemViews(db: Db, itemId: number) {
  await db
    .update(catalogItems)
    .set({ viewsCount: sql`${catalogItems.viewsCount} + 1` })
    .where(eq(catalogItems.id, itemId))
}