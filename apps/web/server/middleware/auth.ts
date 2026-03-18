// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  // Estrai il token dal cookie
  const sessionToken = getCookie(event, 'session_token')
  
  // Salva in event.context per usare negli handler
  event.context.user = sessionToken ? { sessionToken } : null
})