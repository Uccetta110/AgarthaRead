import { getDb } from '../../db/client'
import { artistRequests } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { requireSessionUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const body = await readBody<{ message?: string }>(event)
  const db = getDb()

  const existing = (await db.select().from(artistRequests).where(eq(artistRequests.userId, user.id)).limit(1))[0]
  if (existing && existing.status === 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Hai già una richiesta in sospeso' })
  }

  await db.insert(artistRequests).values({
    userId: user.id,
    message: typeof body?.message === 'string' ? body.message.trim() : null
  })

  return { ok: true }
})
