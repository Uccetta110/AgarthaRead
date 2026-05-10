import { getCache, setCache } from '../../utils/simpleCache'
import { getQuery } from 'h3'

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
    { title: 'Popolari', url: 'https://api.jikan.moe/v4/top/manga?limit=12' },
    { title: 'Romantici', url: 'https://api.jikan.moe/v4/manga?q=romance&limit=12' }
  ]

  const sectionsDef = hasCustomSections
    ? sectionKeys.map((key, index) => ({
        title: sectionTitles[index] || key,
        url: key.startsWith('top')
          ? `https://api.jikan.moe/v4/top/manga?limit=12`
          : `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(key)}&limit=12`
      }))
    : defaultSections

  const sections: Array<any> = []

  for (const s of sectionsDef) {
    try {
      const res = await fetch(s.url)
      if (!res.ok) {
        sections.push({ title: s.title, items: [] })
        continue
      }
      const json = await res.json()
      const items = (json.data || []).slice(0, 12).map((m: any) => ({
        id: m.mal_id ?? m.id,
        title: m.title,
        authors: (m.authors || []).map((a: any) => a.name).filter(Boolean),
        cover: m.images?.jpg?.image_url || m.images?.webp?.image_url || null
      }))
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
