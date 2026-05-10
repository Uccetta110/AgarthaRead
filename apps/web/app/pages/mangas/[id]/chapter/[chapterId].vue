<template>
  <section ref="chapterReaderTop" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <NuxtRouteAnnouncer />

    <div class="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-sm text-slate-500">Reader capitolo</p>
        <h1 class="text-2xl font-bold text-slate-900">
          Capitolo {{ chapterLabel || 'N/D' }}
          <span v-if="chapterTitle">- {{ chapterTitle }}</span>
        </h1>
      </div>

      <div class="flex flex-wrap gap-2">
        <NuxtLink :to="`/mangas/${mangaId}`" class="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200">Torna al manga</NuxtLink>
        <a v-if="chapterUrl" :href="chapterUrl" target="_blank" rel="noopener noreferrer" class="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">Apri su MangaDex</a>
      </div>
    </div>

    <div v-if="error" class="mt-6 text-red-600">Errore: {{ error.message || error }}</div>
    <div v-else-if="pending" class="mt-6 text-slate-500">Caricamento pagine capitolo...</div>
    <div v-else-if="!reader" class="mt-6 text-slate-500">Capitolo non disponibile.</div>
    <div v-else class="mt-6 space-y-6">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p><strong>Qualità:</strong> {{ reader.quality }}</p>
        <p><strong>Pagine:</strong> {{ reader.pages.length }}</p>
        <p v-if="reader.volume"><strong>Volume:</strong> {{ reader.volume }}</p>
        <p v-if="reader.language"><strong>Lingua:</strong> {{ reader.language }}</p>
        <p v-if="reader.hash"><strong>Hash capitolo:</strong> {{ reader.hash }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span class="font-semibold text-slate-700">Dimensione</span>
        <input
          v-model.number="zoom"
          type="range"
          min="10"
          max="100"
          step="5"
          aria-label="Dimensione immagini"
          class="w-40 accent-blue-600"
        >
        <span class="tabular-nums text-slate-500">{{ zoom }}%</span>
      </div>

      <div v-if="reader.pages.length" >
        <article
          v-for="page in reader.pages"
          :key="page.filename"
          class="overflow-hidden bg-white shadow-sm"
        >
          <img
            :src="page.url"
            :alt="`Pagina ${page.index + 1}`"
            :style="{ width: `${zoom}%` }"
            class="mx-auto block bg-black object-contain"
            loading="lazy"
            decoding="async"
          >
        </article>
      </div>

      <div v-else class="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-500">
        Nessuna immagine disponibile per questo capitolo.
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

definePageMeta({ scrollToTop: false })

const route = useRoute()
const mangaId = computed(() => String(route.params.id || ''))
const chapterId = computed(() => String(route.params.chapterId || ''))
const chapterReaderTop = ref<HTMLElement | null>(null)
const zoom = ref(100)

const { data, error, pending } = useFetch(() => `/api/manga/chapter/${encodeURIComponent(chapterId.value)}`, { server: false })

watch(chapterId, async () => {
  await nextTick()
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
  }
  await new Promise((resolve) => setTimeout(resolve, 50))
  if (chapterReaderTop.value) {
    chapterReaderTop.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}, { immediate: true })

const reader = computed(() => data.value || null)
const chapterLabel = computed(() => {
  if (!reader.value) return ''
  return String(reader.value.chapter || reader.value.chapterId || '')
})
const chapterTitle = computed(() => String(reader.value?.title || ''))
const chapterUrl = computed(() => `https://mangadex.org/chapter/${encodeURIComponent(chapterId.value)}`)

useHead(() => ({
  title: reader.value?.chapterId ? `Capitolo ${reader.value.chapterId} • AgarthaRead` : 'Reader capitolo'
}))
</script>