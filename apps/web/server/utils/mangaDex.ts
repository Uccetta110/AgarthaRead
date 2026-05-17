import { getCache, setCache } from './simpleCache'

const MANGADEX_API_BASE = 'https://api.mangadex.org'
const MANGADEX_COVER_BASE = 'https://uploads.mangadex.org/covers'

const MANGADEX_LANGUAGE_ALIASES: Record<string, string> = {
  'en-au': 'en',
  'en-ca': 'en',
  'en-gb': 'en',
  'en-us': 'en',
  'zh-cn': 'zh',
  'zh-hk': 'zh',
  'zh-tw': 'zh'
}

const MANGADEX_LANGUAGE_LABELS: Record<string, string> = {
  ar: 'Arabic',
  ca: 'Catalan',
  de: 'German',
  el: 'Greek',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  he: 'Hebrew',
  hi: 'Hindi',
  id: 'Indonesian',
  it: 'Italiano',
  ja: 'Japanese',
  pl: 'Polish',
  pt: 'Portuguese',
  'pt-br': 'Portuguese (Brazil)',
  ru: 'Russian',
  th: 'Thai',
  uk: 'Ukrainian',
  vi: 'Vietnamese',
  zh: 'Chinese'
}

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
      const selected: string = pickLocalizedText(value, preferredLocales)
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
  return (relationships || []).filter((relationship) => relationship?.type && types.includes(relationship.type))
}

export function extractMangaDexAuthors(relationships: Relationship[] = []) {
  const authorNames = getRelationships(relationships, ['author', 'artist'])
    .map((relationship) => pickLocalizedText(relationship.attributes?.name) || relationship.id || '')
    .filter(Boolean)

  return Array.from(new Set(authorNames))
}

export function extractMangaDexCoverUrl(mangaId: string, relationships: Relationship[] = []) {
  const coverRelationship = getRelationships(relationships, ['cover_art'])[0]
  const fileName = coverRelationship?.attributes?.fileName || coverRelationship?.attributes?.filename || coverRelationship?.attributes?.file_name
  if (!fileName) return null
  return `${MANGADEX_COVER_BASE}/${mangaId}/${fileName}.512.jpg`
}

export function extractMangaDexTags(tags: any[] = []) {
  return tags
    .map((tag) => pickLocalizedText(tag?.attributes?.name) || tag?.attributes?.name?.en || tag?.id || '')
    .filter(Boolean)
}

export function normalizeMangaDexLanguageCode(language?: string | null): string {
  const raw = String(language || '').trim().toLowerCase()
  if (!raw) return ''
  return MANGADEX_LANGUAGE_ALIASES[raw] || raw
}

export function getMangaDexLanguageLabel(language?: string | null): string {
  const normalized = normalizeMangaDexLanguageCode(language)
  if (!normalized) return ''
  return MANGADEX_LANGUAGE_LABELS[normalized] || normalized.toUpperCase()
}

