<template>
  <div class="space-y-6">
    <section class="rounded-[var(--radius-lg)] border border-line bg-surface/85 p-4 shadow-sm backdrop-blur sm:p-6">
      <NuxtRouteAnnouncer />

      <div v-if="error" class="text-red-600 dark:text-red-300">Errore: {{ error.message || error }}</div>
      <div v-else-if="pending" class="text-muted">Caricamento del manga...</div>
      <div v-else-if="!item" class="text-muted">Manga non trovato.</div>
      <div v-else class="space-y-6">
        <div class="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div class="space-y-4">
            <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.title" class="w-full rounded-[var(--radius-lg)] border border-line object-cover shadow-sm">
            <div v-else class="flex h-72 items-center justify-center rounded-[var(--radius-lg)] bg-surface2 text-sm text-muted">Nessuna copertina</div>

            <div class="rounded-[var(--radius-lg)] border border-line bg-surface2 p-4 text-sm text-muted">
              <p><strong>Autore:</strong> {{ item.authors.join(', ') || 'Sconosciuto' }}</p>
              <p><strong>Lingua:</strong> {{ item.language || 'N/A' }}</p>
              <p><strong>Pubblicato:</strong> {{ item.publishedAt || 'N/A' }}</p>
              <p><strong>Rating:</strong> {{ item.rating ?? 'N/A' }}/100</p>
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
                <SaveToListMenu :item="item" catalog-type="manga">
                  <template #trigger="{ openSave }">
                    <button type="button" class="btn btn-outline" @click.stop.prevent="openSave">Salva</button>
                  </template>
                </SaveToListMenu>
                <button class="btn btn-accent">Leggi</button>
                <label class="relative">
                  <span class="sr-only">Lingua capitoli</span>
                  <select
                    v-model="selectedLanguage"
                    class="appearance-none rounded-md border border-line bg-surface px-4 py-2 pr-10 text-sm font-semibold text-ink shadow-sm outline-none transition hover:border-accent/40 focus:border-accent/60"
                  >
                    <option value="">Tutte le lingue</option>
                    <option
                      v-for="language in languageOptions"
                      :key="language.code"
                      :value="language.code"
                    >
                      {{ language.label }}{{ language.count ? ` (${language.count})` : '' }}
                    </option>
                  </select>
                  <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">▾</span>
                </label>
                <LikeButton
                  :item-id="item.internalId || null"
                  :initial-liked="item.isLiked"
                  :initial-count="item.likesCount"
                  :can-like="item.canLike"
                />
                <a v-if="item.contentUrl" :href="item.contentUrl" target="_blank" rel="noopener noreferrer" class="btn btn-outline">Vai alla fonte</a>
              </div>
            </div>

            <div class="rounded-[var(--radius-lg)] border border-line bg-surface2 p-5 sm:p-6">
              <h2 class="font-display text-xl font-semibold text-ink">Capitoli</h2>
              <p class="mt-2 text-sm text-muted">Capitoli caricati: {{ item.chapterCount || chapters.length }}</p>
              <p v-if="item.chaptersNotice" class="mt-2 text-sm text-amber-600 dark:text-amber-400">{{ item.chaptersNotice }}</p>

              <div v-if="chapters.length" class="mt-4 space-y-3">
                <NuxtLink
                  v-for="chapter in chapters"
                  :key="chapter.id"
                  :to="{
                    path: `/mangas/${id}/chapter/${chapter.id}`,
                    query: {
                      number: chapter.chapter ?? '',
                      title: chapter.title ?? '',
                      url: chapter.contentUrl ?? '',
                      lang: selectedLanguage
                    }
                  }"
                  class="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-line bg-surface p-4 transition hover:border-accent/40 hover:bg-surface2"
                >
                  <div>
                    <p class="font-semibold text-ink">
                      Capitolo {{ chapter.chapter || 'N/D' }}
                      <span v-if="chapter.title"> - {{ chapter.title }}</span>
                    </p>
                    <p class="text-sm text-muted">
                      <span v-if="chapter.volume">Volume {{ chapter.volume }}</span>
                      <span v-if="chapter.language">{{ chapter.volume ? ' • ' : '' }}Lingua {{ chapter.language }}</span>
                      <span v-if="chapter.publishedAt">{{ (chapter.volume || chapter.language) ? ' • ' : '' }}{{ chapter.publishedAt }}</span>
                    </p>
                  </div>
                  <span class="text-sm font-semibold text-accent">Apri</span>
                </NuxtLink>
              </div>

              <p v-else class="mt-4 text-sm text-muted">La lista dei capitoli non è disponibile per questo titolo.</p>
            </div>

            <div class="rounded-[var(--radius-lg)] border border-line bg-surface2 p-5 sm:p-6">
              <h2 class="font-display text-xl font-semibold text-ink">Descrizione</h2>
              <p v-if="item.description" class="mt-3 text-sm text-ink/90">{{ item.description }}</p>
              <p v-else class="mt-3 text-sm text-muted">Descrizione non disponibile.</p>
            </div>

            <div v-if="item.bodyHtml" class="rounded-[var(--radius-lg)] border border-line bg-surface2 p-5 sm:p-6">
              <h2 class="font-display text-xl font-semibold text-ink">Dettagli</h2>
              <div class="prose mt-4 max-w-none whitespace-pre-wrap text-ink/90 dark:prose-invert">{{ item.bodyHtml }}</div>
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

    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

