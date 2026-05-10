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

function buildGuardianUrl(key: string, sectionKey: string) {
  const base = `https://content.guardianapis.com/search?api-key=${key}&page-size=12&show-fields=thumbnail,trailText`
  const normalized = sectionKey.toLowerCase().trim()
  if (normalized === 'latest' || normalized === 'recent' || normalized === 'newest') {
    return `${base}&order-by=newest`
  }
  if (normalized === 'top' || normalized === 'relevance') {
    return `${base}&order-by=relevance`
  }
  return `${base}&q=${encodeURIComponent(sectionKey)}&order-by=relevance`
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const sectionKeys = parseQueryArray(query.sections || query.section)
  const sectionTitles = parseQueryArray(query.titles || query.title)
  const hasCustomSections = sectionKeys.length > 0
  const cacheKey = `news:home:${sectionKeys.join(',')}:${sectionTitles.join(',')}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const key = process.env.GUARDIAN_KEY || null
  if (!key) {
    // Fallback minimale per mostrare layout durante lo sviluppo
    const sample = Array.from({ length: 8 }).map((_, i) => ({
      id: `sample-${i}`,
      title: `Esempio notizia ${i + 1}`,
      url: null,
      cover: null,
      trailText: `Esempio di anteprima per la notizia ${i + 1}`
    }))
    const defaultSections = [{ title: 'Ultime (demo)', items: sample }, { title: 'Top (demo)', items: sample }]
    const sections = hasCustomSections
      ? sectionKeys.map((key, index) => ({ title: sectionTitles[index] || key, items: sample }))
      : defaultSections
    return { sections, notice: 'GUARDIAN_KEY not configured - showing demo data' }
  }

  try {
    const sectionDefs = hasCustomSections
      ? sectionKeys.map((key, index) => ({ title: sectionTitles[index] || key, url: buildGuardianUrl(key, key) }))
      : [
          { title: 'Ultime', url: buildGuardianUrl(key, 'latest') },
          { title: 'Top', url: buildGuardianUrl(key, 'top') }
        ]

    const sectionResponses = await Promise.all(
      sectionDefs.map(async (section) => {
        const res = await fetch(section.url)
        const json = res.ok ? await res.json() : { response: { results: [] } }
        return {
          title: section.title,
          items: (json.response.results || []).map((it: any) => ({
            id: it.id,
            title: it.webTitle,
            url: it.webUrl,
            cover: it.fields?.thumbnail || null,
            trailText: it.fields?.trailText || null
          }))
        }
      })
    )

    const payload = { sections: sectionResponses }
    setCache(cacheKey, payload, 30 * 60 * 1000)
    return payload
  } catch (err) {
    return { sections: [{ title: 'Ultime', items: [] }, { title: 'Top', items: [] }], error: String(err) }
  }
})
