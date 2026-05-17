import { getDb } from '../../db/client'
import { delCache, getCache, setCache } from '../../utils/simpleCache'
import { upsertExternalCatalogItem, incrementCatalogItemViews } from '../../utils/catalog'
import { catalogItems, catalogItemTranslations } from '../../db/schema'
import { getItemEngagementState } from '../../utils/engagement'
import { getSessionUser } from '../../utils/session'
import { getQuery } from 'h3'
import { and, desc, eq } from 'drizzle-orm'
import {
  collectAniListTitles,
  getAniListMangaById,
  normalizeAniListDetail,
  findMangaDexMatchByTitles
} from '../../utils/aniList'
import { extractMangaDexIdFromContentPath, fetchAllMangaDexFeedChapters, normalizeMangaDexDetail, normalizeMangaDexLanguageCode, summarizeMangaDexLanguages } from '../../utils/mangaDex'

const MANGADEX_CHAPTERS_FETCH_ERROR = 'Errore fetching MangaDex chapters.'

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
  const query = getQuery(event)
  const requestedLanguage = normalizeMangaDexLanguageCode(String(query.lang || query.language || '').trim())
  const db = getDb()
  const paramsId = event.context.params?.id
  const decodedId = normalizePathId(paramsId)
  const cacheKey = `manga:detail:v2:${decodedId}:${requestedLanguage || 'default'}`
  const cached = getCache(cacheKey)
  if (cached) {
    if (cached.chaptersNotice === MANGADEX_CHAPTERS_FETCH_ERROR) {
      delCache(cacheKey)
    } else {
      const payload = { ...cached }
      const itemId = await upsertExternalCatalogItem(db, {
        type: 'manga',
        externalProvider: 'anilist',
        externalId: String(payload.id || decodedId),
        title: payload.title,
        description: payload.description,
        language: payload.language,
        coverUrl: payload.coverUrl,
        contentFormat: 'image_sequence',
        contentPath: payload.mangaDexId ? `mangadex:${payload.mangaDexId}` : null
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
  }

  // Try to resolve AniList media by id first; if the provided id is not numeric or fails, try search by title
  let aniMedia: any = null
  try {
    const numericId = Number(decodedId)
    if (!Number.isNaN(numericId)) {
      aniMedia = await getAniListMangaById(numericId)
    }
    if (!aniMedia) {
      // fallback: search by title
      const results = await (await import('../../utils/aniList')).searchAniListManga(decodedId, 1, 1)
      aniMedia = (results && results[0]) || null
    }
  } catch (error) {
    throw createError({ statusCode: 503, statusMessage: 'AniList non disponibile' })
  }

  if (!aniMedia) {
    throw createError({ statusCode: 404, statusMessage: 'Manga not found on AniList' })
  }

  const basePayload = normalizeAniListDetail(aniMedia)

  // Try to find chapters on MangaDex by matching titles
  let chapters: any[] = []
  let chaptersSource: string | null = null
  let chaptersUrl: string | null = null
  let chaptersNotice: string | null = null
  let availableLanguages: string[] = []
  let availableLanguageCounts: Array<{ code: string; label: string; count: number }> = []
  let mangaDexId: string | null = null

  const existingCatalogItem = (await db
    .select()
    .from(catalogItems)
    .where(
      and(
        eq(catalogItems.source, 'api'),
        eq(catalogItems.type, 'manga'),
        eq(catalogItems.externalProvider, 'anilist'),
        eq(catalogItems.externalId, String(aniMedia.id))
      )
    )
    .limit(1))[0]

  if (existingCatalogItem) {
    const existingTranslation = (await db
      .select({ contentPath: catalogItemTranslations.contentPath })
      .from(catalogItemTranslations)
      .where(eq(catalogItemTranslations.itemId, existingCatalogItem.id))
      .orderBy(desc(catalogItemTranslations.id))
      .limit(1))[0]

    mangaDexId = extractMangaDexIdFromContentPath(existingTranslation?.contentPath || null)
  }

  try {
    const titleCandidates = collectAniListTitles(aniMedia)
    const mdMatch = mangaDexId ? null : await findMangaDexMatchByTitles(titleCandidates)
    if (!mangaDexId && mdMatch?.id) {
      mangaDexId = mdMatch.id
    }

    if (mangaDexId) {
      try {
        const mangaDexResponse = await fetchMangaDexJson(`/manga/${encodeURIComponent(mangaDexId)}`)
        const mangaDexManga = mangaDexResponse?.data || mdMatch
        const feedChapters = await fetchAllMangaDexFeedChapters(mangaDexId)
        const normalized = normalizeMangaDexDetail(mangaDexManga, feedChapters)
        const allChapters = normalized.chapters || []
        availableLanguageCounts = summarizeMangaDexLanguages(feedChapters)
        availableLanguages = availableLanguageCounts.map((entry) => entry.code)
        const filteredChapters = requestedLanguage
          ? allChapters.filter((chapter: any) => normalizeMangaDexLanguageCode(chapter.language || null) === requestedLanguage)
          : allChapters

        chapters = filteredChapters
        chaptersSource = 'mangadex'
        chaptersUrl = `https://mangadex.org/title/${mangaDexId}`
        if (requestedLanguage && filteredChapters.length === 0) {
          chaptersNotice = `Nessun capitolo trovato nella lingua ${requestedLanguage.toUpperCase()}.`
        }
      } catch (err: any) {
        chapters = []
        chaptersSource = 'mangadex'
        chaptersUrl = mangaDexId ? `https://mangadex.org/title/${mangaDexId}` : null
        chaptersNotice = MANGADEX_CHAPTERS_FETCH_ERROR
      }
    }
    
    // If we found normalized chapters from MangaDex, prefer language from MangaDex
    if (chapters && chapters.length > 0 && mdMatch) {
      try {
        const mdNormalized = normalizeMangaDexDetail(mdMatch, [])
        if (mdNormalized.language) basePayload.language = mdNormalized.language
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    console.warn('MangaDex chapter fetch failed:', err)
  }

  const payloadWithChapters = {
    ...basePayload,
    chapters,
    chapterCount: (chapters && chapters.length) || basePayload.chapterCount,
    chaptersSource,
    chaptersUrl,
    chaptersNotice,
    selectedLanguage: requestedLanguage || basePayload.language || null,
    mangaDexId,
    availableLanguages: Array.from(new Set([
      ...availableLanguages,
      ...(chapters.map((chapter: any) => chapter.language).filter(Boolean) || [])
    ])),
    availableLanguageCounts
  }

  if (chaptersNotice !== MANGADEX_CHAPTERS_FETCH_ERROR) {
    setCache(cacheKey, payloadWithChapters, 60 * 60 * 1000)
  }

  const payload = { ...payloadWithChapters }
  const itemId = await upsertExternalCatalogItem(db, {
    type: 'manga',
    externalProvider: 'anilist',
    externalId: String(aniMedia.id || decodedId),
    title: payload.title,
    description: payload.description,
    language: payload.language,
    coverUrl: payload.coverUrl,
    contentFormat: 'image_sequence',
    contentPath: mangaDexId ? `mangadex:${mangaDexId}` : null
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