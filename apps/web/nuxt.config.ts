import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~~/app/assets/css/main.css'],
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxt/eslint', '@nuxt/image'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL ?? '',
    smtp: {
      host: process.env.SMTP_HOST ?? '',
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
      fromEmail: process.env.SMTP_FROM_EMAIL ?? '',
      fromName: process.env.SMTP_FROM_NAME ?? 'AgarthaRead'
    }
  },
  nitro: {
    middlewares: [
      'server/middleware/log.ts'
    ]
  }
})