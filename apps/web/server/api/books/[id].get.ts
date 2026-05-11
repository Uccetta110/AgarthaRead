import { getDb } from '../../db/client'
import { getCache, setCache } from '../../utils/simpleCache'
import { upsertExternalCatalogItem, incrementCatalogItemViews } from '../../utils/catalog'
import { getItemEngagementState } from '../../utils/engagement'
import { getSessionUser } from '../../utils/session'

function normalizePathId(paramsId: string | string[]) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

async function fetchAuthorNames(authors: any[]) {
  const names = []
  for (const author of authors || []) {
    const key = author?.author?.key || author?.key
    if (!key) continue
    try {
      const res = await fetch(`https://openlibrary.org${key}.json`)
      if (!res.ok) continue
      const json = await res.json()
      if (json?.name) names.push(json.name)
    } catch {
      continue
    }
  }
  return names
}

export default defineEventHandler(async (event) => {
  const paramsId = event.context.params?.id
  const decodedId = normalizePathId(paramsId)
  const workKey = decodedId.startsWith('/works/') ? decodedId : `/works/${decodedId}`
  const cacheKey = `books:detail:${workKey}`
  let basePayload = getCache(cacheKey)

  if (!basePayload) {
    const res = await fetch(`https://openlibrary.org${workKey}.json`)
    if (!res.ok) {
      throw createError({ statusCode: res.status, statusMessage: 'Open Library not available' })
    }

    const workData = await res.json()
    const authors = await fetchAuthorNames(workData.authors || [])
    const description = typeof workData.description === 'string'
      ? workData.description
      : workData.description?.value || ''
    const coverUrl = workData.covers?.[0]
      ? `https://covers.openlibrary.org/b/id/${workData.covers[0]}-L.jpg`
      : null

    basePayload = {
      id: decodedId,
      type: 'book',
      source: 'openlibrary',
      title: workData.title || 'Titolo non disponibile',
      subtitle: workData.subtitle || '',
      authors,
      description,
      coverUrl,
      contentUrl: `https://openlibrary.org${workKey}`,
      language: workData.languages?.[0]?.key?.replace('/languages/', '') || null,
      publishedAt: workData.created?.value || workData.first_publish_date || null,
      tags: workData.subjects || [],
      rating: null,
      price: null,
      isFree: true,
      isSaved: false,
      isPurchased: false,
      commentsCount: 0
    }

    setCache(cacheKey, basePayload, 24 * 60 * 60 * 1000)
  }

  const payload = { ...basePayload }
  const db = getDb()
  const itemId = await upsertExternalCatalogItem(db, {
    type: 'book',
    externalProvider: 'openlibrary',
    externalId: workKey,
    title: payload.title,
    description: payload.description,
    language: payload.language,
    coverUrl: payload.coverUrl,
    contentFormat: 'txt'
  })

  await incrementCatalogItemViews(db, itemId)

  const user = await getSessionUser(event)
  const engagement = await getItemEngagementState(db, itemId, user?.id ?? null)

  return {
    ...payload,
    internalId: itemId,
    commentsCount: engagement.commentsCount,
    likesCount: engagement.likesCount,
    isLiked: engagement.isLiked,
    isSaved: engagement.isSaved,
    isPurchased: engagement.isPurchased,
    canLike: engagement.canLike,
    canComment: engagement.canComment
  }
})
