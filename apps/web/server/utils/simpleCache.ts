const cache = new Map<string, { expires: number; data: any }>()

export function getCache(key: string) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function setCache(key: string, data: any, ttlMs = 60 * 60 * 1000) {
  cache.set(key, { expires: Date.now() + ttlMs, data })
}

export function delCache(key: string) {
  cache.delete(key)
}

export function clearCache() {
  cache.clear()
}

export default { getCache, setCache, delCache, clearCache }
