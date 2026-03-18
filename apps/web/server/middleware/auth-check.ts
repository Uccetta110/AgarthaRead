// server/middleware/auth-check.ts
export default defineEventHandler((event) => {
  // Esegui solo per rotte /api/protected/**
  if (event.node.req.url?.startsWith('/api/protected/')) {
    console.log('Protected route accessed')
  }
})