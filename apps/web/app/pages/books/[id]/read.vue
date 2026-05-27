<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/80">
    <NuxtRouteAnnouncer />

    <div v-if="pending" class="rounded-2xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-700 dark:bg-slate-950/60">
      <div class="mx-auto flex min-h-[45vh] w-full max-w-2xl flex-col items-center justify-center gap-5 text-center">
        <div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-600 dark:border-slate-700 dark:border-t-slate-200" />
        <div class="space-y-2">
          <p class="text-lg font-semibold text-slate-900 dark:text-slate-100">Caricamento reader in corso...</p>
          <p class="text-sm text-slate-500 dark:text-slate-400">Sto preparando contenuto, indice e progressi di lettura.</p>
        </div>
      </div>
    </div>
    <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200">
      <p class="text-base font-semibold">Caricamento non riuscito</p>
      <p class="mt-1 text-sm">{{ error.message || 'Non sono riuscito a caricare il libro.' }}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isRetrying"
          @click="retryLoad"
        >
          {{ isRetrying ? 'Riprovo...' : 'Riprova caricamento' }}
        </button>
        <NuxtLink
          :to="`/books/${encodeURIComponent(id)}`"
          class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-200 dark:ring-red-700 dark:hover:bg-red-900/40"
        >
          Torna alla scheda
        </NuxtLink>
      </div>
    </div>
    <div v-else-if="!item" class="text-slate-500 dark:text-slate-400">Libro non trovato.</div>
    <div v-else class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
        <div>
          <p class="text-sm text-slate-500 dark:text-slate-400">Reader libro</p>
          <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ item.title }}</h1>
        </div>
        <NuxtLink
          :to="`/books/${encodeURIComponent(id)}`"
          class="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Torna alla scheda
        </NuxtLink>
      </div>

      <BookReader
        v-if="readerContent"
        :content="readerContent"
        :title="item.title"
        :authors="item.authors || []"
        :item-id="readerItemId"
        :save-url="saveUrl"
        :language-code="item.language || 'und'"
        :reading-progress="item.readingProgress || null"
        :source-label="readerSourceLabel"
      />

      <div v-else-if="previewUrl" class="space-y-4">
        <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          Testo completo non disponibile. Mostro la migliore anteprima disponibile dalla fonte esterna.
        </div>
        <div class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
          <iframe
            :src="previewUrl"
            class="h-[75vh] w-full border-0 bg-white"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>

      <div v-else class="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
        Nessun testo disponibile per questo libro.
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BookReader from '../../../components/BookReader.vue'

type BookDetail = {
  title?: string
  authors?: string[]
  internalId?: number | null
  language?: string
  readingProgress?: { locator?: string | null; percentage?: number | string | null } | null
  source?: string
  bodyHtml?: string
  webReaderLink?: string
  contentUrl?: string
}

const route = useRoute()
const id = computed(() => String(route.params.id || ''))
const apiPath = computed(() => `/api/books/${encodeURIComponent(id.value)}`)
const { data, error, pending, refresh } = useFetch<BookDetail>(apiPath, { server: false })
const item = computed<BookDetail | null>(() => data.value || null)
const isRetrying = ref(false)
const readerItemId = computed<number | undefined>(() => {
  const value = item.value?.internalId
  return typeof value === 'number' ? value : undefined
})
const readerContent = computed(() => String(item.value?.bodyHtml || '').trim())
const previewUrl = computed(() => item.value?.webReaderLink || item.value?.contentUrl || '')
const saveUrl = computed(() => `/api/books/${encodeURIComponent(id.value)}/progress`)
const readerSourceLabel = computed(() => {
  const source = String(item.value?.source || '').trim()
  return source ? `Fonte: ${source}` : ''
})

async function retryLoad() {
  if (isRetrying.value) return
  isRetrying.value = true
  try {
    await refresh()
  } finally {
    isRetrying.value = false
  }
}

useHead(() => ({ title: item.value?.title ? `${item.value.title} • Reader • AgarthaRead` : 'Reader libro' }))
</script>
