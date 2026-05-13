import { getCache, setCache } from '../../../utils/simpleCache'
import { decodeComickChapterKey, fetchComickChapters, normalizeComickChapters } from '../../../utils/comick'

const COMICK_TIMEOUT_MS = 8_000

function normalizeChapterId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
    (timer as any).unref()
  }
  return controller.signal
}

export default defineEventHandler(async (event) => {
  const chapterId = normalizeChapterId(event.context.params?.chapterId)
  const cacheKey = `manga:chapter:${chapterId}`

  const cached = getCache(cacheKey)
  if (cached) return cached

  const decoded = decodeComickChapterKey(chapterId)
  const chapterUrl = decoded.type === 'url' ? decoded.value : null

  // FIX originale: il file non eseguiva nessuna fetch reale e restituiva sempre
  // pages: [] senza dati. Ora chiama davvero POST /api/chapters.
  if (!chapterUrl) {
    const emptyPayload = {
      chapterId,
      source: 'comick',
      chapterUrl: null,
      pages: [],
      pagesCount: 0,
      readerAvailable: false,
      notice: 'URL capitolo non disponibile.'
    }
    // TTL breve: potrebbe arrivare un ID valido in seguito
    setCache(cacheKey, emptyPayload, 2 * 60 * 1000)
    return emptyPayload
  }

  // POST /api/chapters — body: { url, source? }
  let chapters: any[] = []
  let pagesCount = 0
  let notice: string | null = null
  let readerAvailable = false

  try {
    const chaptersJson = await fetchComickChapters(
      chapterUrl,
      'mangapark',
      timeoutSignal(COMICK_TIMEOUT_MS)
    )
    chapters = normalizeComickChapters(chaptersJson.chapters || [])
    pagesCount = chapters.length
    readerAvailable = pagesCount > 0
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      notice = 'Comick non disponibile (timeout).'
    } else {
      const statusCode = (err as any)?.statusCode ?? (err as any)?.cause?.statusCode
      notice = statusCode
        ? `Comick non disponibile (HTTP ${statusCode}).`
        : 'Comick non disponibile.'
    }
  }

  const payload = {
    chapterId,
    source: 'comick',
    chapterUrl,
    pages: chapters,
    pagesCount,
    readerAvailable,
    notice
  }

  // Cache più breve se non abbiamo dati utili, normale altrimenti
  setCache(cacheKey, payload, readerAvailable ? 10 * 60 * 1000 : 2 * 60 * 1000)
  return payload
})