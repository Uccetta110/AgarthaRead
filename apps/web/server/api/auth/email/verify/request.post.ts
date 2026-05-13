import { and, eq, isNull } from 'drizzle-orm'
import { getDb } from '../../../../db/client'
import { authChallenges } from '../../../../db/schema'
import { sendEmail } from '../../../../utils/email'
import { generateOtp, generateToken, hashValue } from '../../../../utils/otp'
import { requireSessionUser } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  if (user.emailVerifiedAt) {
    return {
      ok: true,
      alreadyVerified: true
    }
  }

  const db = getDb()
  await db
    .delete(authChallenges)
    .where(
      and(
        eq(authChallenges.userId, user.id),
        eq(authChallenges.purpose, 'email_verify'),
        isNull(authChallenges.consumedAt)
      )
    )

  const otpCode = generateOtp()
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await db.insert(authChallenges).values({
    userId: user.id,
    purpose: 'email_verify',
    channel: 'email',
    challengeTokenHash: hashValue(generateToken()),
    otpCodeHash: hashValue(otpCode),
    expiresAt: otpExpiresAt
  })

  await sendEmail({
    to: user.email,
    subject: 'Verifica la tua email AgarthaRead',
    text: `Il tuo codice di verifica è: ${otpCode}`,
  })

  return {
    ok: true,
    expiresAt: otpExpiresAt
  }
})
