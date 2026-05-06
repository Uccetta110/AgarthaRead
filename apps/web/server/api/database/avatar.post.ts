import { getDb } from "../../db/client";
import { users, userSessions } from "../../db/schema";
import { eq } from "drizzle-orm";

type AvatarBody = {
  identifier: string;
  username: string;
  url: string;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<AvatarBody>(event);

  if (!body?.identifier || !body?.url) {
    throw createError({
      statusCode: 400,
      statusMessage: "Credenziali mancanti",
    });
  }

  const db = getDb();

  //identifier è la sessione dell'utente, quindi cerchiamo la sessione e poi l'utente associato, se la sessione è valida aggiorniamo l'avatar dell'utente
  const result = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.sessionToken, body.identifier))
    .limit(1);

  const session = result[0];

  if (!session) {
    return null;
  }

  const result2 = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const session2 = result2[0];

  if (!session2) {
    return null;
  }

  if (session2.username !== body.username) {
    return null;
  }

    await db
    .update(users)
    .set({ avatarDir: body.url })
    .where(eq(users.id, session.userId))
    .execute();

    return { success: true };
});
