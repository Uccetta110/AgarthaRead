<template>
  <div class="group flex-shrink-0 relative">
    <div class="bg-slate-50 rounded-md overflow-hidden shadow-sm">
      <div class="w-full" style="aspect-ratio: 2/3;">
        <img v-if="cover" :src="cover" :alt="item.title" class="w-full h-full object-contain bg-white" />
        <div v-else class="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-500">No image</div>
      </div>
    </div>

    <button
      type="button"
      @click.stop.prevent="openSave"
      title="Salva"
      class="absolute top-2 right-2 bg-white rounded-full p-1 shadow opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-sky-600" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a1 1 0 00-1 1v12l6-3 6 3V4a1 1 0 00-1-1H5z"/></svg>
    </button>

    <h3 class="mt-2 text-sm font-medium text-slate-900 truncate">{{ item.title }}</h3>
    <p class="text-xs text-slate-500 truncate">{{ authors }}</p>

    <div v-if="likeItemId !== null" class="mt-2">
      <LikeButton
        :item-id="likeItemId"
        :initial-liked="item.isLiked"
        :initial-count="item.likesCount"
        :can-like="item.canLike"
      />
    </div>

    <div class="mt-2" @click.stop>
      <slot name="actions"></slot>
    </div>

    <div v-if="showModal" class="fixed inset-0 flex items-center justify-center bg-black/40 z-50" @click.stop>
      <div class="bg-white p-4 rounded shadow w-80" @click.stop>
        <h4 class="font-semibold">Salva in lista</h4>
        <div class="mt-2" v-if="loadingLists">Caricamento...</div>
        <div class="mt-2" v-else>
          <div v-for="l in lists" :key="l.id" class="flex items-center justify-between py-1">
            <div class="text-sm">{{ l.name }}</div>
            <button type="button" @click.stop.prevent="saveTo(l.id)" class="text-sky-600 text-sm">Salva</button>
          </div>
          <div v-if="lists.length === 0" class="text-sm text-slate-500">Nessuna lista</div>
        </div>
        <div class="mt-3 border-t pt-3">
          <input v-model="newListName" placeholder="Crea nuova lista" class="w-full border rounded px-2 py-1 text-sm" />
          <div class="mt-2 flex justify-end gap-2">
            <button type="button" @click.stop.prevent="createAndSave" class="bg-sky-600 text-white px-3 py-1 rounded text-sm">Crea e salva</button>
            <button type="button" @click.stop.prevent="closeSave" class="px-3 py-1 rounded text-sm">Annulla</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ item: { type: Object, required: true } })
import { computed, ref } from 'vue'

const item = props.item
const cover = computed(() => item.cover || item.thumbnail || item.image || item.poster || item.image_url || null)
const authors = computed(() => ((item.authors || []).slice(0, 2).join(', ')))
const likeItemId = computed(() => {
  const parsedId = Number(item.internalId)
  return Number.isFinite(parsedId) ? parsedId : null
})

const showModal = ref(false)
const lists = ref([])
const loadingLists = ref(false)
const newListName = ref('')

function openSave() {
  showModal.value = true
  loadLists()
}

function closeSave() {
  showModal.value = false
}

async function loadLists() {
  loadingLists.value = true
  try {
    const res = await $fetch('/api/lists')
    lists.value = res.lists || []
  } catch (e) {
    lists.value = []
  } finally {
    loadingLists.value = false
  }
}

async function saveTo(listId) {
  try {
    const searchProvider = item.searchProvider || item.externalProvider || null
    const searchId = item.searchId || item.externalId || null
    const contentProvider = item.contentProvider || searchProvider
    const contentId = item.contentId || searchId

    if (searchProvider && searchId) {
      await $fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        body: {
          item_type: item.type || 'book',
          search_provider: searchProvider,
          search_id: searchId,
          content_provider: contentProvider,
          content_id: contentId,
          external_provider: searchProvider,
          external_id: searchId,
          releaseDate: item.releaseDate || item.publishedAt || null,
          title: item.title,
          coverUrl: item.cover || null
        }
      })
    } else if (item.id) {
      await $fetch(`/api/lists/${listId}/items`, { method: 'POST', body: { itemId: item.id } })
    } else {
      await $fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        body: {
          item_type: item.type || 'book',
          search_provider: 'unknown',
          search_id: String(item.title).slice(0, 100),
          content_provider: 'unknown',
          content_id: String(item.title).slice(0, 100),
          external_provider: 'unknown',
          external_id: String(item.title).slice(0, 100),
          releaseDate: item.releaseDate || item.publishedAt || null,
          title: item.title
        }
      })
    }
    closeSave()
  } catch (e) {
    closeSave()
  }
}

async function createAndSave() {
  if (!newListName.value.trim()) return
  try {
    const res = await $fetch('/api/lists', { method: 'POST', body: { name: newListName.value } })
    const id = res.id || res.id
    newListName.value = ''
    await saveTo(id)
  } catch (e) {
    // ignore
  }
}
</script>
