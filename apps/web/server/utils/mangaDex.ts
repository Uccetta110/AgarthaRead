import { getCache, setCache } from './simpleCache'

const MANGADEX_API_BASE  = 'https://api.mangadex.org'
const MANGADEX_COVER_BASE = 'https://uploads.mangadex.org/covers'
const MANGADEX_TIMEOUT_MS = 10_000

type Relationship = {
  id?: string
  type?: string
  attributes?: Record<string, any>
}

type MangaDexManga = {
  id: string
  attributes?: Record<string, any>
  relationships?: Relationship[]
}

type MangaDexChapter = {
  id: string
  attributes?: Record<string, any>
  relationships?: Relationship[]
}

export function pickLocalizedText(source: unknown, preferredLocales: string[] = ['en', 'it']): string {
  if (!source) return ''
  if (typeof source === 'string') return source.trim()

  if (Array.isArray(source)) {
    for (const value of source) {
      const selected = pickLocalizedText(value, preferredLocales)
      if (selected) return selected
    }
    return ''
  }

  if (typeof source !== 'object') return ''

  const record = source as Record<string, unknown>
  for (const locale of preferredLocales) {
    const value = record[locale]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  for (const value of Object.values(record)) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function getRelationships(relationships: Relationship[] | undefined, types: string[]) {
  return (relationships || []).filter(
    (r) => r?.type && types.includes(r.type)
  )
}

export function extractMangaDexAuthors(relationships: Relationship[] = []) {
  const authorNames = getRelationships(relationships, ['author', 'artist'])
    .map((r) => pickLocalizedText(r.attributes?.name) || r.id || '')
    .filter(Boolean)
  return Array.from(new Set(authorNames))
}

export function extractMangaDexCoverUrl(mangaId: string, relationships: Relationship[] = []) {
  const coverRel = getRelationships(relationships, ['cover_art'])[0]
  const fileName =
    coverRel?.attributes?.fileName ||
    coverRel?.attributes?.filename ||
    coverRel?.attributes?.file_name
  if (!fileName) return null
  return `${MANGADEX_COVER_BASE}/${mangaId}/${fileName}.512.jpg`
}

export function extractMangaDexTags(tags: any[] = []) {
  return tags
    .map((tag) => pickLocalizedText(tag?.attributes?.name) || tag?.attributes?.name?.en || tag?.id || '')
    .filter(Boolean)
}

export async function resolveMangaDexTagIds(tagNames: string[] = []) {
  const normalizedNames = tagNames
    .map((n) => String(n || '').trim().toLowerCase())
    .filter(Boolean)

  if (normalizedNames.length === 0) return []

  const cacheKey = `mangadex:tag-ids:${normalizedNames.join(',')}`
  const cached = getCache(cacheKey)
  if (cached) return cached as string[]

  const responseJson = await fetchMangaDexJson('/manga/tag')
  const tagIds = (responseJson.data || [])
    .filter((tag: any) => {
      const name = pickLocalizedText(tag?.attributes?.name).toLowerCase()
      return normalizedNames.some(
        (c) => name === c || name.includes(c) || c.includes(name)
      )
    })
    .map((tag: any) => tag.id)

  setCache(cacheKey, tagIds, 24 * 60 * 60 * 1000)
  return tagIds
}

export function normalizeMangaDexHomeItem(manga: MangaDexManga) {
  const attr = manga.attributes || {}
  const rels = manga.relationships || []
  return {
    id: manga.id,
    type: 'manga',
    source: 'mangadex',
    title: pickLocalizedText(attr.title) || 'Titolo non disponibile',
    subtitle: [attr.status, attr.year].filter(Boolean).join(' • '),
    authors: extractMangaDexAuthors(rels),
    description: pickLocalizedText(attr.description) || '',
    cover: extractMangaDexCoverUrl(manga.id, rels),
    contentUrl: `https://mangadex.org/title/${manga.id}`,
    language: attr.originalLanguage || null,
    publishedAt: attr.year ? String(attr.year) : null,
    tags: extractMangaDexTags(attr.tags || []),
    chapterCount: Number(attr.lastChapter || 0) || null
  }
}

export function normalizeMangaDexChapter(chapter: MangaDexChapter) {
  const attr = chapter.attributes || {}
  return {
    id: chapter.id,
    title: attr.title || '',
    chapter: attr.chapter || null,
    volume: attr.volume || null,
    language: attr.translatedLanguage || null,
    publishedAt: attr.publishAt || attr.createdAt || null,
    pages: Number(attr.pages || 0) || null,
    contentUrl: `https://mangadex.org/chapter/${chapter.id}`
  }
}

export function normalizeMangaDexDetail(manga: MangaDexManga, chapters: MangaDexChapter[] = []) {
  const attr = manga.attributes || {}
  const rels = manga.relationships || []
  return {
    id: manga.id,
    type: 'manga',
    source: 'mangadex',
    title: pickLocalizedText(attr.title) || 'Titolo non disponibile',
    subtitle: [attr.status, attr.year, attr.publicationDemographic].filter(Boolean).join(' • '),
    authors: extractMangaDexAuthors(rels),
    description: pickLocalizedText(attr.description) || '',
    coverUrl: extractMangaDexCoverUrl(manga.id, rels),
    contentUrl: `https://mangadex.org/title/${manga.id}`,
    language: attr.originalLanguage || null,
    publishedAt: attr.year ? String(attr.year) : attr.createdAt || null,
    tags: extractMangaDexTags(attr.tags || []),
    rating: null,
    price: null,
    isFree: true,
    isSaved: false,
    isPurchased: false,
    commentsCount: 0,
    chapterCount: chapters.length,
    chapters: chapters.map(normalizeMangaDexChapter)
  }
}

/**
 * GET verso MangaDex con AbortSignal opzionale.
 * FIX: aggiunto parametro `signal` — mancava come in jikan.ts e comick.ts,
 * rendendo impossibile qualsiasi timeout → potenziali 504.
 */
export async function fetchMangaDexJson(
  path: string,
  params?: URLSearchParams,
  signal?: AbortSignal
): Promise<any> {
  const url = new URL(path, MANGADEX_API_BASE)
  if (params) url.search = params.toString()

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: `MangaDex request failed with status ${response.status}`
    })
  }

  return response.json()
}

