import { getDb } from '../../db/client'
import { getCache, setCache } from '../../utils/simpleCache'
import { upsertExternalCatalogItem, incrementCatalogItemViews } from '../../utils/catalog'
import { getItemEngagementState } from '../../utils/engagement'
import { getSessionUser } from '../../utils/session'
import {
  fetchMangaDexJson,
  normalizeMangaDexDetail
} from '../../utils/mangaDex'

type MangaDexFeedChapter = {
  id: string
  attributes?: Record<string, unknown>
}

function normalizePathId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
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
      externalProvider: 'mangadex',
      externalId: decodedId,
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

  const mangaDexParams = new URLSearchParams()
  mangaDexParams.append('includes[]', 'author')
  mangaDexParams.append('includes[]', 'artist')
  mangaDexParams.append('includes[]', 'cover_art')

  const mangaDexJson = await fetchMangaDexJson(`/manga/${encodeURIComponent(decodedId)}`, mangaDexParams)
  const mangaDexData = mangaDexJson.data || null

  if (!mangaDexData?.id) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Manga not found on MangaDex'
    })
  }

  const chapterParams = new URLSearchParams()
  chapterParams.append('translatedLanguage[]', 'it')
  chapterParams.append('translatedLanguage[]', 'en')
  chapterParams.set('limit', '100')
  chapterParams.set('offset', '0')
  chapterParams.set('order[chapter]', 'asc')

  let chapterJson = await fetchMangaDexJson(`/manga/${encodeURIComponent(decodedId)}/feed`, chapterParams)
  let chapters = ((chapterJson.data || []) as MangaDexFeedChapter[]).map((chapter) => ({
    id: chapter.id,
    attributes: chapter.attributes
  }))

  if (chapters.length === 0) {
    const fallbackChapterParams = new URLSearchParams()
    fallbackChapterParams.set('limit', '100')
    fallbackChapterParams.set('offset', '0')
    fallbackChapterParams.set('order[chapter]', 'asc')

    chapterJson = await fetchMangaDexJson(`/manga/${encodeURIComponent(decodedId)}/feed`, fallbackChapterParams)
    chapters = ((chapterJson.data || []) as MangaDexFeedChapter[]).map((chapter) => ({
      id: chapter.id,
      attributes: chapter.attributes
    }))
  }

  const basePayload = normalizeMangaDexDetail(mangaDexData, chapters)
  setCache(cacheKey, basePayload, 60 * 60 * 1000)

  const payload = { ...basePayload }
  const db = getDb()
  const itemId = await upsertExternalCatalogItem(db, {
    type: 'manga',
    externalProvider: 'mangadex',
    externalId: decodedId,
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
