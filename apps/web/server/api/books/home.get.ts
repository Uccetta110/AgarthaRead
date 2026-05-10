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
  const subjectsKeys = parseQueryArray(query.subjects || query.subject)
  const sectionTitles = parseQueryArray(query.titles || query.title)
  const hasCustomSubjects = subjectsKeys.length > 0
  const cacheKey = `books:home:${subjectsKeys.join(',')}:${sectionTitles.join(',')}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const defaultSubjects = [
    { title: 'Romanzi', subject: 'fiction' },
    { title: 'Gialli', subject: 'mystery' }
  ]

  const subjects = hasCustomSubjects
    ? subjectsKeys.map((subject, index) => ({
        title: sectionTitles[index] || subject,
        subject
      }))
    : defaultSubjects

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
