// Importa il comparatore di Drizzle ORM per costruire query WHERE
import { eq } from 'drizzle-orm'
// Importa la funzione per ottenere l'istanza del database connesso
import { getDb } from '../../db/client'
// Importa le definizioni delle tabelle 'users' e 'userSessions' dallo schema
import { users, userSessions } from '../../db/schema'

export default defineEventHandler(async (event) => {
    const session_token = getCookie(event, 'session_token')

    if (!session_token) {
        return null;
    } else if (typeof session_token !== 'string') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Token di sessione non valido'
        });
    }

    const db = getDb();
    const result = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.sessionToken, session_token))
        .limit(1);

    const session = result[0];

    if (!session) {
        return null;
    }

    if (session.expiresAt < new Date()) {
        // Sessione scaduta, elimina dal database
        await db.delete(userSessions).where(eq(userSessions.sessionToken, session_token));
        return null;
    }

    const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

    const user = userResult[0];

    if (!user)
    {
        return null;
    }
    return {
        ok: true,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar_dir: user.avatarDir,
        }   
    }
});