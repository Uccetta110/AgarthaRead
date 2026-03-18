// Importa la libreria bcryptjs per verificare le password hashate
import bcrypt from 'bcryptjs'
// Importa il modulo crypto per generare token di sessione casuale e sicuro
import crypto from 'node:crypto'
// Importa i comparatori di Drizzle ORM per costruire query WHERE
import { eq, or } from 'drizzle-orm'
// Importa la funzione per ottenere l'istanza del database connesso
import { getDb } from '../../db/client'
// Importa le definizioni delle tabelle 'users' e 'userSessions' dallo schema
import { users, userSessions } from '../../db/schema'

// Definisce il tipo di dati che ci aspettiamo nel corpo della richiesta POST
type LoginBody = {
  identifier: string // Email o username dell'utente
  password: string   // Password in chiaro (sarà verificata con bcrypt)
}

// Handler principale della rotta POST /api/auth/login
export default defineEventHandler(async (event) => {
  // Legge il corpo della richiesta e lo tipizza come LoginBody
  const body = await readBody<LoginBody>(event)

  // Validazione: controlla che sia identifier che password siano forniti
  // Se mancano, restituisce errore 400 (Bad Request)
  if (!body?.identifier || !body?.password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Credenziali mancanti'
    })
  }

  // Ottiene l'istanza del database con la connessione MySQL e Drizzle ORM
  const db = getDb()

  // Cerca l'utente nel database per email O username
  // Utilizza 'or()' per accettare entrambi i campi come identifier
  // limit(1) ottimizza la query limitando a un solo risultato
  const result = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.email, body.identifier),
        eq(users.username, body.identifier)
      )
    )
    .limit(1)

  // Estrae il primo utente dal risultato della query
  const user = result[0]

  // Valida che l'utente esista e abbia un passwordHash memorizzato
  // Se l'utente non esiste o non ha password, restituisce errore 401 (Unauthorized)
  // Nota: non specifichiamo se è email/username sbagliato per motivi di sicurezza
  if (!user?.passwordHash) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Credenziali non valide'
    })
  }

  // Verifica che la password fornita corrisponda all'hash memorizzato
  // bcrypt.compare() effettua un confronto crittografico sicuro
  // Ritorna true se le password corrispondono, false altrimenti
  const okPassword = await bcrypt.compare(body.password, user.passwordHash)

  // Se la password non corrisponde, restituisce errore 401 (Unauthorized)
  if (!okPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Credenziali non valide'
    })
  }

  // Genera un token di sessione casuale e sicuro (32 byte = 64 caratteri esadecimali)
  // crypto.randomBytes() usa l'RNG crittografico del sistema operativo
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
    expires: expiresAt     // Scade insieme alla sessione nel database
  })

  // Restituisce una risposta di successo con i dati dell'utente
  // Il token di sessione è già nel cookie, quindi non è necessario includerlo
  return {
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  }
})