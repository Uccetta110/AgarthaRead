<template>
  <div>
    <NuxtRouteAnnouncer />

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div v-if="!list">Caricamento...</div>
      <div v-else>
        <h1 class="text-2xl font-bold">{{ list.name }}</h1>
        <p class="text-sm text-slate-600 mt-1">{{ list.description }}</p>

        <div class="mt-4">
          <button class="bg-sky-600 text-white px-3 py-1 rounded mr-2" @click="saveOrder">Salva ordine</button>
        </div>

        <div class="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div v-for="item in items" :key="item.ulid" class="">
            <NuxtLink :to="itemRoute(item)" class="block">
              <ItemCard :item="{ title: item.title, cover: item.cover || item.storagePath, authors: [] }">
                <template #actions>
                  <button class="text-sm text-red-600" @click.stop="remove(item)">Rimuovi</button>
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