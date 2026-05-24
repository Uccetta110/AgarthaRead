function normalizeCatalogType(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'books' || raw === 'book') return 'book'
  if (raw === 'manga' || raw === 'mangas') return 'manga'
  if (raw === 'news' || raw === 'newspaper' || raw === 'newspapers') return 'newspaper'
  if (raw === 'comic' || raw === 'comics') return 'comic'
  return ''
}

function inferSearchProvider(item, catalogType) {
  const explicit = String(item?.searchProvider || item?.externalProvider || item?.source || '').trim()
  if (explicit) return explicit

  const normalizedType = normalizeCatalogType(catalogType || item?.type)
  if (normalizedType === 'book') return 'openlibrary'
  if (normalizedType === 'manga') return 'anilist'
  if (normalizedType === 'newspaper') return 'guardian'

  return 'unknown'
}

function resolveNumericId(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function resolveSearchId(item) {
  const candidates = [item?.searchId, item?.externalId, item?.id, item?.key, item?.contentId]
  for (const candidate of candidates) {
    const value = String(candidate || '').trim()
    if (value) return value
  }

  return String(item?.title || '').trim().slice(0, 100)
}

export function buildListSaveRequest(item, catalogType) {
  const internalId = resolveNumericId(item?.internalId)
  if (internalId && String(item?.source || '').trim().toLowerCase() === 'internal') {
    return { body: { itemId: internalId } }
  }

  const searchProvider = inferSearchProvider(item, catalogType)
  const searchId = resolveSearchId(item)
  const title = String(item?.title || 'Untitled').trim() || 'Untitled'

  return {
    body: {
      item_type: normalizeCatalogType(catalogType || item?.type) || 'book',
      search_provider: searchProvider,
      search_id: searchId,
      content_provider: String(item?.contentProvider || searchProvider || '').trim() || searchProvider,
      content_id: String(item?.contentId || searchId || '').trim() || searchId,
      external_provider: searchProvider,
      external_id: searchId,
      releaseDate: item?.releaseDate || item?.publishedAt || null,
      title,
      description: item?.description || null,
      language: item?.language || null,
      coverUrl: item?.cover || item?.coverUrl || item?.thumbnail || item?.image || item?.poster || item?.image_url || null,
      contentFormat: item?.contentFormat || undefined,
      contentPath: item?.contentPath || null
    }
  }
}
