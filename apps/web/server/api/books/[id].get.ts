import { getCache, setCache } from '../../utils/simpleCache'

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
  const cached = getCache(cacheKey)
  if (cached) return cached

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

  const payload = {
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

  setCache(cacheKey, payload, 24 * 60 * 60 * 1000)
  return payload
})
