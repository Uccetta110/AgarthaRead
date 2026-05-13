import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { userPreferences, users } from '../../db/schema'
import { requireSessionUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const body = await readBody<{
    fullName?: string
    birthDate?: string
    theme?: string
    fontSize?: number
    uiLanguage?: string
  }>(event)

  const db = getDb()
  const updates: {
    fullName?: string
    birthDate?: Date
  } = {}

  if (typeof body?.fullName === 'string' && body.fullName.trim()) {
    updates.fullName = body.fullName.trim()
  }

  if (typeof body?.birthDate === 'string' && body.birthDate.trim()) {
    const parsed = new Date(body.birthDate)
    if (Number.isNaN(parsed.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Data di nascita non valida'
      })
    }
    updates.birthDate = parsed
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
  }

  const prefs = (await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id))
    .limit(1))[0]

  const prefUpdates: {
    theme?: string | null
    fontSize?: number | null
    uiLanguage?: string | null
  } = {}
  if (typeof body?.theme === 'string') {
    prefUpdates.theme = body.theme.trim() || null
  }
  if (typeof body?.fontSize === 'number' && Number.isFinite(body.fontSize)) {
    prefUpdates.fontSize = Math.max(12, Math.min(28, Math.round(body.fontSize)))
  }
  if (typeof body?.uiLanguage === 'string') {
    prefUpdates.uiLanguage = body.uiLanguage.trim() || null
  }

  if (Object.keys(prefUpdates).length > 0) {
    if (prefs) {
      await db
        .update(userPreferences)
        .set(prefUpdates)
        .where(eq(userPreferences.userId, user.id))
    } else {
      const theme = typeof prefUpdates.theme === 'string' ? prefUpdates.theme : null
      const fontSize = typeof prefUpdates.fontSize === 'number' ? prefUpdates.fontSize : null
      const uiLanguage = typeof prefUpdates.uiLanguage === 'string' ? prefUpdates.uiLanguage : null

      await db.insert(userPreferences).values({
        userId: user.id,
        theme,
        fontSize,
        uiLanguage
      })
    }
  }

  const birthDate = updates.birthDate instanceof Date
    ? updates.birthDate.toISOString().slice(0, 10)
    : user.birthDate.toISOString().slice(0, 10)

  return {
    ok: true,
    user: {
      full_name: updates.fullName ?? user.fullName,
      birth_date: birthDate
    },
    preferences: {
      theme: prefUpdates.theme ?? prefs?.theme ?? 'light',
      font_size: prefUpdates.fontSize ?? prefs?.fontSize ?? 16,
      ui_language: prefUpdates.uiLanguage ?? prefs?.uiLanguage ?? 'it'
    }
  }
})
