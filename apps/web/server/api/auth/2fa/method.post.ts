import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { users } from '../../../db/schema'
import { requireSessionUser } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const body = await readBody<{ method: 'none' | 'email' }>(event)
  const method = body?.method

  if (!method || !['none', 'email'].includes(method)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Metodo non valido'
    })
  }

  if (method === 'email' && !user.emailVerifiedAt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Verifica prima la tua email'
    })
  }

  const db = getDb()
  await db
    .update(users)
    .set({
      twoFactorMethod: method,
      totpSecret: null,
      totpEnabledAt: null
    })
    .where(eq(users.id, user.id))

  return {
    ok: true,
    two_factor_method: method
  }
})
