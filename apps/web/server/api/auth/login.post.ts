// Importa la libreria bcryptjs per verificare le password hashate
import bcrypt from 'bcryptjs'
// Importa il modulo crypto per generare token di sessione casuale e sicuro
import crypto from 'node:crypto'
// Importa i comparatori di Drizzle ORM per costruire query WHERE
import { and, eq, isNull, or } from 'drizzle-orm'
// Importa la funzione per ottenere l'istanza del database connesso
import { getDb } from '../../db/client'
// Importa le definizioni delle tabelle 'users' e 'userSessions' dallo schema
import { authChallenges, users, userSessions } from '../../db/schema'
import { sendEmail } from '../../utils/email'
import { generateOtp, generateToken, hashValue } from '../../utils/otp'

// Definisce il tipo di dati che ci aspettiamo nel corpo della richiesta POST
type LoginBody = {
  identifier: string // Email o username dell'utente
  password: string   // Password in chiaro (sarà verificata con bcrypt)
}

// Handler principale della rotta POST /api/auth/login
export default defineEventHandler(async (event) => {
  // Legge il corpo della richiesta e lo tipizza come LoginBody
  const body = await readBody<LoginBody>(event)

  const identifier = String(body?.identifier ?? '').trim()
  const password = String(body?.password ?? '')

  if (!identifier || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Credenziali mancanti'
    })
  }

  // Ottiene l'istanza del database con la connessione MySQL e Drizzle ORM
  const db = getDb()

  // Cerca l'utente nel database per email o username
  // questo evita di fallire se il client usa un tipo diverso da quello inviato
  const result = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.email, identifier),
        eq(users.username, identifier)
      )
    )
    .limit(1)

  // Estrae il primo utente dal risultato della query
  const user = result[0]

  // Valida che l'utente esista e abbia un passwordHash memorizzato
  // Se l'utente non esiste o non ha password, restituisce errore 401 (Unauthorized)
  // Nota: non specifichiamo se è email/username sbagliato per motivi di sicurezza
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Credenziali non valide'
    })
  }

  if (!user.passwordHash) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Credenziali non valide'
    })
  }

  // Banned users cannot login
  if (user.role === 'banned') {
    throw createError({ statusCode: 403, statusMessage: 'Utente bannato. Contatta supporto@agartharead.local per ricorso.' })
  }

  // Verifica che la password fornita corrisponda all'hash memorizzato
  // bcrypt.compare() effettua un confronto crittografico sicuro
  // Ritorna true se le password corrispondono, false altrimenti
  const okPassword = await bcrypt.compare(password, user.passwordHash)

  // Se la password non corrisponde, restituisce errore 401 (Unauthorized)
  if (!okPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Credenziali non valide'
    })
  }

  if (user.role === 'banned') {
    throw createError({ statusCode: 403, statusMessage: 'Utente bannato. Contatta supporto@agartharead.local per ricorso.' })
  }

  let effectiveUser = user
  if (user.role === 'suspended' && user.suspendedUntil && user.suspendedUntil <= new Date()) {
    const restoredRole = user.emailVerifiedAt ? 'user' : 'unconfirmed'
    await db.update(users).set({ role: restoredRole, suspendedUntil: null }).where(eq(users.id, user.id))
    const refreshed = (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0]
    if (refreshed) {
      effectiveUser = refreshed
    }
  }

  // Genera un token di sessione casuale e sicuro (32 byte = 64 caratteri esadecimali)
  // crypto.randomBytes() usa l'RNG crittografico del sistema operativo
  let twoFactorMethod = effectiveUser.twoFactorMethod ?? 'none'
  if (twoFactorMethod === 'totp' && !effectiveUser.totpSecret) {
    twoFactorMethod = 'none'
  }
  if (twoFactorMethod !== 'none') {
    await db
      .delete(authChallenges)
      .where(
        and(
          eq(authChallenges.userId, user.id),
          eq(authChallenges.purpose, 'login'),
          isNull(authChallenges.consumedAt)
        )
      )

    const challengeToken = generateToken()
    const challengeTokenHash = hashValue(challengeToken)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    const otpCode = twoFactorMethod === 'email' ? generateOtp() : null
    const otpCodeHash = otpCode ? hashValue(otpCode) : null

    await db.insert(authChallenges).values({
      userId: effectiveUser.id,
      purpose: 'login',
      channel: twoFactorMethod === 'email' ? 'email' : 'totp',
      challengeTokenHash,
      otpCodeHash,
      expiresAt,
    })

    if (otpCode) {
      await sendEmail({
        to: effectiveUser.email,
        subject: 'Codice di accesso AgarthaRead',
        text: `Il tuo codice di accesso è: ${otpCode}`,
      })
    }

    return {
      ok: false,
      requires2fa: true,
      method: twoFactorMethod,
      challengeToken,
    }
  }

  const sessionToken = crypto.randomBytes(32).toString('hex')

  // Calcola la data di scadenza della sessione: 7 giorni da ora
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  // Inserisce una nuova riga nella tabella userSessions per tracciare la sessione
  // Conserva: ID utente, token, IP, user agent, etichetta dispositivo e scadenza
  await db.insert(userSessions).values({
    userId: user.id,
    sessionToken,
    // getRequestIP() estrae l'IP reale anche dietro a proxy/CDN (xForwardedFor)
    ip: getRequestIP(event, { xForwardedFor: true }) || '0.0.0.0',
    // getHeader() legge l'header User-Agent dalla richiesta HTTP per identificare il browser
    userAgent: getHeader(event, 'user-agent') || 'unknown',
    deviceLabel: 'web',
    expiresAt
  })

  // Imposta il cookie di sessione nel browser dell'utente
  setCookie(event, 'session_token', sessionToken, {
    httpOnly: true,        // Non accessibile da JavaScript (protegge da XSS)
    sameSite: 'lax',       // Inviato solo per richieste same-site (protegge da CSRF)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in produzione
    path: '/',             // Disponibile per tutti i percorsi del sito
    expires: expiresAt,    // Scade insieme alla sessione nel database
    maxAge: 7 * 24 * 60 * 60
  })

  // Restituisce una risposta di successo con i dati dell'utente
  // Il token di sessione è già nel cookie, quindi non è necessario includerlo
  //output console se qualcuno ha fatto un login con successo, mostra l'username, l'id e l'email dell'utente che ha fatto login
    console.log(`Login successful: userId=${effectiveUser.id}, username=${effectiveUser.username}, email=${effectiveUser.email}`)
  return {
    ok: true,
    user: {
      id: effectiveUser.id,
      username: effectiveUser.username,
      email: effectiveUser.email,
      avatar_dir: effectiveUser.avatarDir,
      role: effectiveUser.role,
      email_verified_at: effectiveUser.emailVerifiedAt,
      two_factor_method: effectiveUser.twoFactorMethod,
      totp_enabled_at: effectiveUser.totpEnabledAt,
      suspended_until: effectiveUser.suspendedUntil
    }
  }
})