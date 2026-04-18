// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~~/app/assets/css/main.css'],
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxt/eslint', '@nuxt/image'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL ?? ''
  },
  nitro: {
    middlewares: [
      'server/middleware/log.ts'
    ]
  }
})