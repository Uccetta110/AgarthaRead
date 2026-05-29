<template>
  <section class="rounded-[var(--radius-lg)] border border-line bg-surface/85 p-4 shadow-sm backdrop-blur sm:p-6">
    <NuxtRouteAnnouncer />

    <div v-if="error" class="text-red-600 dark:text-red-300">Errore: {{ error.message || error }}</div>
    <div v-else-if="pending" class="text-muted">Caricamento del libro...</div>
    <div v-else-if="!item" class="text-muted">Libro non trovato.</div>
    <div v-else-if="isReadMode" class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Reader libro</p>
          <h1 class="font-display text-2xl font-semibold text-ink">{{ item.title }}</h1>
        </div>
        <NuxtLink
          :to="detailLink"
          class="btn btn-outline"
        >
          Torna alla scheda
        </NuxtLink>
      </div>

      <BookReader
        v-if="readerContent"
        :content="readerContent"
        :title="item.title"
        :authors="item.authors || []"
        :item-id="readerItemId"
        :save-url="saveUrl"
        :language-code="item.language || 'und'"
        :reading-progress="item.readingProgress || null"
        :source-label="readerSourceLabel"
      />

      <div v-else-if="previewUrl" class="space-y-4">
        <div class="rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          Testo completo non disponibile. Mostro la migliore anteprima disponibile dalla fonte esterna.
        </div>
        <div class="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
          <iframe
            :src="previewUrl"
            class="h-[75vh] w-full border-0 bg-white"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>

      <div v-else class="rounded-[var(--radius-lg)] border border-line bg-surface2 p-6 text-muted">
        Nessun testo disponibile per questo libro.
      </div>
    </div>

    <div v-else class="space-y-6">
      <div class="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div class="space-y-4">
          <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.title" class="w-full rounded-[var(--radius-lg)] border border-line object-cover shadow-sm">
          <div v-else class="flex h-72 items-center justify-center rounded-[var(--radius-lg)] bg-surface2 text-sm text-muted">Nessuna copertina</div>

          <div class="rounded-[var(--radius-lg)] border border-line bg-surface2 p-4 text-sm text-muted">
            <p><strong>Autore:</strong> {{ item.authors.join(', ') || 'Sconosciuto' }}</p>
            <p><strong>Lingua:</strong> {{ item.language || 'N/A' }}</p>
            <p><strong>Pubblicato:</strong> {{ item.publishedAt || 'N/A' }}</p>
            <p><strong>Fonte:</strong> {{ item.source }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="rounded-[var(--radius-lg)] border border-line bg-surface/90 p-5 shadow-sm backdrop-blur sm:p-6">
            <h1 class="font-display text-2xl font-semibold text-ink sm:text-3xl">{{ item.title }}</h1>
            <p class="mt-2 text-sm text-muted">{{ item.subtitle }}</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span v-for="tag in item.tags.slice(0, 6)" :key="tag" class="rounded-[var(--radius-md)] border border-line bg-surface2 px-3 py-1 text-xs text-muted">{{ tag }}</span>
            </div>
            <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
              <button class="btn btn-outline">Salva</button>
              <button class="btn btn-ghost">Acquista</button>
              <LikeButton
                :item-id="item.internalId || null"
                :initial-liked="item.isLiked"
                :initial-count="item.likesCount"
                :can-like="item.canLike"
              />
              <a v-if="item.contentUrl" :href="item.contentUrl" target="_blank" rel="noopener noreferrer" class="btn btn-outline">Vai alla fonte</a>
              <NuxtLink
                v-if="item.bodyHtml || item.contentUrl || item.webReaderLink"
                :to="readLink"
                class="btn btn-accent"
              >
                Leggi il libro
              </NuxtLink>
            </div>
          </div>

          <div class="rounded-[var(--radius-lg)] border border-line bg-surface2 p-5 sm:p-6">
            <h2 class="font-display text-xl font-semibold text-ink">Descrizione</h2>
            <p v-if="item.description" class="mt-3 text-sm text-ink/90">{{ item.description }}</p>
            <p v-else class="mt-3 text-sm text-muted">Descrizione non disponibile.</p>
          </div>

          <div v-if="item.bodyHtml" class="rounded-[var(--radius-lg)] border border-line bg-surface2 p-5 sm:p-6">
            <h2 class="font-display text-xl font-semibold text-ink">Contenuto</h2>
            <p class="mt-3 text-sm text-ink/90">
              Il reader completo si apre in una pagina dedicata, con indice capitoli e ripresa dell'ultima lettura.
            </p>
            <div class="mt-4 flex flex-wrap gap-3">
              <NuxtLink
                :to="readLink"
                class="btn btn-accent"
              >
                Leggi il libro
              </NuxtLink>
            </div>
          </div>

          <CommentsPanel
            v-if="item.internalId"
            :item-id="item.internalId"
            :initial-count="item.commentsCount"
            :can-comment="item.canComment"
          />
        </div>
      </div>

    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import BookReader from '../../components/BookReader.vue'

const route = useRoute()
const rawId = computed(() => String(route.params.id || ''))
const isReadMode = computed(() => /\/read\/?$/.test(route.path))
const id = computed(() => rawId.value.replace(/\/read\/?$/, ''))
const apiPath = computed(() => `/api/books/${encodeURIComponent(id.value)}`)
const { data, error, pending } = useFetch(apiPath, { server: false })
const item = computed(() => data.value || null)

const readLink = computed(() => (id.value ? `/books/${encodeURIComponent(id.value)}/read` : '#'))
const detailLink = computed(() => (id.value ? `/books/${encodeURIComponent(id.value)}` : '/books'))
const readerItemId = computed(() => {
  const value = item.value?.internalId
  return typeof value === 'number' ? value : undefined
})
const readerContent = computed(() => String(item.value?.bodyHtml || '').trim())
const previewUrl = computed(() => item.value?.webReaderLink || item.value?.contentUrl || '')
const saveUrl = computed(() => `/api/books/${encodeURIComponent(id.value)}/progress`)
const readerSourceLabel = computed(() => {
  const source = String(item.value?.source || '').trim()
  return source ? `Fonte: ${source}` : ''
})

useHead(() => ({
  title: item.value?.title
    ? `${item.value.title} • ${isReadMode.value ? 'Reader • ' : ''}AgarthaRead`
    : isReadMode.value
      ? 'Reader libro'
      : 'Dettaglio libro'
}))
</script>
