import { getCache, setCache } from '../../utils/simpleCache'
import { getQuery } from 'h3'
import { fetchCachedJikanJson, normalizeJikanHomeItem } from '../../utils/jikan'

function parseQueryArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const sectionKeys = parseQueryArray(query.sections || query.section)
  const sectionTitles = parseQueryArray(query.titles || query.title)
  const hasCustomSections = sectionKeys.length > 0
  const cacheKey = `manga:home:${sectionKeys.join(',')}:${sectionTitles.join(',')}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const defaultSections = [
    { title: 'Popolari', key: 'top' },
    { title: 'Romantici', key: 'romance' }
  ]

  const sectionsDef = hasCustomSections
    ? sectionKeys.map((key, index) => ({
        title: sectionTitles[index] || key,
        key
      }))
    : defaultSections

  const sections: Array<any> = []

  for (const s of sectionsDef) {
    try {
      const normalizedKey = String(s.key || '').trim().toLowerCase()
      const params = new URLSearchParams()
      params.set('limit', '12')
      params.set('page', '1')

      const isTop = ['top', 'popular', 'popolari'].includes(normalizedKey)
      let path = '/manga'
      if (isTop) {
        path = '/top/manga'
        params.set('filter', 'bypopularity')
      } else if (normalizedKey) {
        params.set('q', normalizedKey)
        params.set('order_by', 'score')
        params.set('sort', 'desc')
      }

      let jikanJson: any
      try {
        const cacheKey = `jikan:home:${path}:${params.toString()}`
        jikanJson = await fetchCachedJikanJson(cacheKey, path, params, 30 * 60 * 1000)
      } catch (err: any) {
        const statusCode = err?.statusCode || err?.cause?.statusCode
        if (statusCode === 404 || statusCode === 400) {
          const fallbackParams = new URLSearchParams()
          fallbackParams.set('limit', '12')
          fallbackParams.set('page', '1')
          if (!isTop && normalizedKey) {
            fallbackParams.set('q', normalizedKey)
          }
          const fallbackPath = isTop ? '/top/manga' : '/manga'
          const fallbackCacheKey = `jikan:home:${fallbackPath}:${fallbackParams.toString()}`
          jikanJson = await fetchCachedJikanJson(fallbackCacheKey, fallbackPath, fallbackParams, 30 * 60 * 1000)
        } else {
          throw err
        }
      }
      const items = (jikanJson.data || []).slice(0, 12).map((manga: any) => normalizeJikanHomeItem(manga))

      sections.push({ title: s.title, items })
    } catch (err) {
      console.error(`Error fetching section ${s.title}:`, err)
      sections.push({ title: s.title, items: [] })
    }
  }

  const payload = { sections }
  setCache(cacheKey, payload, 60 * 60 * 1000)
  return payload
})
