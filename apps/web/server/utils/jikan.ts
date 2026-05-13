import { getCache, setCache } from './simpleCache'

const JIKAN_API_BASE = 'https://api.jikan.moe/v4/'

type JikanTitle = {
  type?: string
  title?: string
}

type JikanImageVariant = {
  image_url?: string
  small_image_url?: string
  large_image_url?: string
}

type JikanImages = {
  jpg?: JikanImageVariant
  webp?: JikanImageVariant
}

type JikanEntity = {
  name?: string
}

type JikanManga = {
  mal_id: number
  title?: string
  title_english?: string
  title_japanese?: string
  titles?: JikanTitle[]
  images?: JikanImages
  url?: string
  synopsis?: string
  status?: string
  type?: string
  chapters?: number | null
  published?: {
    from?: string | null
    string?: string | null
  }
  score?: number | null
  favorites?: number | null
  authors?: JikanEntity[]
  genres?: JikanEntity[]
  themes?: JikanEntity[]
  demographics?: JikanEntity[]
}

function pickTitle(manga: JikanManga) {
  const candidates = [
    manga.title,
    manga.title_english,
    manga.title_japanese,
    ...(manga.titles || []).map((entry) => entry.title)
  ]

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return 'Titolo non disponibile'
}

function pickImage(images?: JikanImages) {
  const variants = [
    images?.webp?.large_image_url,
    images?.jpg?.large_image_url,
    images?.webp?.image_url,
    images?.jpg?.image_url,
    images?.webp?.small_image_url,
    images?.jpg?.small_image_url
  ]

  for (const value of variants) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return null
}

function extractNames(entries?: JikanEntity[]) {
  return (entries || [])
    .map((entry) => String(entry?.name || '').trim())
    .filter(Boolean)
}

function extractTags(manga: JikanManga) {
  const tags = [
    ...extractNames(manga.genres),
    ...extractNames(manga.themes),
    ...extractNames(manga.demographics)
  ]
  return Array.from(new Set(tags))
}

function extractPublished(manga: JikanManga) {
  return String(manga.published?.string || manga.published?.from || '').trim() || null
}

export function collectJikanTitles(manga: JikanManga) {
  const titles = [
    manga.title,
    manga.title_english,
    manga.title_japanese,
    ...(manga.titles || []).map((entry) => entry.title)
  ]

  return Array.from(
    new Set(
      titles
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  )
}

export function normalizeJikanHomeItem(manga: JikanManga) {
  const subtitle = [manga.type, manga.status]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' - ')

  return {
    id: String(manga.mal_id),
    type: 'manga',
    source: 'jikan',
    title: pickTitle(manga),
    subtitle,
    authors: extractNames(manga.authors),
    description: String(manga.synopsis || '').trim(),
    cover: pickImage(manga.images),
    contentUrl: manga.url || null,
    language: null,
    publishedAt: extractPublished(manga),
    tags: extractTags(manga),
    rating: manga.score ?? null,
    chapterCount: typeof manga.chapters === 'number' ? manga.chapters : null
  }
}

export function normalizeJikanDetail(manga: JikanManga) {
  const subtitle = [manga.type, manga.status]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' - ')

  return {
    id: String(manga.mal_id),
    type: 'manga',
    source: 'jikan',
    title: pickTitle(manga),
    subtitle,
    authors: extractNames(manga.authors),
    description: String(manga.synopsis || '').trim(),
    coverUrl: pickImage(manga.images),
    contentUrl: manga.url || null,
    language: null,
    publishedAt: extractPublished(manga),
    tags: extractTags(manga),
    rating: manga.score ?? null,
    favorites: manga.favorites ?? null,
    price: null,
    isFree: true,
    isSaved: false,
    isPurchased: false,
    commentsCount: 0,
    chapterCount: typeof manga.chapters === 'number' ? manga.chapters : null,
    chapters: []
  }
}

export async function fetchJikanJson(path: string, params?: URLSearchParams) {
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  const url = new URL(normalizedPath, JIKAN_API_BASE)
  if (params) url.search = params.toString()

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AgarthaRead/1.0'
    }
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: `Jikan request failed with status ${response.status}`
    })
  }

  return await response.json()
}

export async function fetchCachedJikanJson(
  cacheKey: string,
  path: string,
  params?: URLSearchParams,
  ttlMs = 60 * 60 * 1000,
  fallbackTtlMs = 6 * 60 * 60 * 1000
) {
  const cached = getCache(cacheKey)
  if (cached) return cached

  const fallbackKey = `${cacheKey}:fallback`

  try {
    const payload = await fetchJikanJson(path, params)
    setCache(cacheKey, payload, ttlMs)
    setCache(fallbackKey, payload, fallbackTtlMs)
    return payload
  } catch (error) {
    const fallback = getCache(fallbackKey)
    if (fallback) return fallback
    throw error
  }
}