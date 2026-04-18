import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { users, userSessions } from '../db/schema'

export function getSessionByToken(db: Db, token: string) {
  return db.select().from(userSessions).where(eq(userSessions.sessionToken, token)).limit(1)
}

export function getUserById(db: Db, id: number) {
  return db.select().from(users).where(eq(users.id, id)).limit(1)
}
