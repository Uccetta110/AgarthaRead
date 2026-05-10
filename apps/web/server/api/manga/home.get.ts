import { getCache, setCache } from '../../utils/simpleCache'
import { getQuery } from 'h3'
import {
  fetchMangaDexJson,
  normalizeMangaDexHomeItem,
  resolveMangaDexTagIds
} from '../../utils/mangaDex'

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
      const params = new URLSearchParams()
      params.set('limit', '12')
      params.append('includes[]', 'author')
      params.append('includes[]', 'artist')
      params.append('includes[]', 'cover_art')
      params.append('availableTranslatedLanguage[]', 'it')
      params.append('availableTranslatedLanguage[]', 'en')

      const normalizedKey = String(s.key || '').trim().toLowerCase()
      if (normalizedKey === 'top' || normalizedKey === 'popular' || normalizedKey === 'popolari') {
        params.set('order[followedCount]', 'desc')
      } else {
        const tagIds = await resolveMangaDexTagIds([normalizedKey, String(s.title || '')])
        if (tagIds.length > 0) {
          tagIds.forEach((tagId: string) => params.append('includedTags[]', tagId))
        } else if (normalizedKey) {
          params.set('title', normalizedKey)
        }
      }

      const mangaDexJson = await fetchMangaDexJson('/manga', params)
      const mangaDexItems = (mangaDexJson.data || []).slice(0, 12).map((manga: any) => normalizeMangaDexHomeItem(manga))

      sections.push({ title: s.title, items: mangaDexItems })
    } catch (err) {
      console.error(`Error fetching section ${s.title}:`, err)
      sections.push({ title: s.title, items: [] })
    }
  }

  const payload = { sections }
  setCache(cacheKey, payload, 60 * 60 * 1000)
  return payload
})
