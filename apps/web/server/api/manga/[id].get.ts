import { getDb } from '../../db/client'
import { getCache, setCache } from '../../utils/simpleCache'
import { upsertExternalCatalogItem, incrementCatalogItemViews } from '../../utils/catalog'
import { getItemEngagementState } from '../../utils/engagement'
import { getSessionUser } from '../../utils/session'
import { collectJikanTitles, fetchCachedJikanJson, normalizeJikanDetail } from '../../utils/jikan'
import {
  fetchComickChapters,
  normalizeComickChapters,
  pickComickMatch,
  searchComickManga
} from '../../utils/comick'

const JIKAN_TIMEOUT_MS  = 10_000
const COMICK_TIMEOUT_MS =  8_000

function normalizePathId(paramsId: string | string[] | undefined) {
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

async function resolveComickPayload(titleCandidates: string[]) {
  const primaryTitle = String(titleCandidates[0] || '').trim()
  if (!primaryTitle) {
    return { chapters: [], chaptersSource: null, chaptersUrl: null, notice: null }
  }

  const buildNotice = (err?: unknown): string => {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'Comick non disponibile (timeout).'
    }
    const statusCode = (err as any)?.statusCode ?? (err as any)?.cause?.statusCode
    if (statusCode) return `Comick non disponibile (HTTP ${statusCode}).`
    return 'Comick non disponibile.'
  }

  let searchJson: any
  try {
    searchJson = await searchComickManga(primaryTitle, 'mangapark', timeoutSignal(COMICK_TIMEOUT_MS))
  } catch (err) {
    return { chapters: [], chaptersSource: null, chaptersUrl: null, notice: buildNotice(err) }
  }

  const results = Array.isArray(searchJson.results) ? searchJson.results : []
  const match = pickComickMatch(results, titleCandidates)
  const matchUrl = String(match?.url || '').trim()

  if (!matchUrl) {
    return { chapters: [], chaptersSource: searchJson.source ?? null, chaptersUrl: null, notice: null }
  }

  const normalizedSource = String(searchJson.source || 'mangapark').trim().toLowerCase()

  let chaptersJson: any
  try {
    chaptersJson = await fetchComickChapters(
      matchUrl,
      normalizedSource || 'mangapark',
      timeoutSignal(COMICK_TIMEOUT_MS)
    )
  } catch (err) {
    return {
      chapters: [],
      chaptersSource: searchJson.source ?? null,
      chaptersUrl: matchUrl,
      notice: buildNotice(err)
    }
  }

  const chapters = normalizeComickChapters(chaptersJson.chapters || [])

  return {
    chapters,
    chaptersSource: chaptersJson.source ?? searchJson.source ?? null,
    chaptersUrl: matchUrl,
    notice: null
  }
}

export default defineEventHandler(async (event) => {
  const paramsId = event.context.params?.id
  const decodedId = normalizePathId(paramsId)

  // FIX: chiave della route separata da quella Jikan — risolve il variable shadowing
  // originale: la seconda `const cacheKey` dentro il try oscurava la prima,
  // setCache finiva per usare la chiave sbagliata → cache miss infiniti → 500.
  const routeCacheKey = `manga:detail:${decodedId}`

  const cached = getCache(routeCacheKey)
  if (cached) {
    const payload = { ...cached }
    const db = getDb()
    const itemId = await upsertExternalCatalogItem(db, {
      type: 'manga',
      externalProvider: 'jikan',
      externalId: String(payload.id || decodedId),
      title: payload.title,
      description: payload.description,
      language: payload.language,
      coverUrl: payload.coverUrl,
      contentFormat: 'image_sequence'
    })
    await incrementCatalogItemViews(db, itemId)

    const user = await getSessionUser(event)
    const engagement = await getItemEngagementState(db, itemId, user?.id ?? null)

    return {
      ...payload,
      internalId: itemId,
      commentsCount: engagement.commentsCount,
      likesCount: engagement.likesCount,
      isLiked: engagement.isLiked,
      isSaved: engagement.isSaved,
      isPurchased: engagement.isPurchased,
      canLike: engagement.canLike,
      canComment: engagement.canComment
    }
  }

  // ── Jikan: GET /manga/{id} ────────────────────────────────────────────────
  // FIX: la firma originale di fetchCachedJikanJson era (cacheKey, path, params?, ttlMs?)
  // con params come URLSearchParams; passando AbortSignal come terzo arg veniva
  // silenziosamente ignorato — nessun timeout possibile → 504.
  // La nuova firma è (cacheKey, path, signal?, ttlMs?, ...).
  const jikanCacheKey = `jikan:detail:${decodedId}`

  let jikanJson: any
  try {
    jikanJson = await fetchCachedJikanJson(
      jikanCacheKey,
      `/manga/${encodeURIComponent(decodedId)}`,
      timeoutSignal(JIKAN_TIMEOUT_MS),
      60 * 60 * 1000
    )
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    throw createError({
      statusCode: isTimeout ? 504 : 503,
      statusMessage: isTimeout ? 'Jikan timeout' : 'Jikan non disponibile'
    })
  }

  const mangaData = jikanJson?.data ?? null
  if (!mangaData?.mal_id) {
    throw createError({ statusCode: 404, statusMessage: 'Manga not found on Jikan' })
  }

  const basePayload = normalizeJikanDetail(mangaData)

  // Comick è opzionale: se fallisce non blocca la risposta
  let comickPayload = {
    chapters: [] as any[],
    chaptersSource: null as string | null,
    chaptersUrl: null as string | null,
    notice: null as string | null
  }
  try {
    const titles = collectJikanTitles(mangaData)
    comickPayload = await resolveComickPayload(titles)
  } catch (error) {
    console.warn('[manga/detail] Comick chapter fetch failed:', error)
  }

  const payloadWithChapters = {
    ...basePayload,
    chapters: comickPayload.chapters,
    chapterCount: comickPayload.chapters.length || basePayload.chapterCount,
    chaptersSource: comickPayload.chaptersSource,
    chaptersUrl: comickPayload.chaptersUrl,
    chaptersNotice: comickPayload.notice
  }

  setCache(routeCacheKey, payloadWithChapters, 60 * 60 * 1000)

  const db = getDb()
  const itemId = await upsertExternalCatalogItem(db, {
    type: 'manga',
    externalProvider: 'jikan',
    externalId: String(mangaData.mal_id || decodedId),
    title: payloadWithChapters.title,
    description: payloadWithChapters.description,
    language: payloadWithChapters.language,
    coverUrl: payloadWithChapters.coverUrl,
    contentFormat: 'image_sequence'
  })
  await incrementCatalogItemViews(db, itemId)

  const user = await getSessionUser(event)
  const engagement = await getItemEngagementState(db, itemId, user?.id ?? null)

  return {
    ...payloadWithChapters,
    internalId: itemId,
    commentsCount: engagement.commentsCount,
    likesCount: engagement.likesCount,
    isLiked: engagement.isLiked,
    isSaved: engagement.isSaved,
    isPurchased: engagement.isPurchased,
    canLike: engagement.canLike,
    canComment: engagement.canComment
  }
})