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

export default defineEventHandler(async (event) => {
  const actor = await getSessionUser(event)
  if (!actor) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = getDb()
  const actorPermissions = actor.role === 'manager' ? await getActorPermissions(db, actor.id) : []
  const canView = actor.role === 'admin' || actorPermissions.includes('MI')
  if (!canView) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = normalizePathId(event.context.params?.id)
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const item = (await db.select().from(catalogItems).where(eq(catalogItems.id, id)).limit(1))[0]
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Item not found' })
  }

  const translation = (await db
    .select()
    .from(catalogItemTranslations)
    .where(eq(catalogItemTranslations.itemId, id))
    .limit(1))[0]

  const cover = (await db
    .select({ storagePath: itemMedia.storagePath })
    .from(itemMedia)
    .where(
      and(
        eq(itemMedia.itemId, id),
        eq(itemMedia.mediaType, 'cover')
      )
    )
    .limit(1))[0]

  return {
    ok: true,
    item: {
      id: item.id,
      type: item.type,
      source: item.source,
      ageRatingMin: item.ageRatingMin,
      releaseDate: item.releaseDate instanceof Date ? item.releaseDate.toISOString().slice(0, 10) : item.releaseDate,
      publisherId: item.publisherId,
      price: item.price,
      currency: item.currency,
      isbn: item.isbn,
      title: translation?.title ?? '',
      description: translation?.description ?? '',
      languageCode: translation?.languageCode ?? 'it',
      coverUrl: cover?.storagePath ?? null,
    },
  }
})