export function summarizeMangaDexLanguages(chapters: MangaDexChapter[] = []) {
  const counts = new Map<string, number>()

  for (const chapter of chapters) {
    const code = normalizeMangaDexLanguageCode(chapter?.attributes?.translatedLanguage)
    if (!code) continue
    counts.set(code, (counts.get(code) || 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([code, count]) => ({ code, label: getMangaDexLanguageLabel(code), count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
}

export async function resolveMangaDexTagIds(tagNames: string[] = []) {
  const normalizedNames = tagNames
    .map((tagName) => String(tagName || '').trim().toLowerCase())
    .filter(Boolean)

  if (normalizedNames.length === 0) return []

  const cacheKey = `mangadex:tag-ids:${normalizedNames.join(',')}`
  const cached = getCache(cacheKey)
  if (cached) return cached as string[]

  const responseJson = await fetchMangaDexJson('/manga/tag')
  const tagIds = (responseJson.data || [])
    .filter((tag: any) => {
      const tagName = pickLocalizedText(tag?.attributes?.name).toLowerCase()
      return normalizedNames.some((candidate) => tagName === candidate || tagName.includes(candidate) || candidate.includes(tagName))
    })
    .map((tag: any) => tag.id)

  setCache(cacheKey, tagIds, 24 * 60 * 60 * 1000)
  return tagIds
}

export function normalizeMangaDexHomeItem(manga: MangaDexManga) {
  const attributes = manga.attributes || {}
  const relationships = manga.relationships || []

  return {
    id: manga.id,
    type: 'manga',
    source: 'mangadex',
    title: pickLocalizedText(attributes.title) || 'Titolo non disponibile',
    subtitle: [attributes.status, attributes.year].filter(Boolean).join(' • '),
    authors: extractMangaDexAuthors(relationships),
    description: pickLocalizedText(attributes.description) || '',
    cover: extractMangaDexCoverUrl(manga.id, relationships),
    contentUrl: `https://mangadex.org/title/${manga.id}`,
    language: attributes.originalLanguage || null,
    publishedAt: attributes.year ? String(attributes.year) : null,
    tags: extractMangaDexTags(attributes.tags || []),
    chapterCount: Number(attributes.lastChapter || 0) || null
  }
}

export function normalizeMangaDexChapter(chapter: MangaDexChapter) {
  const attributes = chapter.attributes || {}

  return {
    id: chapter.id,
    title: attributes.title || '',
    chapter: attributes.chapter || null,
    volume: attributes.volume || null,
    language: normalizeMangaDexLanguageCode(attributes.translatedLanguage || null) || null,
    publishedAt: attributes.publishAt || attributes.createdAt || null,
    pages: Number(attributes.pages || 0) || null,
    contentUrl: `https://mangadex.org/chapter/${chapter.id}`
  }
}

export function normalizeMangaDexDetail(manga: MangaDexManga, chapters: MangaDexChapter[] = []) {
  const attributes = manga.attributes || {}
  const relationships = manga.relationships || []

  return {
    id: manga.id,
    type: 'manga',
    source: 'mangadex',
    title: pickLocalizedText(attributes.title) || 'Titolo non disponibile',
    subtitle: [attributes.status, attributes.year, attributes.publicationDemographic].filter(Boolean).join(' • '),
    authors: extractMangaDexAuthors(relationships),
    description: pickLocalizedText(attributes.description) || '',
    coverUrl: extractMangaDexCoverUrl(manga.id, relationships),
    contentUrl: `https://mangadex.org/title/${manga.id}`,
    language: attributes.originalLanguage || null,
    publishedAt: attributes.year ? String(attributes.year) : attributes.createdAt || null,
    tags: extractMangaDexTags(attributes.tags || []),
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

export async function fetchMangaDexJson(path: string, params?: URLSearchParams) {
  const url = new URL(path, MANGADEX_API_BASE)
  if (params) url.search = params.toString()

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' }
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: `MangaDex request failed with status ${response.status}`
    })
  }

  return await response.json()
}

export function extractMangaDexIdFromContentPath(contentPath?: string | null) {
  const raw = String(contentPath || '').trim()
  if (!raw) return null
  const match = raw.match(/^mangadex:([a-z0-9-]+)$/i)
  return match?.[1] || null
}

export async function fetchAllMangaDexFeedChapters(mangaId: string, limit = 100) {
  const chapters: MangaDexChapter[] = []
  let offset = 0

  while (true) {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    params.set('order[chapter]', 'asc')

    const responseJson = await fetchMangaDexJson(`/manga/${encodeURIComponent(mangaId)}/feed`, params)
    const batch = Array.isArray(responseJson?.data) ? responseJson.data : []
    chapters.push(...batch)

    const total = Number(responseJson?.total || responseJson?.result?.total || 0)
    if (batch.length < limit || (total && chapters.length >= total)) break
    offset += limit
  }

  return chapters
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

export async function resolveMangaDexChapterPages(chapterId: string, quality: 'data' | 'data-saver' = 'data-saver'): Promise<MangaDexChapterPages> {
  const responseJson = (await fetchMangaDexJson(`/at-home/server/${encodeURIComponent(chapterId)}`)) as MangaDexAtHomeResponse
  if (responseJson.result && responseJson.result !== 'ok') {
    throw createError({
      statusCode: 502,
      statusMessage: 'MangaDex at-home request failed'
    })
  }

  const baseUrl = responseJson.baseUrl?.trim() || ''
  const chapterHash = responseJson.chapter?.hash?.trim() || ''
  const dataFilenames = responseJson.chapter?.data || []
  const dataSaverFilenames = responseJson.chapter?.dataSaver || []
  let effectiveQuality: 'data' | 'data-saver' = quality
  let filenames = quality === 'data' ? dataFilenames : dataSaverFilenames

  if (filenames.length === 0 && quality === 'data-saver' && dataFilenames.length > 0) {
    filenames = dataFilenames
    effectiveQuality = 'data'
  }

  if (!baseUrl || !chapterHash || filenames.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No images available for this chapter'
    })
  }

  const pages = filenames.map((filename, index) => ({
    filename,
    index,
    url: `${baseUrl}/${effectiveQuality}/${chapterHash}/${filename}`
  }))

  return {
    chapterId,
    quality: effectiveQuality,
    baseUrl,
    hash: chapterHash,
    pages
  }
}