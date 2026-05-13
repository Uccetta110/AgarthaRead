import { getCache, setCache } from '../../../utils/simpleCache'
import { decodeComickChapterKey } from '../../../utils/comick'

function normalizeChapterId(paramsId: string | string[] | undefined) {
  const rawId = Array.isArray(paramsId) ? paramsId.join('/') : String(paramsId || '')
  return decodeURIComponent(rawId)
}

export default defineEventHandler(async (event) => {
  const chapterId = normalizeChapterId(event.context.params?.chapterId)
  const cacheKey = `manga:chapter:${chapterId}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const decoded = decodeComickChapterKey(chapterId)
  const chapterUrl = decoded.type === 'url' ? decoded.value : null

  const payload = {
    chapterId,
    source: 'flamecomics',
    chapterUrl,
    pages: [],
    pagesCount: 0,
    readerAvailable: false
  }

  setCache(cacheKey, payload, 10 * 60 * 1000)
  return payload
})