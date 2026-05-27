import { and, eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { getCache, setCache } from '../../utils/simpleCache'
import { upsertExternalCatalogItem, incrementCatalogItemViews } from '../../utils/catalog'
import { getItemEngagementState } from '../../utils/engagement'
import { getSessionUser } from '../../utils/session'
import { readingProgress } from '../../db/schema'

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
      // `bodyHtml` may be provided later by enrichment (Google Books snippet, Gutendex, etc.)
      bodyHtml: null,
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

  // Enrichment: if we don't have an inline body, try Google Books for a preview/snippet
  // If the incoming id explicitly points to a Google Books volume (prefix `gb:` or contains books.google),
  // prefer the Google Books normalized endpoint and return that payload.
  const rawParams = event.context.params?.id
  const rawIdStr = Array.isArray(rawParams) ? rawParams.join('/') : String(rawParams || '')
  const looksLikeGoogle = rawIdStr.startsWith('gb:') || rawIdStr.includes('books.google') || rawIdStr.includes('/volumes/')
  if (looksLikeGoogle) {
    try {
      // extract volume id
      let volumeId = rawIdStr
      if (volumeId.startsWith('gb:')) volumeId = volumeId.slice(3)
      try {
        const u = new URL(volumeId)
        // if a full URL provided, try to extract last path segment
        const parts = u.pathname.split('/')
        if (parts.length) volumeId = parts[parts.length - 1] || volumeId
      } catch {
        // not a URL
      }
      const host = event.node?.req?.headers?.host || 'localhost:3000'
      const proto = (event.node?.req?.headers['x-forwarded-proto'] || 'http').split(',')[0]
      const proxyUrl = `${proto}://${host}/api/books/google/${encodeURIComponent(volumeId)}`
      const proxyRes = await fetch(proxyUrl)
      if (proxyRes.ok) {
        const prox = await proxyRes.json()
        // prefer proxy payload when available
        basePayload = {
          id: prox.id || basePayload.id,
          type: prox.type || basePayload.type,
          source: prox.source || basePayload.source,
          title: prox.title || basePayload.title,
          subtitle: prox.subtitle || basePayload.subtitle,
          authors: prox.authors || basePayload.authors,
          description: prox.description || basePayload.description,
          bodyHtml: prox.bodyHtml || basePayload.bodyHtml,
          coverUrl: prox.coverUrl || basePayload.coverUrl,
          contentUrl: prox.contentUrl || basePayload.contentUrl,
          language: prox.language || basePayload.language,
          publishedAt: prox.publishedAt || basePayload.publishedAt,
          tags: prox.tags || basePayload.tags,
          rating: prox.rating || basePayload.rating,
          price: prox.price || basePayload.price,
          isFree: prox.isFree ?? basePayload.isFree,
          isSaved: basePayload.isSaved,
          isPurchased: basePayload.isPurchased,
          commentsCount: prox.commentsCount || basePayload.commentsCount
        }
        setCache(cacheKey, basePayload, 24 * 60 * 60 * 1000)
      }
    } catch (e) {
      // ignore and continue to other enrichment
    }
  }

  if (!basePayload.bodyHtml) {
    try {
      const titleQuery = encodeURIComponent(basePayload.title || '')
      const authorQuery = encodeURIComponent((basePayload.authors && basePayload.authors[0]) || '')
      const qParts = []
      if (titleQuery) qParts.push(`intitle:${titleQuery}`)
      if (authorQuery) qParts.push(`inauthor:${authorQuery}`)
      const q = qParts.length ? qParts.join('+') : titleQuery || authorQuery || ''
      if (q) {
        const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`)
        if (gbRes.ok) {
          const gbJson = await gbRes.json()
          const vol = gbJson.items && gbJson.items[0]
          if (vol) {
            const volInfo = vol.volumeInfo || {}
            const searchInfo = vol.searchInfo || {}
            const gbPreview = vol.accessInfo?.webReaderLink || volInfo.previewLink || null
            // prefer full description, fallback to search snippet
            const gbSnippet = volInfo.description || searchInfo.textSnippet || volInfo.subtitle || null
            if (gbSnippet) {
              basePayload.bodyHtml = gbSnippet
              // cache the enriched payload as well
              setCache(cacheKey, basePayload, 24 * 60 * 60 * 1000)
            }
            if (gbPreview && !basePayload.contentUrl) {
              basePayload.contentUrl = gbPreview
              setCache(cacheKey, basePayload, 24 * 60 * 60 * 1000)
            }
          }
        }
      }
    } catch (e) {
      // ignore enrichment failures — not critical
    }
  }

  // Gutendex fallback: try to find a public-domain full text and use it as bodyHtml
  if (!basePayload.bodyHtml) {
    try {
      const search = encodeURIComponent(`${basePayload.title} ${basePayload.authors?.[0] || ''}`.trim())
      if (search) {
        const gutRes = await fetch(`https://gutendex.com/books?search=${search}`)
        if (gutRes.ok) {
          const gutJson = await gutRes.json()
          const g = gutJson.results && gutJson.results[0]
          if (g && g.formats) {
            // prefer HTML or plain text
            const fmt = g.formats['text/html; charset=utf-8'] || g.formats['text/plain; charset=utf-8'] || g.formats['text/plain']
            if (fmt) {
              try {
                const textRes = await fetch(fmt)
                if (textRes.ok) {
                  const txt = await textRes.text()
                  // use plain text wrapped in pre to preserve formatting
                  basePayload.bodyHtml = txt ? `<pre>${txt}</pre>` : null
                  setCache(cacheKey, basePayload, 24 * 60 * 60 * 1000)
                }
              } catch {}
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const payload = { ...basePayload }
  const db = getDb()
  const itemId = await upsertExternalCatalogItem(db, {
    type: 'book',
    searchProvider: 'openlibrary',
    searchId: workKey,
    contentProvider: 'openlibrary',
    contentId: workKey,
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
  const progressRow = user
    ? (await db
        .select({
          locator: readingProgress.locator,
          percentage: readingProgress.percentage,
          languageCode: readingProgress.languageCode,
          lastReadAt: readingProgress.lastReadAt,
        })
        .from(readingProgress)
        .where(and(eq(readingProgress.userId, user.id), eq(readingProgress.itemId, itemId)))
        .limit(1))[0]
    : null

  return {
    ...payload,
    searchProvider: 'openlibrary',
    searchId: workKey,
    contentProvider: 'openlibrary',
    contentId: workKey,
    externalProvider: 'openlibrary',
    externalId: workKey,
    internalId: itemId,
    commentsCount: engagement.commentsCount,
    likesCount: engagement.likesCount,
    isLiked: engagement.isLiked,
    isSaved: engagement.isSaved,
    isPurchased: engagement.isPurchased,
    canLike: engagement.canLike,
    canComment: engagement.canComment,
    readingProgress: progressRow
      ? {
          locator: progressRow.locator,
          percentage: Number(progressRow.percentage ?? 0),
          languageCode: progressRow.languageCode,
          lastReadAt: progressRow.lastReadAt,
        }
      : null
  }
})
