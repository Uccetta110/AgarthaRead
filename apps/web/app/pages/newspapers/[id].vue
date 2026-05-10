<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <NuxtRouteAnnouncer />

    <div v-if="error" class="text-red-600">Errore: {{ error.message || error }}</div>
    <div v-else-if="pending" class="text-slate-500">Caricamento dell'articolo...</div>
    <div v-else-if="!item" class="text-slate-500">Articolo non trovato.</div>
    <div v-else class="space-y-6">
      <div class="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div class="space-y-4">
          <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.title" class="w-full rounded-2xl object-cover shadow-sm">
          <div v-else class="h-72 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">Nessuna immagine</div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p><strong>Fonte:</strong> {{ item.source }}</p>
            <p><strong>Pubblicato:</strong> {{ item.publishedAt || 'N/A' }}</p>
            <p><strong>Link originale:</strong></p>
            <a v-if="item.contentUrl" :href="item.contentUrl" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Apri articolo</a>
            <span v-else class="text-slate-500">Non disponibile</span>
          </div>
        </div>

        <div class="space-y-4">
          <div class="rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h1 class="text-3xl font-bold text-slate-900">{{ item.title }}</h1>
            <p class="mt-2 text-slate-600">{{ item.subtitle }}</p>
            <div class="mt-6 flex flex-wrap gap-3">
              <button class="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Salva</button>
              <button class="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200">Condividi</button>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 class="text-xl font-semibold text-slate-900">Anteprima</h2>
            <p v-if="item.description" class="mt-3 text-slate-700">{{ item.description }}</p>
            <p v-else class="mt-3 text-slate-500">Anteprima non disponibile.</p>
          </div>

          <div v-if="item.bodyHtml" class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 class="text-xl font-semibold text-slate-900">Articolo</h2>
            <div class="prose max-w-none mt-4 text-slate-700 whitespace-pre-wrap">{{ item.bodyHtml }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const route = useRoute()
const id = computed(() => String(route.params.id || ''))
const { data, error, pending } = useFetch(() => id.value ? `/api/news/${encodeURIComponent(id.value)}` : null, { server: false })
const item = computed(() => data.value || null)

useHead(() => ({ title: item.value?.title ? `${item.value.title} • AgarthaRead` : 'Dettaglio articolo' }))
</script>