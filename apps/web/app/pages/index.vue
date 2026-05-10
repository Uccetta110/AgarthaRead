<template>
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h1 class="text-2xl font-bold text-slate-900">Manga</h1>
      <div v-if="error" class="mt-4 text-red-600">Errore: {{ error.message || error }}</div>
      
    <div v-else class="mt-6 space-y-6 max-w-full overflow-hidden">
      <div v-for="section in mangaSections" :key="section.title">
        <CarouselItems :items="section.items">
          <template #title>{{ section.title }}</template>
        </CarouselItems>
      </div>
    </div>
    <h1 class="text-2xl font-bold text-slate-900">Libri</h1>

    <div v-if="errorBooks" class="mt-4 text-red-600">Errore: {{ errorBooks.message || error }}</div>

    <div v-else class="mt-6 space-y-6 max-w-full overflow-hidden">
      <div v-for="section in booksSections" :key="section.title">
        <CarouselItems :items="section.items">
          <template #title>{{ section.title }}</template>
        </CarouselItems>
      </div>
    </div>
    <h1 class="text-2xl font-bold text-slate-900">Manga</h1>

    <div v-if="errorNews" class="mt-4 text-red-600">Errore: {{ errorNews.message || errorNews }}</div>

    <div v-else class="mt-6 space-y-6 max-w-full overflow-hidden">
      <div v-for="section in newsSections" :key="section.title">
        <CarouselItems :items="section.items">
          <template #title>{{ section.title }}</template>
        </CarouselItems>
      </div>
    </div>
  </section>
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

