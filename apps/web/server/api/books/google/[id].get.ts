import { getDb } from '../../../db/client'
import { getCache, setCache } from '../../../utils/simpleCache'
import { upsertExternalCatalogItem, incrementCatalogItemViews } from '../../../utils/catalog'
import { getItemEngagementState } from '../../../utils/engagement'
import { getSessionUser } from '../../../utils/session'

function normalizeId(raw: string | string[]) {
  const id = Array.isArray(raw) ? raw.join('/') : String(raw || '')
  // Accept either plain id or full URL
  try {
    const url = new URL(id)
    // if path contains /volumes/{id}
    const parts = url.pathname.split('/')
    const idx = parts.indexOf('volumes')
    if (idx >= 0 && parts.length > idx + 1) return parts[idx + 1]
  } catch {
    // not a URL
  }
  return decodeURIComponent(id)
}

export default defineEventHandler(async (event) => {
  const paramsId = event.context.params?.id
  const volumeId = normalizeId(paramsId)
  if (!volumeId) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const cacheKey = `googlebooks:detail:${volumeId}`
  let payload = getCache(cacheKey)
  if (payload) return payload

  // Build Google Books URL (optionally with API key)
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  const url = `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(volumeId)}${apiKey ? `?key=${apiKey}` : ''}`

  const res = await fetch(url)
  if (!res.ok) throw createError({ statusCode: res.status, statusMessage: 'Google Books not available' })
  const json = await res.json()

  const vi = json.volumeInfo || {}
  const access = json.accessInfo || {}

  const coverUrl = vi.imageLinks?.thumbnail || vi.imageLinks?.smallThumbnail || null
  const description = vi.description || json.searchInfo?.textSnippet || vi.subtitle || ''

  payload = {
    id: volumeId,
    type: 'book',
    source: 'googlebooks',
    title: vi.title || 'Titolo non disponibile',
    subtitle: vi.subtitle || '',
    authors: vi.authors || [],
    description: vi.description || '',
    bodyHtml: description || null,
    coverUrl,
    contentUrl: access.webReaderLink || vi.previewLink || json.selfLink || null,
    language: vi.language || null,
    publishedAt: vi.publishedDate || null,
    tags: vi.categories || [],
    rating: vi.averageRating || null,
    price: (json.saleInfo && json.saleInfo.listPrice) ? json.saleInfo.listPrice.amount : null,
    isFree: json.saleInfo?.saleability === 'FREE' || access.publicDomain === true || false,
    contentFormat: access.epub?.isAvailable ? 'epub' : access.pdf?.isAvailable ? 'pdf' : (access.webReaderLink ? 'html' : null),
    sourceRaw: json,
    commentsCount: 0
  }

  setCache(cacheKey, payload, 24 * 60 * 60 * 1000)

  // Mirror behavior of other book endpoints: upsert into catalog and attach engagement
  const db = getDb()
  const itemId = await upsertExternalCatalogItem(db, {
    type: 'book',
    searchProvider: 'googlebooks',
    searchId: volumeId,
    contentProvider: 'googlebooks',
    contentId: volumeId,
    externalProvider: 'googlebooks',
    externalId: volumeId,
    title: payload.title,
    description: payload.description,
    language: payload.language,
    coverUrl: payload.coverUrl,
    contentFormat: payload.contentFormat || 'html'
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
