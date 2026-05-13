import * as OTPAuth from 'otpauth'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../db/client'
import { users } from '../../../../db/schema'
import { requireSessionUser } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const body = await readBody<{ code: string }>(event)
  const code = String(body?.code ?? '').trim()

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Codice mancante'
    })
  }

  if (!user.totpSecret) {
    throw createError({
      statusCode: 400,
      statusMessage: 'TOTP non configurato'
    })
  }

  const totp = new OTPAuth.TOTP({
    issuer: 'AgarthaRead',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(user.totpSecret)
  })

  const isValid = totp.validate({ token: code, window: 1 }) !== null
  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Codice non valido'
    })
  }

  const enabledAt = new Date()
  const db = getDb()
  await db
    .update(users)
    .set({
      twoFactorMethod: 'totp',
      totpEnabledAt: enabledAt
    })
    .where(eq(users.id, user.id))

  return {
    ok: true,
    two_factor_method: 'totp',
    totp_enabled_at: enabledAt
  }
})
