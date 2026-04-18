/*// server/utils/auth.ts  (esempio concettuale)
import jwt from 'jsonwebtoken'
import { getCookie, createError} from 'h3'
import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import { eq } from 'drizzle-orm'
import { users, } from '../db/schema'
import { getDb } from '../db/client';



// implementa queste funzioni usando il tuo layer DB (drizzle)
async function getUserById(id: number) { 
    if (id == null) return null;
    if (typeof id !== 'number') {
        throw createError({
            statusCode: 400,
            statusMessage: 'ID utente non valido'
        });
    }
    // Esempio di query con Drizzle ORM per ottenere un utente per ID
    const db = getDb();
    const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

    const user = result[0];
    return user || null;

}
//async function getUserByEmail(email: string) { /* ...  }

export async function getCurrentUser(event: H3Event) {
  const token = getCookie(event, 'access_token')
  if (!token) return null
  try {
    const payload = jwt.verify(token, useRuntimeConfig().JWT_SECRET)
    const user = await getUserById(payload.sub)
    return user ? { id: user.id, role: user.role } : null
  } catch {
    return null
  }
}

export async function requireAuth(event: H3Event) {
  const user = await getCurrentUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  return user
}

export async function requireRole(event: H3Event, allowed: string | string[]) {
  const user = await requireAuth(event)
  const roles = Array.isArray(allowed) ? allowed : [allowed]
  if (!roles.includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  return user
}*/