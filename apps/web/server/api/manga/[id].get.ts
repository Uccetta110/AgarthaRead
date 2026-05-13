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

function normalizePathId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

async function resolveComickPayload(titleCandidates: string[]) {
  const primaryTitle = String(titleCandidates[0] || '').trim()
  if (!primaryTitle) {
    return { chapters: [], chaptersSource: null, chaptersUrl: null, notice: null }
  }

  const buildNotice = (statusCode?: number) => {
    if (!statusCode) return 'Comick non disponibile.'
    return `Comick non disponibile (HTTP ${statusCode}).`
  }

  let searchJson: any
  try {
    searchJson = await searchComickManga(primaryTitle)
  } catch (err: any) {
    const statusCode = err?.statusCode || err?.cause?.statusCode
    return {
      chapters: [],
      chaptersSource: null,
      chaptersUrl: null,
      notice: buildNotice(statusCode)
    }
  }

  const results = Array.isArray(searchJson.results) ? searchJson.results : []
  const match = pickComickMatch(results, titleCandidates)
  const matchUrl = String(match?.url || '').trim()

  if (!matchUrl) {
    return { chapters: [], chaptersSource: searchJson.source || null, chaptersUrl: null, notice: null }
  }

  const normalizedSource = String(match?.source || searchJson.source || '').trim().toLowerCase()
  let chaptersJson: any
  try {
    chaptersJson = await fetchComickChapters(matchUrl, normalizedSource || undefined)
  } catch (err: any) {
    const statusCode = err?.statusCode || err?.cause?.statusCode
    return {
      chapters: [],
      chaptersSource: searchJson.source || null,
      chaptersUrl: matchUrl,
      notice: buildNotice(statusCode)
    }
  }
  const chapters = normalizeComickChapters(chaptersJson.chapters || [])

  return {
    chapters,
    chaptersSource: chaptersJson.source || searchJson.source || null,
    chaptersUrl: matchUrl,
    notice: null
  }
}

export default defineEventHandler(async (event) => {
  const paramsId = event.context.params?.id
  const decodedId = normalizePathId(paramsId)
  const cacheKey = `manga:detail:${decodedId}`
  const cached = getCache(cacheKey)
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

  let jikanJson: any
  try {
    const cacheKey = `jikan:detail:${decodedId}`
    jikanJson = await fetchCachedJikanJson(cacheKey, `/manga/${encodeURIComponent(decodedId)}`, undefined, 60 * 60 * 1000)
  } catch (error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Jikan non disponibile'
    })
  }

  const mangaData = jikanJson.data || null

  if (!mangaData?.mal_id) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Manga not found on Jikan'
    })
  }

  const basePayload = normalizeJikanDetail(mangaData)

  let comickPayload = { chapters: [], chaptersSource: null as string | null, chaptersUrl: null as string | null, notice: null as string | null }
  try {
    const titles = collectJikanTitles(mangaData)
    comickPayload = await resolveComickPayload(titles)
  } catch (error) {
    console.warn('Comick chapter fetch failed:', error)
  }

  const payloadWithChapters = {
    ...basePayload,
    chapters: comickPayload.chapters,
    chapterCount: comickPayload.chapters.length || basePayload.chapterCount,
    chaptersSource: comickPayload.chaptersSource,
    chaptersUrl: comickPayload.chaptersUrl,
    chaptersNotice: comickPayload.notice
  }

  setCache(cacheKey, payloadWithChapters, 60 * 60 * 1000)

  const payload = { ...payloadWithChapters }
  const db = getDb()
  const itemId = await upsertExternalCatalogItem(db, {
    type: 'manga',
    externalProvider: 'jikan',
    externalId: String(mangaData.mal_id || decodedId),
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
})