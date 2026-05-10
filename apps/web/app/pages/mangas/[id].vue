<template>
  <div class="space-y-6">
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <NuxtRouteAnnouncer />

      <div v-if="error" class="text-red-600">Errore: {{ error.message || error }}</div>
      <div v-else-if="pending" class="text-slate-500">Caricamento del manga...</div>
      <div v-else-if="!item" class="text-slate-500">Manga non trovato.</div>
      <div v-else class="space-y-6">
        <div class="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div class="space-y-4">
            <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.title" class="w-full rounded-2xl object-cover shadow-sm">
            <div v-else class="h-72 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">Nessuna copertina</div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><strong>Autore:</strong> {{ item.authors.join(', ') || 'Sconosciuto' }}</p>
              <p><strong>Lingua:</strong> {{ item.language || 'N/A' }}</p>
              <p><strong>Pubblicato:</strong> {{ item.publishedAt || 'N/A' }}</p>
              <p><strong>Fonte:</strong> {{ item.source }}</p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h1 class="text-3xl font-bold text-slate-900">{{ item.title }}</h1>
              <p class="mt-2 text-slate-600">{{ item.subtitle }}</p>
              <div class="mt-4 flex flex-wrap gap-2">
                <span v-for="tag in item.tags.slice(0, 6)" :key="tag" class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{{ tag }}</span>
              </div>
              <div class="mt-6 flex flex-wrap gap-3">
                <button class="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Salva</button>
                <button class="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200">Leggi</button>
                <a v-if="item.contentUrl" :href="item.contentUrl" target="_blank" rel="noopener noreferrer" class="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">Vai alla fonte</a>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 class="text-xl font-semibold text-slate-900">Capitoli</h2>
              <p class="mt-2 text-sm text-slate-500">Capitoli caricati: {{ item.chapterCount || chapters.length }}</p>

              <div v-if="chapters.length" class="mt-4 space-y-3">
                <NuxtLink
                  v-for="chapter in chapters"
                  :key="chapter.id"
                  :to="`/mangas/${id}/chapter/${chapter.id}`"
                  class="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:bg-slate-50"
                >
                  <div>
                    <p class="font-medium text-slate-900">
                      Capitolo {{ chapter.chapter || 'N/D' }}
                      <span v-if="chapter.title"> - {{ chapter.title }}</span>
                    </p>
                    <p class="text-sm text-slate-500">
                      <span v-if="chapter.volume">Volume {{ chapter.volume }}</span>
                      <span v-if="chapter.language">{{ chapter.volume ? ' • ' : '' }}Lingua {{ chapter.language }}</span>
                      <span v-if="chapter.publishedAt">{{ (chapter.volume || chapter.language) ? ' • ' : '' }}{{ chapter.publishedAt }}</span>
                    </p>
                  </div>
                  <span class="text-sm font-semibold text-blue-600">Apri</span>
                </NuxtLink>
              </div>

              <p v-else class="mt-4 text-sm text-slate-500">La lista dei capitoli non è disponibile per questo titolo.</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 class="text-xl font-semibold text-slate-900">Descrizione</h2>
              <p v-if="item.description" class="mt-3 text-slate-700">{{ item.description }}</p>
              <p v-else class="mt-3 text-slate-500">Descrizione non disponibile.</p>
            </div>

            <div v-if="item.bodyHtml" class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 class="text-xl font-semibold text-slate-900">Dettagli</h2>
              <div class="prose max-w-none mt-4 text-slate-700 whitespace-pre-wrap">{{ item.bodyHtml }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <NuxtPage />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const route = useRoute()
const id = computed(() => String(route.params.id || ''))
const { data, error, pending } = useFetch(() => id.value ? `/api/manga/${encodeURIComponent(id.value)}` : null, { server: false })
const item = computed(() => data.value || null)
const chapters = computed(() => item.value?.chapters || [])

useHead(() => ({ title: item.value?.title ? `${item.value.title} • AgarthaRead` : 'Dettaglio manga' }))
</script>