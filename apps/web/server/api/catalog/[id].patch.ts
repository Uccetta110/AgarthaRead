import { and, eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { catalogItemTranslations, catalogItems, itemMedia, managerPermissions } from '../../db/schema'
import { getSessionUser } from '../../utils/session'

function normalizePathId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return Number(decodeURIComponent(rawId))
}

async function getActorPermissions(db: ReturnType<typeof getDb>, userId: number) {
  const permissions = await db
    .select({ permissionCode: managerPermissions.permissionCode })
    .from(managerPermissions)
    .where(eq(managerPermissions.userId, userId))

  return permissions.map((permission) => permission.permissionCode)
}

function guessMimeType(url: string) {
  const lower = url.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

function normalizeLanguageCode(value?: string | null) {
  const trimmed = String(value ?? '').trim()
  return trimmed || 'und'
}

export default defineEventHandler(async (event) => {
  const actor = await getSessionUser(event)
  if (!actor) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = getDb()
  const actorPermissions = actor.role === 'manager' ? await getActorPermissions(db, actor.id) : []
  const canEdit = actor.role === 'admin' || actorPermissions.includes('MI')
  if (!canEdit) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = normalizePathId(event.context.params?.id)
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const body = await readBody<{
    title?: string
    description?: string | null
    coverUrl?: string | null
    ageRatingMin?: number
    languageCode?: string
    releaseDate?: string | null
    publisherId?: number | null
    price?: string | number
    currency?: string
    isbn?: string | null
  }>(event)

  const target = (await db.select().from(catalogItems).where(eq(catalogItems.id, id)).limit(1))[0]
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Item not found' })
  }

  const updates: {
    ageRatingMin?: number
    releaseDate?: Date | null
    publisherId?: number | null
    price?: string
    currency?: string
    isbn?: string | null
  } = {}

  if (typeof body?.ageRatingMin === 'number' && Number.isFinite(body.ageRatingMin) && body.ageRatingMin >= 0) {
    updates.ageRatingMin = Math.min(18, Math.floor(body.ageRatingMin))
  }

  if (typeof body?.releaseDate === 'string') {
    const trimmed = body.releaseDate.trim()
    if (trimmed) {
      const parsed = new Date(trimmed)
      if (Number.isNaN(parsed.getTime())) {
        throw createError({ statusCode: 400, statusMessage: 'releaseDate non valida' })
      }
      updates.releaseDate = parsed
    } else {
      updates.releaseDate = null
    }
  }

  if (typeof body?.publisherId === 'number') {
    updates.publisherId = Number.isFinite(body.publisherId) && body.publisherId > 0 ? Math.floor(body.publisherId) : null
  } else if (body?.publisherId === null) {
    updates.publisherId = null
  }

  if (body?.price !== undefined) {
    const priceValue = String(body.price).trim()
    if (!priceValue) {
      throw createError({ statusCode: 400, statusMessage: 'price non valido' })
    }
    updates.price = priceValue
  }

  if (typeof body?.currency === 'string' && body.currency.trim()) {
    updates.currency = body.currency.trim().slice(0, 3).toUpperCase()
  }

  if (body?.isbn !== undefined) {
    updates.isbn = typeof body.isbn === 'string' ? body.isbn.trim() || null : null
  }

  const languageCode = normalizeLanguageCode(body?.languageCode || 'it')
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const description = body?.description === undefined ? undefined : (typeof body.description === 'string' ? body.description.trim() || null : null)
  const coverUrl = body?.coverUrl === undefined ? undefined : (typeof body.coverUrl === 'string' ? body.coverUrl.trim() || null : null)

  if (Object.keys(updates).length === 0 && !title && description === undefined && coverUrl === undefined) {
    return { ok: true, item: target }
  }

  await db.transaction(async (tx) => {
    if (Object.keys(updates).length > 0) {
      await tx.update(catalogItems).set(updates).where(eq(catalogItems.id, id))
    }

    if (title || description !== undefined) {
      const existingTranslation = (await tx
        .select()
        .from(catalogItemTranslations)
        .where(
          and(
            eq(catalogItemTranslations.itemId, id),
            eq(catalogItemTranslations.languageCode, languageCode)
          )
        )
        .limit(1))[0]

      if (existingTranslation) {
        await tx.update(catalogItemTranslations).set({
          title: title || existingTranslation.title,
          description: description === undefined ? existingTranslation.description : description,
        }).where(eq(catalogItemTranslations.id, existingTranslation.id))
      } else {
        await tx.insert(catalogItemTranslations).values({
          itemId: id,
          languageCode,
          title: title || 'Titolo non disponibile',
          description: description ?? null,
          contentPath: null,
          contentFormat: 'txt',
        })
      }
    }

    if (coverUrl !== undefined) {
      const existingCover = (await tx
        .select()
        .from(itemMedia)
        .where(
          and(
            eq(itemMedia.itemId, id),
            eq(itemMedia.mediaType, 'cover')
          )
        )
        .limit(1))[0]

      if (coverUrl) {
        const mimeType = guessMimeType(coverUrl)
        if (existingCover) {
          await tx.update(itemMedia).set({ storagePath: coverUrl, mimeType }).where(eq(itemMedia.id, existingCover.id))
        } else {
          await tx.insert(itemMedia).values({
            itemId: id,
            mediaType: 'cover',
            storagePath: coverUrl,
            mimeType,
            sortOrder: 0,
          })
        }
      } else if (existingCover) {
        await tx.delete(itemMedia).where(eq(itemMedia.id, existingCover.id))
      }
    }
  })

  const updated = (await db.select().from(catalogItems).where(eq(catalogItems.id, id)).limit(1))[0]
  return {
    ok: true,
    item: updated,
  }
})
