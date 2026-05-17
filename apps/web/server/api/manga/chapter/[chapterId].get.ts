import { getCache, setCache } from '../../../utils/simpleCache'
import { resolveMangaDexChapterPages } from '../../../utils/mangaDex'

function normalizeChapterId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

export default defineEventHandler(async (event) => {
  const chapterId = normalizeChapterId(event.context.params?.chapterId)
  const cacheKey = `manga:chapter:${chapterId}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  try {
    const pagesResult = await resolveMangaDexChapterPages(chapterId)

    const payload = {
      chapterId,
      source: 'mangadex',
      chapterUrl: `https://mangadex.org/chapter/${encodeURIComponent(chapterId)}`,
      baseUrl: pagesResult.baseUrl,
      hash: pagesResult.hash,
      quality: pagesResult.quality,
      pages: pagesResult.pages,
      pagesCount: pagesResult.pages.length,
      readerAvailable: true,
      unavailableReason: null
    }

    setCache(cacheKey, payload, 10 * 60 * 1000)
    return payload
  } catch (error: any) {
    const statusCode = Number(error?.statusCode || error?.cause?.statusCode || 0)
    const payload = {
      chapterId,
      source: 'mangadex',
      chapterUrl: `https://mangadex.org/chapter/${encodeURIComponent(chapterId)}`,
      pages: [],
      pagesCount: 0,
      readerAvailable: false,
      unavailableReason: statusCode === 404
        ? 'Questo capitolo non espone immagini su MangaDex.'
        : 'Impossibile caricare le immagini del capitolo.'
    }

    setCache(cacheKey, payload, 2 * 60 * 1000)
    return payload
  }
})