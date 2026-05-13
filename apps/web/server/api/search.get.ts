import { getQuery } from 'h3'
import { fetchCachedJikanJson, normalizeJikanHomeItem } from '../utils/jikan'

type SearchType = 'books' | 'manga' | 'news'

type SearchPayload = {
  items: any[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
  type: SearchType
  notice?: string
}

const MAX_LIMIT = 50

function toNumber(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeType(value: unknown): SearchType {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'manga') return 'manga'
  if (raw === 'news') return 'news'
  return 'books'
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q || '').trim()
  const type = normalizeType(query.type)
  const page = Math.max(1, toNumber(query.page, 1))
  const pageSize = Math.min(MAX_LIMIT, Math.max(1, toNumber(query.limit, 20)))

  if (!q) {
    return {
      items: [],
      page,
      pageSize,
      total: 0,
      hasMore: false,
      type
    } satisfies SearchPayload
  }

  if (type === 'books') {
    const url = new URL('https://openlibrary.org/search.json')
    url.searchParams.set('q', q)
    url.searchParams.set('page', String(page))
    url.searchParams.set('limit', String(pageSize))
    url.searchParams.set('fields', 'key,title,author_name,cover_i')

    const response = await fetch(url.toString())
    if (!response.ok) {
      return {
        items: [],
        page,
        pageSize,
        total: 0,
        hasMore: false,
        type
      } satisfies SearchPayload
    }

    const json = await response.json()
    const docs = Array.isArray(json.docs) ? json.docs : []
    const total = Number(json.numFound || 0)

    const items = docs.map((doc: any) => ({
      id: doc.key,
      title: doc.title || 'Titolo non disponibile',
      authors: Array.isArray(doc.author_name) ? doc.author_name : [],
      cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null
    }))

    return {
      items,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
      type
    } satisfies SearchPayload
  }

  if (type === 'manga') {
    const params = new URLSearchParams()
    params.set('q', q)
    params.set('page', String(page))
    params.set('limit', String(pageSize))

    try {
      const cacheKey = `jikan:search:${q}:${page}:${pageSize}`
      const jikanJson = await fetchCachedJikanJson(cacheKey, '/manga', params, 10 * 60 * 1000)
      const items = (jikanJson.data || []).map((manga: any) => normalizeJikanHomeItem(manga))
      const total = Number(jikanJson.pagination?.items?.total || 0)
      const hasNextPage = Boolean(jikanJson.pagination?.has_next_page)

      return {
        items,
        page,
        pageSize,
        total,
        hasMore: hasNextPage || ((page - 1) * pageSize + items.length < total),
        type
      } satisfies SearchPayload
    } catch (error) {
      return {
        items: [],
        page,
        pageSize,
        total: 0,
        hasMore: false,
        type,
        notice: 'Jikan non disponibile'
      } satisfies SearchPayload
    }
  }

  const key = process.env.GUARDIAN_KEY || ''
  if (!key) {
    return {
      items: [],
      page,
      pageSize,
      total: 0,
      hasMore: false,
      type,
      notice: 'GUARDIAN_KEY not configured'
    } satisfies SearchPayload
  }

  const newsUrl = new URL('https://content.guardianapis.com/search')
  newsUrl.searchParams.set('api-key', key)
  newsUrl.searchParams.set('q', q)
  newsUrl.searchParams.set('page-size', String(pageSize))
  newsUrl.searchParams.set('page', String(page))
  newsUrl.searchParams.set('show-fields', 'thumbnail,trailText,byline')

  const newsResponse = await fetch(newsUrl.toString())
  if (!newsResponse.ok) {
    return {
      items: [],
      page,
      pageSize,
      total: 0,
      hasMore: false,
      type
    } satisfies SearchPayload
  }

  const newsJson = await newsResponse.json()
  const results = newsJson.response?.results || []
  const total = Number(newsJson.response?.total || 0)

  const items = results.map((item: any) => ({
    id: item.id,
    title: item.webTitle,
    authors: item.fields?.byline ? [item.fields.byline] : [],
    cover: item.fields?.thumbnail || null,
    trailText: item.fields?.trailText || null,
    url: item.webUrl || null
  }))

  return {
    items,
    page,
    pageSize,
    total,
    hasMore: page * pageSize < total,
    type
  } satisfies SearchPayload
})
