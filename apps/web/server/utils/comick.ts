const COMICK_API_BASE = 'https://comick-source-api.notaspider.dev'

type ComickSearchResult = {
  id?: string
  title?: string
  url?: string
  coverImage?: string
  latestChapter?: number | string
  lastUpdated?: string
  source?: string
}

type ComickSearchResponse = {
  results?: ComickSearchResult[]
  source?: string
}

type ComickChapter = {
  id?: string
  number?: number | string
  chapter?: number | string
  title?: string
  url?: string
  language?: string
  publishedAt?: string
  volume?: number | string
}

type ComickChaptersResponse = {
  chapters?: ComickChapter[]
  source?: string
  totalChapters?: number | string
}

type NormalizedComickChapter = {
  id: string
  title: string
  chapter: number | string | null
  volume: number | string | null
  language: string | null
  publishedAt: string | null
  pages: null
  contentUrl: string | null
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const paddingLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(paddingLength)
  return Buffer.from(padded, 'base64').toString('utf8')
}

export function encodeComickChapterKey(input: { url?: string | null; id?: string | null }) {
  const url = String(input.url || '').trim()
  if (url) {
    return toBase64Url(`url:${url}`)
  }

  const id = String(input.id || '').trim()
  if (id) {
    return toBase64Url(`id:${id}`)
  }

  return ''
}

export function decodeComickChapterKey(encoded: string) {
  try {
    const decoded = fromBase64Url(String(encoded || '').trim())
    if (decoded.startsWith('url:')) {
      return { type: 'url', value: decoded.slice(4) }
    }
    if (decoded.startsWith('id:')) {
      return { type: 'id', value: decoded.slice(3) }
    }
    return { type: 'raw', value: decoded }
  } catch (error) {
    console.error('Failed to decode Comick chapter key:', error)
    return { type: 'raw', value: String(encoded || '').trim() }
  }
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

function pickBestByChapters(candidates: ComickSearchResult[]) {
  return candidates.reduce((best, current) => {
    const bestChapters = Number(best.latestChapter ?? 0)
    const currentChapters = Number(current.latestChapter ?? 0)
    return currentChapters > bestChapters ? current : best
  })
}

export function pickComickMatch(results: ComickSearchResult[], titleCandidates: string[]) {
  if (!Array.isArray(results) || results.length === 0) return null

  const normalizedCandidates = titleCandidates
    .map((title) => normalizeTitle(String(title || '')))
    .filter(Boolean)

  if (normalizedCandidates.length === 0) return pickBestByChapters(results)

  const exactMatches = results.filter((result) => {
    const title = normalizeTitle(String(result.title || ''))
    return normalizedCandidates.includes(title)
  })

  if (exactMatches.length > 0) return pickBestByChapters(exactMatches)

  const partialMatches = results.filter((result) => {
    const title = normalizeTitle(String(result.title || ''))
    return normalizedCandidates.some((candidate) => title.includes(candidate) || candidate.includes(title))
  })

  if (partialMatches.length > 0) return pickBestByChapters(partialMatches)

  return pickBestByChapters(results)
}

export function normalizeComickChapters(chapters: ComickChapter[] = []) {
  return chapters
    .map((chapter) => {
      const contentUrl = String(chapter.url || '').trim() || null
      const id = encodeComickChapterKey({ url: contentUrl, id: chapter.id })
      if (!id) return null

      const chapterNumber = chapter.number ?? chapter.chapter ?? null
      const normalized: NormalizedComickChapter = {
        id,
        title: String(chapter.title || '').trim(),
        chapter: chapterNumber ?? null,
        volume: chapter.volume ?? null,
        language: chapter.language ?? null,
        publishedAt: chapter.publishedAt ?? null,
        pages: null,
        contentUrl
      }

      return normalized
    })
    .filter((chapter): chapter is NormalizedComickChapter => Boolean(chapter))
}

async function postComickJson(path: string, payload: Record<string, unknown>) {
  const url = new URL(path, COMICK_API_BASE)
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'AgarthaRead/1.0'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: `Comick request failed with status ${response.status}`
    })
  }

  const text = await response.text()
  const lines = text.split('\n').filter(Boolean)

  // Se è una sola riga, è una risposta normale (es. /api/chapters)
  if (lines.length === 1) {
    return JSON.parse(lines[0])
  }

  // Risposta streaming NDJSON (es. /api/search con source: 'all')
  // Aggrega tutti i risultati da tutte le source
  const allResults: any[] = []
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)
      if (Array.isArray(parsed.results) && parsed.results.length > 0) {
        // Inietta la source nel singolo risultato se non ce l'ha già
        const withSource = parsed.results.map((r: any) => ({
          ...r,
          source: r.source || parsed.source || null
        }))
        allResults.push(...withSource)
      }
    } catch {
      // ignora righe non parsabili
    }
  }

  return { results: allResults, source: 'all' }
}

export async function searchComickManga(query: string, source = 'all'): Promise<ComickSearchResponse> {
  return await postComickJson('/api/search', {
    query,
    source
  })
}

export async function fetchComickChapters(url: string, source?: string): Promise<ComickChaptersResponse> {
  return await postComickJson('/api/chapters', {
    url,
    source
  })
}