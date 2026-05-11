import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { userPreferences } from '../../db/schema'
import { requireSessionUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const db = getDb()

  const preferences = (await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id))
    .limit(1))[0]

  const birthDate = user.birthDate
    ? user.birthDate.toISOString().slice(0, 10)
    : null

  return {
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.fullName,
      birth_date: birthDate,
      email_verified_at: user.emailVerifiedAt,
      two_factor_method: user.twoFactorMethod,
      totp_enabled_at: user.totpEnabledAt
    },
    preferences: {
      theme: preferences?.theme ?? 'light',
      font_size: preferences?.fontSize ?? 16,
      ui_language: preferences?.uiLanguage ?? 'it'
    }
  }
})
