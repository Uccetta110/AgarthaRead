<template>
  <div class="space-y-8">
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Manga</h1>
      <p class="mt-2 text-slate-600 dark:text-slate-300">Selezione in evidenza.</p>
      <div v-if="error" class="mt-4 text-red-600 dark:text-red-300">Errore: {{ error.message || error }}</div>

      <div v-else class="mt-6 space-y-6 max-w-full overflow-hidden">
        <div v-for="section in mangaSections" :key="section.title">
          <CarouselItems type="mangas" :items="section.items">
            <template #title>{{ section.title }}</template>
          </CarouselItems>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Libri</h1>
      <p class="mt-2 text-slate-600 dark:text-slate-300">Catalogo libri in evidenza.</p>
      <div v-if="errorBooks" class="mt-4 text-red-600 dark:text-red-300">Errore: {{ errorBooks.message || errorBooks }}</div>

      <div v-else class="mt-6 space-y-6 max-w-full overflow-hidden">
        <div v-for="section in booksSections" :key="section.title">
          <CarouselItems type="books" :items="section.items">
            <template #title>{{ section.title }}</template>
          </CarouselItems>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Giornali</h1>
      <p class="mt-2 text-slate-600 dark:text-slate-300">Notizie e articoli recenti.</p>
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

