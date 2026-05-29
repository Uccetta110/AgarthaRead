<template>
  <div class="space-y-10">
    <section class="rounded-[var(--radius-lg)] border border-line bg-surface/80 p-6 shadow-sm backdrop-blur">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="font-display text-2xl font-semibold text-ink">Manga</h2>
          <p class="mt-1 text-sm text-muted">Selezione in evidenza.</p>
        </div>
        <span class="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">In evidenza</span>
      </div>
      <div v-if="error" class="mt-4 text-red-600 dark:text-red-300">Errore: {{ error.message || error }}</div>

      <div v-else class="mt-6 space-y-6 max-w-full overflow-hidden">
        <div v-for="section in mangaSections" :key="section.title">
          <CarouselItems type="mangas" :items="section.items">
            <template #title>{{ section.title }}</template>
          </CarouselItems>
        </div>
      </div>
    </section>

    <section class="rounded-[var(--radius-lg)] border border-line bg-surface/80 p-6 shadow-sm backdrop-blur">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="font-display text-2xl font-semibold text-ink">Libri</h2>
          <p class="mt-1 text-sm text-muted">Catalogo libri in evidenza.</p>
        </div>
        <span class="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">In evidenza</span>
      </div>
      <div v-if="errorBooks" class="mt-4 text-red-600 dark:text-red-300">Errore: {{ errorBooks.message || errorBooks }}</div>

      <div v-else class="mt-6 space-y-6 max-w-full overflow-hidden">
        <div v-for="section in booksSections" :key="section.title">
          <CarouselItems type="books" :items="section.items">
            <template #title>{{ section.title }}</template>
          </CarouselItems>
        </div>
      </div>
    </section>

    <section class="rounded-[var(--radius-lg)] border border-line bg-surface/80 p-6 shadow-sm backdrop-blur">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="font-display text-2xl font-semibold text-ink">Giornali</h2>
          <p class="mt-1 text-sm text-muted">Notizie e articoli recenti.</p>
        </div>
        <span class="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">In evidenza</span>
      </div>
      <div v-if="errorNews" class="mt-4 text-red-600 dark:text-red-300">Errore: {{ errorNews.message || errorNews }}</div>

      <div v-else class="mt-6 space-y-6 max-w-full overflow-hidden">
        <div v-for="section in newsSections" :key="section.title">
          <CarouselItems type="newspapers" :items="section.items">
            <template #title>{{ section.title }}</template>
          </CarouselItems>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CarouselItems from '../components/carousel/Items.vue'

// Solo la sezione Popolari per ogni oggetto
const { data, error } = useFetch('/api/manga/home?sections=top&titles=Popolari', { server: false })
const mangaSections = computed(() => data.value?.sections || [])

const { data: dataBooks, error: errorBooks } = useFetch('/api/books/home?subjects=fiction&titles=Popolari', { server: false })
const booksSections = computed(() => dataBooks.value?.sections || [])

const { data: dataNews, error: errorNews } = useFetch('/api/news/home?sections=top&titles=Popolari', { server: false })
const newsSections = computed(() => dataNews.value?.sections || [])
</script>

