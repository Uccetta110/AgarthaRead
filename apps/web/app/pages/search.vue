<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/80">
    <NuxtRouteAnnouncer />

    <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Ricerca</h1>
        <p v-if="query" class="mt-1 text-slate-600 dark:text-slate-300">Risultati per "{{ query }}"</p>
        <p v-else class="mt-1 text-slate-500 dark:text-slate-400">Inserisci un termine di ricerca.</p>
      </div>
      <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tipo: {{ typeLabel }}</div>
    </div>

    <div v-if="notice" class="mt-3 text-sm text-yellow-600 dark:text-yellow-400">{{ notice }}</div>
    <div v-if="error" class="mt-4 text-red-600 dark:text-red-300">Errore: {{ error }}</div>

    <div v-else-if="!query" class="mt-6 text-slate-500 dark:text-slate-400">
      Usa la barra di ricerca in alto per iniziare.
    </div>
    <div v-else-if="pending && items.length === 0" class="mt-6 text-slate-500 dark:text-slate-400">Caricamento risultati...</div>
    <div v-else-if="items.length === 0" class="mt-6 text-slate-500 dark:text-slate-400">Nessun risultato trovato.</div>

    <div v-else class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <NuxtLink
        v-for="item in items"
        :key="item.id ?? item.key ?? item.title"
        :to="itemRoute(item)"
        class="block"
      >
        <ItemCard :item="item" />
      </NuxtLink>
    </div>

    <div ref="sentinel" class="h-10" />
    <div v-if="pending && items.length" class="mt-2 text-sm text-slate-500 dark:text-slate-400">Caricamento altri risultati...</div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ItemCard from '../components/ItemCard.vue'

type SearchItem = {
  id?: string
  key?: string
  title?: string
  cover?: string | null
  thumbnail?: string | null
  authors?: string[]
}

type SearchResponse = {
  items?: SearchItem[]
  page?: number
  total?: number
  hasMore?: boolean
  notice?: string
}

const route = useRoute()
const query = computed(() => String(route.query.q || '').trim())
const type = computed(() => {
  const raw = String(route.query.type || '').toLowerCase()
  if (raw === 'manga') return 'manga'
  if (raw === 'news') return 'news'
  if (raw === 'users') return 'users'
  return 'books'
})

const typeLabel = computed(() => {
  if (type.value === 'manga') return 'Manga'
  if (type.value === 'news') return 'News'
  if (type.value === 'users') return 'Utenti'
  return 'Libri'
})

const routeType = computed(() => {
  if (type.value === 'manga') return 'mangas'
  if (type.value === 'news') return 'newspapers'
  if (type.value === 'users') return 'users'
  return 'books'
})

const pageSize = 20
const items = ref<SearchItem[]>([])
const page = ref(1)
const total = ref(0)
const hasMore = ref(false)
const pending = ref(false)
const error = ref<string | null>(null)
const notice = ref('')
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const itemRoute = (item: SearchItem) => {
  const id = item.id ?? item.key ?? item.title ?? ''
  if (type.value === 'users') return `/users/${encodeURIComponent(String(id))}`
  return `/${routeType.value}/${encodeURIComponent(String(id))}`
}

async function loadPage(targetPage: number, reset = false) {
  if (!query.value) {
    items.value = []
    total.value = 0
    hasMore.value = false
    return
  }
  if (pending.value) return

  pending.value = true
  error.value = null

  try {
    const data = await $fetch<SearchResponse>('/api/search', {
      params: {
        q: query.value,
        type: type.value,
        page: targetPage,
        limit: pageSize
      }
    })

    const nextItems = Array.isArray(data.items) ? data.items : []
    items.value = reset ? nextItems : [...items.value, ...nextItems]
    page.value = Number(data.page || targetPage)
    total.value = Number(data.total || items.value.length)
    hasMore.value = Boolean(data.hasMore)
    notice.value = String(data.notice || '')
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    pending.value = false
  }
}

function resetAndLoad() {
  items.value = []
  page.value = 1
  total.value = 0
  hasMore.value = false
  notice.value = ''
  if (query.value) {
    loadPage(1, true)
  }
}

function loadMore() {
  if (!query.value || !hasMore.value || pending.value) return
  loadPage(page.value + 1)
}

function setupObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (!sentinel.value || typeof IntersectionObserver === 'undefined') return

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        loadMore()
      }
    },
    { rootMargin: '240px' }
  )

  observer.observe(sentinel.value)
}

watch([query, type], resetAndLoad, { immediate: true })
watch(sentinel, setupObserver)

onMounted(() => {
  setupObserver()
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})

useHead(() => ({
  title: query.value ? `Ricerca: ${query.value} - AgarthaRead` : 'Ricerca'
}))
</script>

