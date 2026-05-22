<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const route = useRoute()
const id = computed(() => route.params.id)

const user = ref<any>(null)
const lists = ref<any[]>([])
const comments = ref<any[]>([])
const error = ref<string | null>(null)
const listsSort = ref('name')

async function load() {
  error.value = null
  try {
    const res = await $fetch(`/api/users/${id.value}`)
    user.value = res.user
    lists.value = res.lists || []

    // load recent comments by this user
    try {
      const c = await $fetch(`/api/users/${id.value}/comments`)
      comments.value = c.comments || []
    } catch (e) {
      comments.value = []
    }
  } catch (err: any) {
    error.value = err?.data?.statusMessage || String(err)
  }
}

watch(id, load, { immediate: true })

useHead(() => ({ title: user.value ? `${user.value.username} - AgarthaRead` : 'Profilo utente' }))

const sortedLists = computed(() => {
  if (!Array.isArray(lists.value)) return []
  const copy = [...lists.value]
  if (listsSort.value === 'name') return copy.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
  if (listsSort.value === 'created') return copy.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  return copy
})

function formatDate(value?: string | Date | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <section class="mx-auto max-w-4xl p-6 text-slate-900 dark:text-slate-100">
    <div v-if="error" class="text-red-600 dark:text-red-300">{{ error }}</div>
    <div v-else-if="!user" class="text-slate-600 dark:text-slate-400">Caricamento...</div>
    <div v-else class="space-y-4">
      <div class="flex items-center gap-4">
        <img :src="user.avatarDir || '/_nuxt/1.C3LEXl2D.png'" alt="Avatar" class="w-24 h-24 rounded-full" />
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-semibold">{{ user.username }}</h1>
            <span v-if="user.role === 'artist'" class="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs uppercase tracking-wide text-white">Artista</span>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ user.fullName }}</p>
        </div>
      </div>

      <div>
        <h2 class="text-lg font-semibold">Biografia</h2>
        <div class="mt-2 text-sm text-slate-700 dark:text-slate-300" v-if="user.bio">{{ user.bio }}</div>
        <div v-else class="mt-2 text-sm text-slate-500 dark:text-slate-400">Nessuna biografia.</div>
      </div>

      <div>
        <h2 class="text-lg font-semibold mt-4">Liste pubbliche</h2>
        <div class="mt-2 flex items-center justify-between">
          <div></div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-500 dark:text-slate-400">Ordina per</label>
            <select v-model="listsSort" class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <option value="name">Nome</option>
              <option value="created">Data creazione</option>
            </select>
          </div>
        </div>
        <div v-if="lists.length === 0" class="mt-2 text-slate-500 dark:text-slate-400">Nessuna lista pubblica</div>
        <ul v-else class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <li v-for="l in sortedLists" :key="l.id" class="flex items-center gap-3 rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
            <NuxtLink :to="`/lists/${l.id}`" class="flex items-center gap-3">
              <img v-if="l.coverImage" :src="l.coverImage" alt="cover" class="w-16 h-16 rounded object-cover" />
              <div>
                <div class="font-medium">{{ l.name }}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">{{ l.description }}</div>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </div>

      <div>
        <h2 class="text-lg font-semibold mt-6">Commenti pubblicati</h2>
        <div v-if="comments.length === 0" class="mt-2 text-slate-500 dark:text-slate-400">Nessun commento pubblico</div>
        <ul v-else class="mt-2 space-y-2">
          <li v-for="c in comments" :key="c.id" class="rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
            <div class="text-xs text-slate-500 dark:text-slate-400">Su oggetto #{{ c.itemId }} — {{ formatDate(c.createdAt) }}</div>
            <div class="mt-1 text-sm text-slate-700 dark:text-slate-300">{{ c.body }}</div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
