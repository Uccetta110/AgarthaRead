import { getCache, setCache } from '../../utils/simpleCache'

export default defineEventHandler(async () => {
  const cacheKey = 'books:home'
  const cached = getCache(cacheKey)
  if (cached) return cached

  const subjects = [
    { title: 'Romanzi', subject: 'fiction' },
    { title: 'Gialli', subject: 'mystery' }
  ]

  const sections: Array<any> = []

  for (const s of subjects) {
    try {
      const res = await fetch(`https://openlibrary.org/subjects/${s.subject}.json?limit=12`)
      if (!res.ok) {
        sections.push({ title: s.title, items: [] })
        continue
      }
      const json = await res.json()
      const items = (json.works || []).slice(0, 12).map((w: any) => ({
        id: w.key,
        title: w.title,
        authors: (w.authors || []).map((a: any) => a.name).filter(Boolean),
        cover: w.cover_id ? `https://covers.openlibrary.org/b/id/${w.cover_id}-M.jpg` : null
      }))
      sections.push({ title: s.title, items })
    } catch (err) {
      sections.push({ title: s.title, items: [] })
    }
  }

  const payload = { sections }
  setCache(cacheKey, payload, 24 * 60 * 60 * 1000)
  return payload
})
