<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h1 class="text-2xl font-bold text-slate-900">Libri</h1>
    <p class="mt-2 text-slate-600">Sfoglia le categorie disponibili.</p>

    <div v-if="error" class="mt-4 text-red-600">Errore: {{ error.message || error }}</div>

    <div v-else class="mt-6 space-y-6">
      <div v-for="section in sections" :key="section.title">
        <CarouselItems :items="section.items">
          <template #title>{{ section.title }}</template>
        </CarouselItems>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import CarouselItems from '../../components/carousel/Items.vue'

const { data, error } = useFetch('/api/books/home', { server: false })
const sections = computed(() => data.value?.sections || [])
</script>