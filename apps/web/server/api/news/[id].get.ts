import { getCache, setCache } from '../../utils/simpleCache'

function normalizePathId(paramsId: string | string[]) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

export default defineEventHandler(async (event) => {
  const paramsId = event.context.params?.id
  const decodedId = normalizePathId(paramsId).replace(/^\/+/, '')
  const cacheKey = `news:detail:${decodedId}`
  const cached = getCache(cacheKey)
  if (cached) return cached

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
    return payload
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
  return payload
})