const LANGUAGE_LABELS: Record<string, string> = {
  ar: 'Arabic',
  ca: 'Catalan',
  de: 'German',
  el: 'Greek',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  he: 'Hebrew',
  hi: 'Hindi',
  id: 'Indonesian',
  it: 'Italiano',
  ja: 'Japanese',
  pl: 'Polish',
  pt: 'Portuguese',
  'pt-br': 'Portuguese (Brazil)',
  ru: 'Russian',
  th: 'Thai',
  uk: 'Ukrainian',
  vi: 'Vietnamese',
  zh: 'Chinese'
}

const LANGUAGE_ALIASES: Record<string, string> = {
  'en-au': 'en',
  'en-ca': 'en',
  'en-gb': 'en',
  'en-us': 'en',
  'zh-cn': 'zh',
  'zh-hk': 'zh',
  'zh-tw': 'zh'
}

function normalizeLanguageCode(value?: string | null) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  return LANGUAGE_ALIASES[raw] || raw
}

function getLanguageLabel(value?: string | null) {
  const code = normalizeLanguageCode(value)
  if (!code) return ''
  return LANGUAGE_LABELS[code] || code.toUpperCase()
}

type MangaChapter = {
  id: string
  title?: string
  chapter?: string | number | null
  volume?: string | number | null
  language?: string | null
  publishedAt?: string | null
  contentUrl?: string | null
}

type MangaDetail = {
  id?: string
  title: string
  subtitle: string
  authors: string[]
  description: string
  coverUrl?: string | null
  contentUrl?: string | null
  language?: string | null
  publishedAt?: string | null
  rating?: number | null
  source?: string
  tags: string[]
  internalId?: number | null
  isLiked?: boolean
  likesCount?: number
  canLike?: boolean
  chapterCount?: number | null
  chaptersNotice?: string | null
  bodyHtml?: string | null
  commentsCount?: number
  canComment?: boolean
  availableLanguages: string[]
  availableLanguageCounts?: Array<{ code: string; label: string; count: number }>
  selectedLanguage?: string | null
  chapters: MangaChapter[]
}

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id || ''))
const selectedLanguage = ref(String(route.query.lang || route.query.language || '').trim().toLowerCase())
const requestUrl = computed(() => {
  const base = `/api/manga/${encodeURIComponent(id.value)}`
  return selectedLanguage.value ? `${base}?lang=${encodeURIComponent(selectedLanguage.value)}` : base
})

const { data, error, pending } = useFetch(
  requestUrl,
  { server: false, watch: [selectedLanguage] }
)

const item = computed<MangaDetail>(() => ({
  title: '',
  subtitle: '',
  authors: [],
  description: '',
  tags: [],
  availableLanguages: [],
  availableLanguageCounts: [],
  chapters: [],
  ...(data.value as Partial<MangaDetail> || {})
}))
const chapters = computed<MangaChapter[]>(() => item.value.chapters || [])
const languageOptions = computed(() => {
  const counts = Array.isArray(item.value.availableLanguageCounts) ? item.value.availableLanguageCounts : []

  return counts.map((entry) => ({
    code: entry.code,
    label: entry.label || getLanguageLabel(entry.code),
    count: entry.count
  }))
})

watch(
  () => route.query.lang,
  (value) => {
    const next = normalizeLanguageCode(String(value || '').trim())
    if (next && next !== selectedLanguage.value) {
      selectedLanguage.value = next
    }
    if (!next && selectedLanguage.value) {
      selectedLanguage.value = ''
    }
  }
)

watch(selectedLanguage, async (value, previousValue) => {
  if (!value || value === previousValue) return
  await router.replace({ query: { ...route.query, lang: value } })
})

useHead(() => ({ title: item.value?.title ? `${item.value.title} • AgarthaRead` : 'Dettaglio manga' }))
</script>