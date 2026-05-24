import crypto from 'node:crypto'
import * as OTPAuth from 'otpauth'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { authChallenges, userSessions, users } from '../../../db/schema'
import { hashValue } from '../../../utils/otp'

const MAX_ATTEMPTS = 5

export default defineEventHandler(async (event) => {
  const body = await readBody<{ challengeToken: string; code: string }>(event)
  const challengeToken = String(body?.challengeToken ?? '').trim()
  const code = String(body?.code ?? '').trim()

  if (!challengeToken || !code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Codice mancante'
    })
  }

  const db = getDb()
  const challengeTokenHash = hashValue(challengeToken)
  const challenge = (await db
    .select()
    .from(authChallenges)
    .where(eq(authChallenges.challengeTokenHash, challengeTokenHash))
    .limit(1))[0]

  if (!challenge || challenge.purpose !== 'login') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Challenge non valido'
    })
  }

  if (challenge.consumedAt || challenge.expiresAt < new Date()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Challenge scaduto'
    })
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Troppi tentativi'
    })
  }

  const user = (await db
    .select()
    .from(users)
    .where(eq(users.id, challenge.userId))
    .limit(1))[0]

  if (!user) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Utente non valido'
    })
  }

  if (user.role === 'banned') {
    throw createError({ statusCode: 403, statusMessage: 'Utente bannato. Contatta supporto@agartharead.local per ricorso.' })
  }

  let effectiveUser = user
  if (user.role === 'suspended' && user.suspendedUntil && user.suspendedUntil <= new Date()) {
    const restoredRole = user.emailVerifiedAt ? 'user' : 'unconfirmed'
    await db.update(users).set({ role: restoredRole, suspendedUntil: null }).where(eq(users.id, user.id))
    const refreshed = (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0]
    if (refreshed) {
      effectiveUser = refreshed
    }
  }

  let isValid = false
  if (challenge.channel === 'email') {
    if (challenge.otpCodeHash) {
      isValid = challenge.otpCodeHash === hashValue(code)
    }
  } else if (challenge.channel === 'totp') {
    if (effectiveUser.totpSecret) {
      const totp = new OTPAuth.TOTP({
        issuer: 'AgarthaRead',
        label: effectiveUser.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(effectiveUser.totpSecret)
      })
      isValid = totp.validate({ token: code, window: 1 }) !== null
    }
  }

  if (!isValid) {
    await db
      .update(authChallenges)
      .set({ attempts: challenge.attempts + 1 })
      .where(eq(authChallenges.id, challenge.id))

    throw createError({
      statusCode: 401,
      statusMessage: 'Codice non valido'
    })
  }

  await db
    .update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(authChallenges.id, challenge.id))

  const sessionToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.insert(userSessions).values({
    userId: effectiveUser.id,
    sessionToken,
    ip: getRequestIP(event, { xForwardedFor: true }) || '0.0.0.0',
    userAgent: getHeader(event, 'user-agent') || 'unknown',
    deviceLabel: 'web',
    expiresAt
  })

  setCookie(event, 'session_token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
    maxAge: 7 * 24 * 60 * 60
  })

  return {
    ok: true,
    user: {
      id: effectiveUser.id,
      username: effectiveUser.username,
      email: effectiveUser.email,
      avatar_dir: effectiveUser.avatarDir,
      role: effectiveUser.role,
      email_verified_at: effectiveUser.emailVerifiedAt,
      two_factor_method: effectiveUser.twoFactorMethod,
      totp_enabled_at: effectiveUser.totpEnabledAt,
      suspended_until: effectiveUser.suspendedUntil
    }
  }
})
