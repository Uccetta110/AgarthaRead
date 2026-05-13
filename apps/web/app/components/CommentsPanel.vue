<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-slate-900">Commenti</h2>
      <span class="text-sm text-slate-500">{{ total }} totali</span>
    </div>

    <div class="mt-4 space-y-3">
      <div v-if="!user" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Accedi per scrivere un commento.
      </div>
      <div v-else-if="!canInteract" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Completa la lettura per sbloccare i commenti.
      </div>
      <form v-else class="space-y-3" @submit.prevent="submitComment">
        <textarea
          v-model="body"
          rows="4"
          class="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          placeholder="Scrivi un commento..."
        />
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-500">Min 3 caratteri</span>
          <button
            class="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="sending || body.trim().length < 3"
            type="submit"
          >
            Invia
          </button>
        </div>
        <p v-if="errorMessage" class="text-xs text-red-600">{{ errorMessage }}</p>
      </form>
    </div>

    <div class="mt-6 space-y-4">
      <div v-if="loading" class="text-sm text-slate-500">Caricamento commenti...</div>
      <div v-else-if="comments.length === 0" class="text-sm text-slate-500">Nessun commento ancora.</div>

      <article v-for="comment in comments" :key="comment.id" class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-full bg-slate-200"></div>
          <div>
            <p class="text-sm font-semibold text-slate-900">
              {{ comment.user.username || 'Utente' }}
              <span v-if="comment.user.role" class="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                {{ comment.user.role }}
              </span>
            </p>
            <p class="text-xs text-slate-500">{{ formatDate(comment.createdAt) }}</p>
          </div>
        </div>
        <p class="mt-3 text-sm text-slate-700">{{ comment.body }}</p>
        <p v-if="comment.rating" class="mt-2 text-xs text-slate-500">Rating: {{ comment.rating }}/5</p>
      </article>

      <button
        v-if="hasMore"
        class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
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
