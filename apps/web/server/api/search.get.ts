import { getQuery } from 'h3'
import { searchAniListManga, normalizeAniListHomeItem } from '../utils/aniList'
import { getDb } from '../db/client'
import { getSessionUser } from '../utils/session'
import { users, userPreferences } from '../db/schema'
import { eq, sql, desc } from 'drizzle-orm'

type SearchType = 'books' | 'manga' | 'news' | 'users'

type SearchPayload = {
  items: any[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
  type: SearchType
  notice?: string
}

const MAX_LIMIT = 50

function toNumber(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeType(value: unknown): SearchType {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'users') return 'users' as SearchType
  if (raw === 'manga') return 'manga'
  if (raw === 'news') return 'news'
  return 'books'
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q || '').trim()
  const type = normalizeType(query.type)
  const page = Math.max(1, toNumber(query.page, 1))
  const pageSize = Math.min(MAX_LIMIT, Math.max(1, toNumber(query.limit, 20)))

  if (!q) {
    return {
      items: [],
      page,
      pageSize,
      total: 0,
      hasMore: false,
      type
    } satisfies SearchPayload
  }

  if (type === 'books') {
    const url = new URL('https://openlibrary.org/search.json')
    url.searchParams.set('q', q)
    url.searchParams.set('page', String(page))
    url.searchParams.set('limit', String(pageSize))
    url.searchParams.set('fields', 'key,title,author_name,cover_i')

    const response = await fetch(url.toString())
    if (!response.ok) {
      return {
        items: [],
        page,
        pageSize,
        total: 0,
        hasMore: false,
        type
      } satisfies SearchPayload
    }

    const json = await response.json()
    const docs = Array.isArray(json.docs) ? json.docs : []
    const total = Number(json.numFound || 0)

    const items = docs.map((doc: any) => ({
      id: doc.key,
      title: doc.title || 'Titolo non disponibile',
      authors: Array.isArray(doc.author_name) ? doc.author_name : [],
      cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null
    }))

    return {
      items,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
      type
    } satisfies SearchPayload
  }

  if (type === 'manga') {
    try {
      const results = await searchAniListManga(q, page, pageSize, 'SCORE_DESC')
      const items = (results || []).map((manga: any) => normalizeAniListHomeItem(manga))
      const total = items.length

      return {
        items,
        page,
        pageSize,
        total,
        hasMore: items.length === pageSize,
        type
      } satisfies SearchPayload
    } catch (error) {
      return {
        items: [],
        page,
        pageSize,
        total: 0,
        hasMore: false,
        type,
        notice: 'AniList non disponibile'
      } satisfies SearchPayload
    }
  }

  if (type === 'users') {
    const db = getDb()
    const sessionUser = await getSessionUser(event)
    const privileged = !!sessionUser && (sessionUser.role === 'admin' || sessionUser.role === 'manager')
    const pattern = `%${q}%`

    const whereClause = privileged
      ? sql`(users.username LIKE ${pattern} OR users.full_name LIKE ${pattern})`
      : sql`(users.username LIKE ${pattern} OR users.full_name LIKE ${pattern}) AND COALESCE(user_preferences.account_public, 1) = 1`

    const rows = await db
      .select({ id: users.id, username: users.username, fullName: users.fullName, avatarDir: users.avatarDir })
      .from(users)
      .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
      .where(whereClause)
      .orderBy(desc(users.id))
      .limit(pageSize)

    const items = rows.map((r: any) => ({ id: r.id, username: r.username, full_name: r.fullName, avatar: r.avatarDir }))
    const total = items.length

    return {
      items,
      page,
      pageSize,
      total,
      hasMore: items.length === pageSize,
      type
    } satisfies SearchPayload
  }

  const key = process.env.GUARDIAN_KEY || ''
  if (!key) {
    return {
      items: [],
      page,
      pageSize,
      total: 0,
      hasMore: false,
      type,
      notice: 'GUARDIAN_KEY not configured'
    } satisfies SearchPayload
  }

  const newsUrl = new URL('https://content.guardianapis.com/search')
  newsUrl.searchParams.set('api-key', key)
  newsUrl.searchParams.set('q', q)
  newsUrl.searchParams.set('page-size', String(pageSize))
  newsUrl.searchParams.set('page', String(page))
  newsUrl.searchParams.set('show-fields', 'thumbnail,trailText,byline')

  const newsResponse = await fetch(newsUrl.toString())
  if (!newsResponse.ok) {
    return {
      items: [],
      page,
      pageSize,
      total: 0,
      hasMore: false,
      type
    } satisfies SearchPayload
  }

  const newsJson = await newsResponse.json()
  const results = newsJson.response?.results || []
  const total = Number(newsJson.response?.total || 0)

  const items = results.map((item: any) => ({
    id: item.id,
    title: item.webTitle,
    authors: item.fields?.byline ? [item.fields.byline] : [],
    cover: item.fields?.thumbnail || null,
    trailText: item.fields?.trailText || null,
    url: item.webUrl || null
  }))

  return {
    items,
    page,
    pageSize,
    total,
    hasMore: page * pageSize < total,
    type
  } satisfies SearchPayload
})
