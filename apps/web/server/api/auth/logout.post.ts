import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { userSessions } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session_token = getCookie(event, 'session_token')

  if (session_token && typeof session_token === 'string') {
    const db = getDb()
    await db
      .update(userSessions)
      .set({ expiresAt: new Date(0) })
      .where(eq(userSessions.sessionToken, session_token))
  }

  setCookie(event, 'session_token', '', {
    path: '/',
    expires: new Date(0),
  })

  return {
    ok: true,
  }
})
