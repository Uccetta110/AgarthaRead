<template>
  <div>
    <NuxtRouteAnnouncer />

    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/80">
      <div v-if="!list" class="text-slate-500 dark:text-slate-400">Caricamento...</div>
      <div v-else>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ list.name }}</h1>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ list.description }}</p>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Visibilita</span>
          <button
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-semibold transition"
            :class="list.isPublic
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60'
              : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'"
            :disabled="savingVisibility"
            @click="toggleVisibility"
          >
            {{ list.isPublic ? 'Pubblica' : 'Privata' }}
          </button>
          <span v-if="visibilityMessage" class="text-xs text-emerald-700 dark:text-emerald-300">{{ visibilityMessage }}</span>
          <span v-if="visibilityError" class="text-xs text-red-600 dark:text-red-300">{{ visibilityError }}</span>
        </div>

        <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button class="rounded bg-sky-600 px-3 py-2 text-white dark:bg-sky-500 sm:py-1" @click="saveOrder">Salva ordine</button>
          <a
            :href="exportUrl"
            class="inline-flex items-center justify-center rounded bg-slate-100 px-3 py-2 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:py-1"
            target="_blank"
            rel="noreferrer"
          >
            Esporta JSON
          </a>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div v-for="item in items" :key="item.ulid" class="">
            <NuxtLink :to="itemRoute(item)" class="block">
              <ItemCard :item="{ title: item.title, cover: item.cover || item.storagePath, authors: [] }">
                <template #actions>
                  <button class="text-sm text-red-600 dark:text-red-300" @click.stop="remove(item)">Rimuovi</button>
                </template>
              </ItemCard>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

type ListRecord = {
  id: number
  name: string
  description: string | null
  isPublic: number | boolean
}

type ListItemRecord = {
  itemId: number
  ulid: string
  type?: string
  searchProvider?: string | null
  searchId?: string | null
  contentProvider?: string | null
  contentId?: string | null
  title: string
  cover?: string | null
  storagePath?: string | null
}

type ListResponse = {
  list: ListRecord
  items?: ListItemRecord[]
}

const route = useRoute()
const list = ref<ListRecord | null>(null)
const items = ref<ListItemRecord[]>([])
const savingVisibility = ref(false)
const visibilityMessage = ref('')
const visibilityError = ref('')
const exportUrl = computed(() => `/api/lists/${encodeURIComponent(String(route.params.id))}/export`)

function itemRoute(item: ListItemRecord) {
  const type = String(item.type || 'book').toLowerCase()
  const base = type === 'manga' ? 'mangas' : type === 'newspaper' ? 'newspapers' : 'books'
  const id = item.searchId || item.contentId || item.itemId
  return `/${base}/${encodeURIComponent(String(id))}`
}

async function load() {
  const id = route.params.id
  const res = await $fetch<ListResponse>(`/api/lists/${id}`)
  list.value = res.list
  items.value = res.items || []
}

async function toggleVisibility() {
  if (!list.value || savingVisibility.value) return

  savingVisibility.value = true
  visibilityMessage.value = ''
  visibilityError.value = ''

  const nextIsPublic = Number(list.value.isPublic) ? 0 : 1

  try {
    await $fetch(`/api/lists/${list.value.id}`, {
      method: 'PUT',
      body: {
        name: list.value.name,
        description: list.value.description,
        isPublic: nextIsPublic
      }
    })

    list.value = {
      ...list.value,
      isPublic: nextIsPublic
    }
    visibilityMessage.value = nextIsPublic ? 'Lista resa pubblica' : 'Lista resa privata'
  } catch (err: any) {
    visibilityError.value = err?.data?.statusMessage || 'Aggiornamento visibilita non riuscito'
  } finally {
    savingVisibility.value = false
  }
}

async function remove(item: ListItemRecord) {
  if (!list.value) return
  await $fetch(`/api/lists/${list.value.id}/items/${item.itemId}`, { method: 'DELETE' })
  await load()
}

async function saveOrder() {
  if (!list.value) return
  const id = list.value.id
  const order = items.value.map((it, idx) => ({ itemId: it.itemId, position: idx + 1 }))
  await $fetch(`/api/lists/${id}/reorder`, { method: 'POST', body: order })
}

load()
</script>