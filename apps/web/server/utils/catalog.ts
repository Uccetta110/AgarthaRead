import { and, eq, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { catalogItems, catalogItemTranslations, itemMedia } from '../db/schema'

type CatalogItemType = 'book' | 'comic' | 'manga' | 'newspaper'

type ContentFormat = 'txt' | 'html_like' | 'markdown' | 'image_sequence'

type ExternalCatalogInput = {
  type: CatalogItemType
  externalProvider: string
  externalId: string
  title: string
  description?: string | null
  language?: string | null
  coverUrl?: string | null
  contentFormat?: ContentFormat
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

export async function upsertExternalCatalogItem(db: Db, input: ExternalCatalogInput) {
  const externalProvider = String(input.externalProvider || '').trim()
  const externalId = String(input.externalId || '').trim()
  const title = String(input.title || '').trim() || 'Titolo non disponibile'

  if (!externalProvider || !externalId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dati sorgente non validi'
    })
  }

  const existing = (await db
    .select()
    .from(catalogItems)
    .where(
      and(
        eq(catalogItems.source, 'api'),
        eq(catalogItems.type, input.type),
        eq(catalogItems.externalProvider, externalProvider),
        eq(catalogItems.externalId, externalId)
      )
    )
    .limit(1))[0]

  if (!existing) {
    await db.insert(catalogItems).values({
      type: input.type,
      source: 'api',
      externalProvider,
      externalId,
      price: '0.00',
      currency: 'EUR'
    })
  } else {
    await db
      .update(catalogItems)
      .set({ updatedAt: new Date() })
      .where(eq(catalogItems.id, existing.id))
  }

  const item = existing ?? (await db
    .select()
    .from(catalogItems)
    .where(
      and(
        eq(catalogItems.source, 'api'),
        eq(catalogItems.type, input.type),
        eq(catalogItems.externalProvider, externalProvider),
        eq(catalogItems.externalId, externalId)
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
        contentFormat
      })
      .where(eq(catalogItemTranslations.id, existingTranslation.id))
  } else {
    await db.insert(catalogItemTranslations).values({
      itemId: item.id,
      languageCode,
      title,
      description,
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
