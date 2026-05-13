import { createError } from 'h3'

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

// ── Encoding/decoding chiavi capitolo ────────────────────────────────────────

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
  if (url) return toBase64Url(`url:${url}`)

  const id = String(input.id || '').trim()
  if (id) return toBase64Url(`id:${id}`)

  return ''
}

export function decodeComickChapterKey(encoded: string) {
  try {
    const decoded = fromBase64Url(String(encoded || '').trim())
    if (decoded.startsWith('url:')) return { type: 'url', value: decoded.slice(4) }
    if (decoded.startsWith('id:'))  return { type: 'id',  value: decoded.slice(3) }
    return { type: 'raw', value: decoded }
  } catch {
    return { type: 'raw', value: String(encoded || '').trim() }
  }
}

// ── Matching titoli ───────────────────────────────────────────────────────────

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

export function pickComickMatch(results: ComickSearchResult[], titleCandidates: string[]) {
  if (!Array.isArray(results) || results.length === 0) return null

  const normalizedCandidates = titleCandidates
    .map((title) => normalizeTitle(String(title || '')))
    .filter(Boolean)

  if (normalizedCandidates.length === 0) return results[0]

  const exactMatch = results.find((result) => {
    const title = normalizeTitle(String(result.title || ''))
    return normalizedCandidates.includes(title)
  })
  if (exactMatch) return exactMatch

  const partialMatch = results.find((result) => {
    const title = normalizeTitle(String(result.title || ''))
    return normalizedCandidates.some(
      (candidate) => title.includes(candidate) || candidate.includes(title)
    )
  })
  return partialMatch ?? results[0]
}

// ── Normalizzazione capitoli ──────────────────────────────────────────────────

export function normalizeComickChapters(chapters: ComickChapter[] = []) {
  return chapters
    .map((chapter) => {
      // Bug originale: se chapter è null/undefined il map esplodeva
      if (!chapter || typeof chapter !== 'object') return null

      const contentUrl = String(chapter.url || '').trim() || null
      const id = encodeComickChapterKey({ url: contentUrl, id: chapter.id })
      if (!id) return null

      // Sia `number` che `chapter` sono usati dalle diverse sorgenti Comick
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

// ── HTTP helper ───────────────────────────────────────────────────────────────

/**
 * POST verso Comick Source API con supporto AbortSignal.
 * Bug originale: mancava il parametro `signal` → timeout impossibile → 504.
 * Bug originale: `createError` non era importato esplicitamente (funzionava solo
 *   negli handler Nitro grazie all'auto-import, ma non nelle utility pure).
 */
async function postComickJson(
  path: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal
): Promise<any> {
  const url = new URL(path, COMICK_API_BASE)

  let response: Response
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'AgarthaRead/1.0'
      },
      body: JSON.stringify(payload),
      signal
    })
  } catch (err) {
    // AbortError o errori di rete: rilanciamo così il chiamante può distinguerli
    throw err
  }

  if (!response.ok) {
    // Allega lo statusCode sull'errore in modo che buildNotice() in [id].get.ts
    // possa estrarlo correttamente tramite err?.statusCode
    const error: any = createError({
      statusCode: response.status,
      statusMessage: `Comick request failed with status ${response.status}`
    })
    error.statusCode = response.status
    throw error
  }

  return response.json()
}

// ── API pubbliche ─────────────────────────────────────────────────────────────

/**
 * POST /api/search — cerca un manga per titolo su una sorgente.
 * Aggiunto `signal` per supporto timeout dall'esterno.
 */
export async function searchComickManga(
  query: string,
  source = 'mangapark',
  signal?: AbortSignal
): Promise<ComickSearchResponse> {
  return postComickJson('/api/search', { query, source }, signal)
}

/**
 * POST /api/chapters — recupera la lista capitoli dato l'URL del manga.
 * Aggiunto `signal` per supporto timeout dall'esterno.
 * `source` è opzionale secondo la documentazione.
 */
export async function fetchComickChapters(
  url: string,
  source?: string,
  signal?: AbortSignal
): Promise<ComickChaptersResponse> {
  const body: Record<string, unknown> = { url }
  if (source) body.source = source
  return postComickJson('/api/chapters', body, signal)
}