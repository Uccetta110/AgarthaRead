import { getCache, setCache } from '../../utils/simpleCache'

export default defineEventHandler(async () => {
  const cacheKey = 'news:home'
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
    return { sections: [{ title: 'Ultime (demo)', items: sample }, { title: 'Top (demo)', items: sample }], notice: 'GUARDIAN_KEY not configured - showing demo data' }
  }

  try {
    const latestRes = await fetch(`https://content.guardianapis.com/search?api-key=${key}&page-size=12&order-by=newest&show-fields=thumbnail,trailText`)
    const topRes = await fetch(`https://content.guardianapis.com/search?api-key=${key}&page-size=12&order-by=relevance&show-fields=thumbnail,trailText`)

    const latestJson = latestRes.ok ? await latestRes.json() : { response: { results: [] } }
    const topJson = topRes.ok ? await topRes.json() : { response: { results: [] } }

    const mapItem = (it: any) => ({
      id: it.id,
      title: it.webTitle,
      url: it.webUrl,
      cover: it.fields?.thumbnail || null,
      trailText: it.fields?.trailText || null
    })

    const sections = [
      { title: 'Ultime', items: (latestJson.response.results || []).map(mapItem) },
      { title: 'Top', items: (topJson.response.results || []).map(mapItem) }
    ]

    const payload = { sections }
    setCache(cacheKey, payload, 30 * 60 * 1000)
    return payload
  } catch (err) {
    return { sections: [{ title: 'Ultime', items: [] }, { title: 'Top', items: [] }], error: String(err) }
  }
})
