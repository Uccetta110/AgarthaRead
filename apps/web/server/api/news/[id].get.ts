import { getDb } from '../../db/client'
import { getCache, setCache } from '../../utils/simpleCache'
import { upsertExternalCatalogItem, incrementCatalogItemViews } from '../../utils/catalog'
import { getItemEngagementState } from '../../utils/engagement'
import { getSessionUser } from '../../utils/session'

function normalizePathId(paramsId: string | string[]) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

export default defineEventHandler(async (event) => {
  const paramsId = event.context.params?.id
  const decodedId = normalizePathId(paramsId).replace(/^\/+/, '')
  const cacheKey = `news:detail:${decodedId}`
  const cached = getCache(cacheKey)
  if (cached) {
    const payload = { ...cached }
    const db = getDb()
    const itemId = await upsertExternalCatalogItem(db, {
      type: 'newspaper',
      searchProvider: 'guardian',
      searchId: decodedId,
      contentProvider: 'guardian',
      contentId: decodedId,
      externalProvider: 'guardian',
      externalId: decodedId,
      title: payload.title,
      description: payload.description,
      language: payload.language,
      coverUrl: payload.coverUrl,
      contentFormat: 'html_like'
    })

    await incrementCatalogItemViews(db, itemId)

    const user = await getSessionUser(event)
    const engagement = await getItemEngagementState(db, itemId, user?.id ?? null)

    return {
      ...payload,
      searchProvider: 'guardian',
      searchId: decodedId,
      contentProvider: 'guardian',
      contentId: decodedId,
      externalProvider: 'guardian',
      externalId: decodedId,
      internalId: itemId,
      commentsCount: engagement.commentsCount,
      likesCount: engagement.likesCount,
      isLiked: engagement.isLiked,
      isSaved: engagement.isSaved,
      isPurchased: engagement.isPurchased,
      canLike: engagement.canLike,
      canComment: engagement.canComment
    }
  }

  const key = process.env.GUARDIAN_KEY || null
  if (!key) {
    const payload = {
      id: decodedId,
      type: 'news',
      source: 'guardian',
      title: 'Articolo demo',
      subtitle: '',
      authors: [],
      description: 'Imposta GUARDIAN_KEY nel file .env per vedere i dettagli reali dell’articolo.',
      coverUrl: null,
      contentUrl: null,
      language: null,
      publishedAt: null,
      tags: [],
      rating: null,
      price: null,
      isFree: true,
      isSaved: false,
      isPurchased: false,
      commentsCount: 0,
      bodyHtml: ''
    }
    setCache(cacheKey, payload, 5 * 60 * 1000)

    const db = getDb()
    const itemId = await upsertExternalCatalogItem(db, {
      type: 'newspaper',
      externalProvider: 'guardian',
      externalId: decodedId,
      title: payload.title,
      description: payload.description,
      language: payload.language,
      coverUrl: payload.coverUrl,
      contentFormat: 'html_like'
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
  }

  const res = await fetch(`https://content.guardianapis.com/${encodeURIComponent(decodedId)}?api-key=${key}&show-fields=thumbnail,trailText,body,byline`)
  if (!res.ok) {
    throw createError({ statusCode: res.status, statusMessage: 'Guardian API not available' })
  }

  const json = await res.json()
  const article = json?.response?.content || {}
  const fields = article.fields || {}
  const payload = {
    id: decodedId,
    type: 'news',
    source: 'guardian',
    title: article.webTitle || 'Titolo non disponibile',
    subtitle: '',
    authors: fields.byline ? [fields.byline] : [],
    description: fields.trailText || '',
    coverUrl: fields.thumbnail || null,
    contentUrl: article.webUrl || null,
    language: article.lang || null,
    publishedAt: article.webPublicationDate || null,
    tags: [article.sectionName].filter(Boolean),
    rating: null,
    price: null,
    isFree: true,
    isSaved: false,
    isPurchased: false,
    commentsCount: 0,
    bodyHtml: fields.body || ''
  }

  setCache(cacheKey, payload, 30 * 60 * 1000)

  const db = getDb()
  const itemId = await upsertExternalCatalogItem(db, {
    type: 'newspaper',
    searchProvider: 'guardian',
    searchId: decodedId,
    contentProvider: 'guardian',
    contentId: decodedId,
    externalProvider: 'guardian',
    externalId: decodedId,
    title: payload.title,
    description: payload.description,
    language: payload.language,
    coverUrl: payload.coverUrl,
    contentFormat: 'html_like'
  })

  await incrementCatalogItemViews(db, itemId)

  const user = await getSessionUser(event)
  const engagement = await getItemEngagementState(db, itemId, user?.id ?? null)

  return {
    ...payload,
    searchProvider: 'guardian',
    searchId: decodedId,
    contentProvider: 'guardian',
    contentId: decodedId,
    externalProvider: 'guardian',
    externalId: decodedId,
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
