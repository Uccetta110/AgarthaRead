<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900/80">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">Commenti</h2>
      <span class="text-sm text-slate-500 dark:text-slate-400">{{ total }} totali</span>
    </div>

    <div class="mt-4 space-y-3">
      <div v-if="!user" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
        Accedi per scrivere un commento.
      </div>
      <div v-else-if="!canInteract" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
        Completa la lettura per sbloccare i commenti.
      </div>
      <form v-else class="space-y-3" @submit.prevent="submitComment">
        <textarea
          v-model="body"
          rows="4"
          class="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
          placeholder="Scrivi un commento..."
        />
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-500 dark:text-slate-400">Min 3 caratteri</span>
          <button
            class="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="sending || body.trim().length < 3"
            type="submit"
          >
            Invia
          </button>
        </div>
        <p v-if="errorMessage" class="text-xs text-red-600 dark:text-red-300">{{ errorMessage }}</p>
      </form>
    </div>

    <div class="mt-6 space-y-4">
      <div v-if="loading" class="text-sm text-slate-500 dark:text-slate-400">Caricamento commenti...</div>
      <div v-else-if="comments.length === 0" class="text-sm text-slate-500 dark:text-slate-400">Nessun commento ancora.</div>

      <article v-for="comment in comments" :key="comment.id" class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700"></div>
          <div>
            <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {{ comment.user.username || 'Utente' }}
              <span v-if="comment.user.role === 'artist'" class="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.167c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.057 9.384c-.783-.57-.38-1.81.588-1.81h4.167a1 1 0 00.95-.69l1.287-3.957z"/></svg>
                Artista
              </span>
              <span v-else-if="comment.user.role" class="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white dark:bg-slate-100 dark:text-slate-950">
                {{ comment.user.role }}
              </span>
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ formatDate(comment.createdAt) }}</p>
          </div>
        </div>
        <p class="mt-3 text-sm text-slate-700 dark:text-slate-300">{{ comment.body }}</p>
        <p v-if="comment.rating" class="mt-2 text-xs text-slate-500 dark:text-slate-400">Rating: {{ comment.rating }}/5</p>
      </article>

      <button
        v-if="hasMore"
        class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:bg-slate-900"
        :disabled="loadingMore"
        @click="loadMore"
        type="button"
      >
        Carica altri
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type CommentUser = {
  id: number
  username: string
  avatarDir?: string | null
  role?: string | null
}

type CommentItem = {
  id: number
  body: string
  rating?: number | null
  createdAt?: string | Date | null
  user: CommentUser
}

const props = defineProps<{
  itemId: number | null
  initialCount?: number
  canComment?: boolean
}>()

const user = useAuthUser()
const comments = ref<CommentItem[]>([])
const total = ref(Number.isFinite(props.initialCount) ? Number(props.initialCount) : 0)
const loading = ref(false)
const loadingMore = ref(false)
const sending = ref(false)
const errorMessage = ref('')
const body = ref('')
const limit = 10
const offset = ref(0)

const canInteract = computed(() => props.canComment !== false)
const hasMore = computed(() => comments.value.length < total.value)

watch(() => props.initialCount, (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    total.value = value
  }
})

watch(
  () => props.itemId,
  async (value) => {
    if (!value) return
    offset.value = 0
    comments.value = []
    await loadComments(true)
  },
  { immediate: true }
)

function formatDate(value?: string | Date | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function loadComments(reset = false) {
  if (!props.itemId) return
  loading.value = reset
  loadingMore.value = !reset
  errorMessage.value = ''

  try {
    const response = await $fetch<{ comments: CommentItem[]; total: number; limit: number; offset: number }>(
      `/api/catalog/${props.itemId}/comments`,
      {
        query: {
          limit,
          offset: reset ? 0 : offset.value
        }
      }
    )

    if (reset) {
      comments.value = response.comments || []
      offset.value = response.comments?.length || 0
    } else {
      comments.value = [...comments.value, ...(response.comments || [])]
      offset.value += response.comments?.length || 0
    }

    if (typeof response.total === 'number' && Number.isFinite(response.total)) {
      total.value = response.total
    }
  } catch (error) {
    errorMessage.value = 'Errore nel caricamento dei commenti'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function loadMore() {
  await loadComments(false)
}

async function submitComment() {
  errorMessage.value = ''

  if (!props.itemId) return
  if (!user.value) {
    await navigateTo('/auth/login')
    return
  }

  if (!canInteract.value) {
    errorMessage.value = 'Non puoi commentare adesso'
    return
  }

  const text = body.value.trim()
  if (text.length < 3) return

  sending.value = true

  try {
    const response = await $fetch<{ comment: CommentItem }>(`/api/catalog/${props.itemId}/comments`, {
      method: 'POST',
      body: { body: text }
    })

    if (response?.comment) {
      comments.value = [response.comment, ...comments.value]
      total.value += 1
      body.value = ''
    }
  } catch (error: any) {
    if (error?.statusCode === 401) {
      await navigateTo('/auth/login')
      return
    }
    errorMessage.value = 'Errore durante l\'invio'
  } finally {
    sending.value = false
  }
}
</script>
