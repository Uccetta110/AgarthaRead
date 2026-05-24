// Importa il comparatore di Drizzle ORM per costruire query WHERE
import { eq } from 'drizzle-orm'
// Importa la funzione per ottenere l'istanza del database connesso
import { getDb } from '../../db/client'
// Importa le definizioni delle tabelle 'users' e 'userSessions' dallo schema
import { managerPermissions, users, userSessions } from '../../db/schema'

export default defineEventHandler(async (event) => {
    const session_token = getCookie(event, 'session_token')

    if (!session_token) {
        return null;
    } else if (typeof session_token !== 'string') {
        setCookie(event, 'session_token', '', {
            path: '/',
            expires: new Date(0)
        });
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
        setCookie(event, 'session_token', '', {
            path: '/',
            expires: new Date(0)
        });
        return null;
    }

    if (session.expiresAt < new Date()) {
        // Sessione scaduta, elimina dal database e cancella il cookie
        await db.delete(userSessions).where(eq(userSessions.sessionToken, session_token));
        setCookie(event, 'session_token', '', {
            path: '/',
            expires: new Date(0)
        });
        return null;
    }

    const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

    const user = userResult[0];

    if (!user) {
        return null;
    }

    let permissions: string[] = [];
    if (user.role === 'manager') {
        const permissionRows = await db
            .select({ permissionCode: managerPermissions.permissionCode })
            .from(managerPermissions)
            .where(eq(managerPermissions.userId, user.id));
        permissions = permissionRows.map((row) => row.permissionCode);
    }

    if (user.role === 'banned') {
        await db.delete(userSessions).where(eq(userSessions.sessionToken, session_token));
        setCookie(event, 'session_token', '', {
            path: '/',
            expires: new Date(0)
        });
        return null;
    }

    if (user.role === 'suspended' && user.suspendedUntil && user.suspendedUntil <= new Date()) {
        const restoredRole = user.emailVerifiedAt ? 'user' : 'unconfirmed';
        await db.update(users).set({ role: restoredRole, suspendedUntil: null }).where(eq(users.id, user.id));
        const refreshed = (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0];
        if (refreshed) {
            return {
                ok: true,
                user: {
                    id: refreshed.id,
                    username: refreshed.username,
                    email: refreshed.email,
                    avatar_dir: refreshed.avatarDir,
                    role: refreshed.role,
                    permissions,
                    email_verified_at: refreshed.emailVerifiedAt,
                    two_factor_method: refreshed.twoFactorMethod,
                    totp_enabled_at: refreshed.totpEnabledAt,
                    suspended_until: refreshed.suspendedUntil,
                }
            }
        }
    }
    return {
        ok: true,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar_dir: user.avatarDir,
            role: user.role,
            permissions,
            email_verified_at: user.emailVerifiedAt,
            two_factor_method: user.twoFactorMethod,
            totp_enabled_at: user.totpEnabledAt,
            suspended_until: user.suspendedUntil,
        }   
    }
});