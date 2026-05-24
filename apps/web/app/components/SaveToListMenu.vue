<template>
  <slot
    name="trigger"
    :open-save="openSave"
    :saved-in-lists="savedInLists"
    :is-open="showModal"
  />

  <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60" @click.self="closeSave">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:p-5" @click.stop>
      <h2 class="text-lg font-semibold">Salva in lista</h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Scegli una lista in cui aggiungere questo contenuto.</p>

      <div class="mt-4 max-h-72 space-y-2 overflow-auto pr-1">
        <div v-if="loadingLists" class="text-sm text-slate-500 dark:text-slate-400">Caricamento liste...</div>
        <div v-else-if="lists.length === 0" class="text-sm text-slate-500 dark:text-slate-400">Nessuna lista disponibile.</div>
        <div v-for="list in lists" :key="list.id" class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{{ list.name }}</p>
            <p v-if="list.tags" class="truncate text-xs text-slate-500 dark:text-slate-400">{{ list.tags }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="savedInLists.includes(list.id)" class="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Salvato</span>
            <button type="button" class="rounded-full bg-sky-600 px-3 py-1 text-sm font-semibold text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400" @click.stop.prevent="saveTo(list.id)">Salva</button>
          </div>
        </div>
      </div>

      <div class="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <input v-model="newListName" placeholder="Crea nuova lista" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500">
        <div class="mt-3 flex justify-end gap-2">
          <button type="button" class="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400" @click.stop.prevent="createAndSave">Crea e salva</button>
          <button type="button" class="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" @click.stop.prevent="closeSave">Annulla</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { buildListSaveRequest } from './itemCardSave.js'

type ListEntry = {
  id: number
  name: string
  tags?: string | null
}

const props = defineProps({
  item: { type: Object, required: true },
  catalogType: { type: String, required: false, default: '' }
})

const showModal = ref(false)
const lists = ref<ListEntry[]>([])
const loadingLists = ref(false)
const newListName = ref('')
const savedInLists = ref<number[]>([])

const saveTargetItemId = computed(() => {
  const item = props.item as Record<string, any>
  const candidates = [item.internalId, item.id]

  for (const candidate of candidates) {
    const parsed = Number(candidate)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return null
})

function openSave() {
  showModal.value = true
  void loadLists()
}

function closeSave() {
  showModal.value = false
}

async function loadLists() {
  loadingLists.value = true

  try {
    const res = await $fetch<{ lists?: ListEntry[] }>('/api/lists')
    lists.value = Array.isArray(res.lists) ? res.lists : []

    const itemId = saveTargetItemId.value
    if (!itemId) {
      savedInLists.value = []
      return
    }

    try {
      const contains = await $fetch<{ listIds?: number[] }>('/api/lists/contains', { params: { itemId } })
      savedInLists.value = Array.isArray(contains.listIds) ? contains.listIds : []
    } catch {
      savedInLists.value = []
    }
  } catch {
    lists.value = []
    savedInLists.value = []
  } finally {
    loadingLists.value = false
  }
}

async function saveTo(listId: number) {
  try {
    const item = props.item as Record<string, any>
    const request = buildListSaveRequest(item, props.catalogType)
    await $fetch(`/api/lists/${listId}/items`, {
      method: 'POST',
      body: request.body
    })
    closeSave()
  } catch {
    closeSave()
  }
}

async function createAndSave() {
  const name = newListName.value.trim()
  if (!name) return

  try {
    const res = await $fetch<{ id?: number }>('/api/lists', { method: 'POST', body: { name } })
    newListName.value = ''

    const id = Number(res.id)
    if (Number.isFinite(id) && id > 0) {
      await saveTo(id)
    }
  } catch {
    // ignore
  }
}
</script>