type MangaDexAtHomeResponse = {
  result?: string
  baseUrl?: string
  chapter?: {
    hash?: string
    data?: string[]
    dataSaver?: string[]
  }
}

export type MangaDexChapterPages = {
  chapterId: string
  quality: 'data' | 'data-saver'
  baseUrl: string
  hash: string
  pages: Array<{
    filename: string
    url: string
    index: number
  }>
}

/**
 * Risolve le pagine di un capitolo MangaDex.
 * FIX: aggiunto timeout interno di MANGADEX_TIMEOUT_MS — la fetch at-home
 * poteva bloccarsi indefinitamente su CDN lenti → 504.
 */
export async function resolveMangaDexChapterPages(
  chapterId: string,
  quality: 'data' | 'data-saver' = 'data-saver'
): Promise<MangaDexChapterPages> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MANGADEX_TIMEOUT_MS)
  if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
    (timer as any).unref()
  }

  let responseJson: MangaDexAtHomeResponse
  try {
    responseJson = await fetchMangaDexJson(
      `/at-home/server/${encodeURIComponent(chapterId)}`,
      undefined,
      controller.signal
    ) as MangaDexAtHomeResponse
  } finally {
    clearTimeout(timer)
  }

  if (responseJson.result && responseJson.result !== 'ok') {
    throw createError({ statusCode: 502, statusMessage: 'MangaDex at-home request failed' })
  }

  const baseUrl       = responseJson.baseUrl?.trim() || ''
  const chapterHash   = responseJson.chapter?.hash?.trim() || ''
  const dataFilenames = responseJson.chapter?.data || []
  const saverFilenames = responseJson.chapter?.dataSaver || []

  let effectiveQuality: 'data' | 'data-saver' = quality
  let filenames = quality === 'data' ? dataFilenames : saverFilenames

  if (filenames.length === 0 && quality === 'data-saver' && dataFilenames.length > 0) {
    filenames = dataFilenames
    effectiveQuality = 'data'
  }

  if (!baseUrl || !chapterHash || filenames.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'No images available for this chapter' })
  }

  const pages = filenames.map((filename, index) => ({
    filename,
    index,
    url: `${baseUrl}/${effectiveQuality}/${chapterHash}/${filename}`
  }))

  return { chapterId, quality: effectiveQuality, baseUrl, hash: chapterHash, pages }
}