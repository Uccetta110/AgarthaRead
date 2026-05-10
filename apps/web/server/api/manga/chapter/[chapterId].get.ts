import { getCache, setCache } from '../../../utils/simpleCache'
import { fetchMangaDexJson, resolveMangaDexChapterPages, type MangaDexChapterPages } from '../../../utils/mangaDex'

function normalizeChapterId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

export default defineEventHandler(async (event) => {
  const chapterId = normalizeChapterId(event.context.params?.chapterId)
  const quality = event.context.params?.quality === 'data' ? 'data' : 'data-saver'
  const cacheKey = `manga:chapter:${chapterId}:${quality}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const chapterMetaJson = await fetchMangaDexJson(`/chapter/${encodeURIComponent(chapterId)}`)
  const chapterAttributes = chapterMetaJson.data?.attributes || {}
  const metaPagesCount = Number(chapterAttributes.pages || 0)
  const externalUrl = chapterAttributes.externalUrl || null

  const emptyPayload: MangaDexChapterPages = {
    chapterId,
    quality,
    baseUrl: '',
    hash: '',
    pages: []
  }

  let payload: MangaDexChapterPages = emptyPayload

  if (metaPagesCount > 0 && !externalUrl) {
    try {
      payload = await resolveMangaDexChapterPages(chapterId, quality)
    } catch (error) {
      payload = emptyPayload
    }
  }
  const enrichedPayload = {
    ...payload,
    chapter: chapterAttributes.chapter || null,
    title: chapterAttributes.title || '',
    volume: chapterAttributes.volume || null,
    language: chapterAttributes.translatedLanguage || null,
    publishedAt: chapterAttributes.publishAt || chapterAttributes.createdAt || null,
    pagesCount: payload.pages.length || metaPagesCount,
    externalUrl
  }
  setCache(cacheKey, enrichedPayload, 10 * 60 * 1000)
  return enrichedPayload
})