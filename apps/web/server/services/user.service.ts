import { getDb } from '../db/client'
import { getSessionByToken, getUserById } from '../repositories/user.repository'

export async function getUsernameFromSessionToken(token: string) {
  const db = getDb()
  const session = (await getSessionByToken(db, token))[0]
  if (!session || session.expiresAt < new Date()) return null

  const user = (await getUserById(db, session.userId))[0]
  return user?.username ?? null
}