import { getCache, setCache } from '../../utils/simpleCache'
import { getQuery } from 'h3'
import { searchAniListManga, normalizeAniListHomeItem } from '../../utils/aniList'

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
      const isTop = ['top', 'popular', 'popolari'].includes(normalizedKey)
      const searchQuery = isTop ? null : normalizedKey || null
      let results: any[] = []
      try {
        results = await searchAniListManga(searchQuery, 1, 12, isTop ? 'POPULARITY_DESC' : 'SCORE_DESC')
      } catch (err) {
        console.warn('AniList search failed for section', s.title, err)
        results = []
      }

      const items = (results || []).slice(0, 12).map((manga: any) => normalizeAniListHomeItem(manga))

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
