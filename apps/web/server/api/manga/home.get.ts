import { getCache, setCache } from '../../utils/simpleCache'

export default defineEventHandler(async () => {
  const cacheKey = 'manga:home'
  const cached = getCache(cacheKey)
  if (cached) return cached

  const sectionsDef = [
    { title: 'Popolari', url: 'https://api.jikan.moe/v4/top/manga?limit=12' },
    { title: 'Romantici', url: 'https://api.jikan.moe/v4/manga?q=romance&limit=12' }
  ]

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
      sections.push({ title: s.title, items: [] })
    }
  }

  const payload = { sections }
  setCache(cacheKey, payload, 60 * 60 * 1000)
  return payload
})
