import { and, desc, eq, isNull } from 'drizzle-orm'
import { getDb } from '../../../../db/client'
import { authChallenges, users } from '../../../../db/schema'
import { hashValue } from '../../../../utils/otp'
import { requireSessionUser } from '../../../../utils/session'

const MAX_ATTEMPTS = 5

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

  const db = getDb()
  const challenge = (await db
    .select()
    .from(authChallenges)
    .where(
      and(
        eq(authChallenges.userId, user.id),
        eq(authChallenges.purpose, 'email_verify'),
        isNull(authChallenges.consumedAt)
      )
    )
    .orderBy(desc(authChallenges.createdAt))
    .limit(1))[0]

  if (!challenge) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Codice non valido'
    })
  }

  if (challenge.expiresAt < new Date()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Codice scaduto'
    })
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Troppi tentativi'
    })
  }

  if (!challenge.otpCodeHash || challenge.otpCodeHash !== hashValue(code)) {
    await db
      .update(authChallenges)
      .set({ attempts: challenge.attempts + 1 })
      .where(eq(authChallenges.id, challenge.id))

    throw createError({
      statusCode: 401,
      statusMessage: 'Codice non valido'
    })
  }

  const verifiedAt = new Date()

  await db
    .update(authChallenges)
    .set({ consumedAt: verifiedAt })
    .where(eq(authChallenges.id, challenge.id))

  await db
    .update(users)
    .set({ emailVerifiedAt: verifiedAt })
    .where(eq(users.id, user.id))

  return {
    ok: true,
    email_verified_at: verifiedAt
  }
})
