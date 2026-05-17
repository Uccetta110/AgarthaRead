import { getCache, setCache } from './simpleCache'
import { fetchMangaDexJson, pickLocalizedText } from './mangaDex'

const ANILIST_API = 'https://graphql.anilist.co'

type AniListMedia = any

async function fetchAniListGraphQL(query: string, variables?: Record<string, any>) {
  const payload: any = { query }
  if (variables && Object.keys(variables).length > 0) payload.variables = variables

  let res
  try {
    res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    })
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: `AniList network error: ${err?.message || 'network failure'}` })
  }

  const text = await res.text()
  let json: any
  try {
    json = text ? JSON.parse(text) : {}
  } catch (err) {
    json = { raw: text }
  }

  if (!res.ok) {
    const detail = json?.errors?.[0]?.message || json?.message || String(json?.raw || text || '')
    throw createError({ statusCode: res.status, statusMessage: `AniList request failed with status ${res.status}: ${detail}` })
  }

  if (json.errors) {
    const err = json.errors[0]
    throw createError({ statusCode: 502, statusMessage: `AniList error: ${err.message || 'unknown'}` })
  }

  return json.data
}

const MEDIA_FIELDS = `id title { romaji english native userPreferred } synonyms description chapters volumes status startDate { year } coverImage { large medium } bannerImage genres tags { name } averageScore meanScore staff { edges { node { name { full } } } } externalLinks { site url }`

export async function searchAniListManga(search: string | null, page = 1, perPage = 12, sort = 'POPULARITY_DESC') {
  const normalizedSearch = String(search || '').trim()
  const cacheKey = `anilist:search:${normalizedSearch}:${page}:${perPage}:${sort}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const query = `query ($page: Int, $perPage: Int, $search: String, $sort: [MediaSort]) { Page(page: $page, perPage: $perPage) { media(search: $search, type: MANGA, sort: $sort) { ${MEDIA_FIELDS} } } }`
  const vars: any = { page, perPage, sort: [sort] }
  if (normalizedSearch) vars.search = normalizedSearch

  const data = await fetchAniListGraphQL(query, vars)
  const items = (data?.Page?.media || []) as AniListMedia[]
  setCache(cacheKey, items, 60 * 60 * 1000)
  return items
}

export async function getAniListMangaById(id: number | string) {
  const cacheKey = `anilist:media:${String(id)}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const query = `query ($id: Int) { Media(id: $id, type: MANGA) { ${MEDIA_FIELDS} } }`
  const data = await fetchAniListGraphQL(query, { id: Number(id) })
  const media = data?.Media || null
  if (media) setCache(cacheKey, media, 24 * 60 * 60 * 1000)
  return media
}

function pickAniListTitle(media: AniListMedia) {
  return (media?.title?.userPreferred || media?.title?.english || media?.title?.romaji || media?.title?.native || (media?.synonyms || [])[0] || 'Titolo non disponibile')
}

function extractStaffNames(media: AniListMedia) {
  return (media?.staff?.edges || []).map((e: any) => String(e?.node?.name?.full || '').trim()).filter(Boolean)
}

function extractTags(media: AniListMedia) {
  const genreNames = (media?.genres || []).map((g: any) => String(g || '').trim())
  const tagNames = (media?.tags || []).map((t: any) => String(t?.name || '').trim())
  return Array.from(new Set([...genreNames, ...tagNames]))
}

export function collectAniListTitles(media: AniListMedia) {
  const titles = []
  if (media?.title) {
    titles.push(media.title.userPreferred, media.title.english, media.title.romaji, media.title.native)
  }
  if (Array.isArray(media?.synonyms)) titles.push(...media.synonyms)
  return Array.from(new Set(titles.map((t: any) => String(t || '').trim()).filter(Boolean)))
}

export function normalizeAniListHomeItem(media: AniListMedia) {
  return {
    id: String(media.id),
    type: 'manga',
    source: 'anilist',
    title: pickAniListTitle(media),
    subtitle: [media.status].filter(Boolean).join(' - '),
    authors: extractStaffNames(media),
    description: String(media.description || '').replace(/<[^>]*>/g, '').trim() || '',
    cover: media?.coverImage?.large || media?.coverImage?.medium || null,
    contentUrl: media?.externalLinks?.find((l: any) => l.site === 'Anilist')?.url || `https://anilist.co/manga/${media.id}`,
    language: null,
    publishedAt: media?.startDate?.year ? String(media.startDate.year) : null,
    tags: extractTags(media),
    chapterCount: typeof media.chapters === 'number' ? media.chapters : null
  }
}

export function normalizeAniListDetail(media: AniListMedia) {
  return {
    id: String(media.id),
    type: 'manga',
    source: 'anilist',
    title: pickAniListTitle(media),
    subtitle: [media.status].filter(Boolean).join(' - '),
    authors: extractStaffNames(media),
    description: String(media.description || '').replace(/<[^>]*>/g, '').trim() || '',
    coverUrl: media?.coverImage?.large || media?.coverImage?.medium || null,
    contentUrl: media?.externalLinks?.find((l: any) => l.site === 'Anilist')?.url || `https://anilist.co/manga/${media.id}`,
    language: null,
    publishedAt: media?.startDate?.year ? String(media.startDate.year) : null,
    tags: extractTags(media),
    rating: media?.averageScore ?? media?.meanScore ?? null,
    price: null,
    isFree: true,
    isSaved: false,
    isPurchased: false,
    commentsCount: 0,
    chapterCount: typeof media.chapters === 'number' ? media.chapters : null,
    chapters: []
  }
}

export async function findMangaDexMatchByTitles(titleCandidates: string[] = []) {
  const candidates = titleCandidates.map((t) => String(t || '').trim()).filter(Boolean)
  if (candidates.length === 0) return null
  // try to find best match among search results
  for (const title of candidates) {
    try {
      const params = new URLSearchParams()
      params.set('title', title)
      params.set('limit', '10')
      const url = `/manga?${params.toString()}`
      const data = await fetchMangaDexSearch(url)
      const results = data?.data || []
      if (results.length === 0) continue

      const normalizedQuery = title.toLowerCase().replace(/[^a-z0-9]+/gi, ' ').trim()
      // score results: exact match > contains > startsWith
      let best: any = null
      let bestScore = -1
      for (const r of results) {
        const candidateTitle = String(pickLocalizedText(r?.attributes?.title) || r?.attributes?.title?.en || '').toLowerCase().replace(/[^a-z0-9]+/gi, ' ').trim()
        if (!candidateTitle) continue
        let score = 0
        if (candidateTitle === normalizedQuery) score += 100
        if (candidateTitle.includes(normalizedQuery)) score += 50
        if (normalizedQuery.includes(candidateTitle)) score += 30
        // prefer same original language or presence of titles in same script
        if ((r?.attributes?.originalLanguage || '') === 'ja') score += 5

        if (score > bestScore) {
          bestScore = score
          best = r
        }
      }

      if (best) return best
      // fallback: return first result
      if (results.length > 0) return results[0]
    } catch (err) {
      // ignore and try next title
    }
  }

  return null
}

// minimal wrapper to call MangaDex search via server utils; the actual fetch is in mangaDex.ts
async function fetchMangaDexSearch(path: string) {
  return await fetchMangaDexJson(path)
}
