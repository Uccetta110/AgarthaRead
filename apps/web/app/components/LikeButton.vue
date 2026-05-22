<template>
  <div class="space-y-1">
    <button
      class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="isDisabled"
      @click.stop.prevent="toggleLike"
      type="button"
    >
      <span>{{ liked ? 'Ti piace' : 'Like' }}</span>
      <span class="inline-flex min-w-[2ch] items-center justify-center rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white dark:bg-slate-100 dark:text-slate-950">
        {{ count }}
      </span>
    </button>

    <p v-if="helperText" class="text-xs text-slate-500 dark:text-slate-400">{{ helperText }}</p>
    <p v-if="errorMessage" class="text-xs text-red-600 dark:text-red-300">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  itemId: number | null
  initialLiked?: boolean
  initialCount?: number
  canLike?: boolean
}>()

const user = useAuthUser()
const liked = ref(Boolean(props.initialLiked))
const count = ref(Number.isFinite(props.initialCount) ? Number(props.initialCount) : 0)
const loading = ref(false)
const errorMessage = ref('')

watch(() => props.initialLiked, (value) => {
  liked.value = Boolean(value)
})

watch(() => props.initialCount, (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    count.value = value
  }
})

const canInteract = computed(() => props.canLike !== false)
const isDisabled = computed(() => loading.value || !props.itemId || !canInteract.value)

const helperText = computed(() => {
  if (!user.value) return 'Accedi per mettere like'
  if (!canInteract.value) return 'Completa la lettura per mettere like'
  return ''
})

async function toggleLike() {
  errorMessage.value = ''

  if (!props.itemId) return

  if (!user.value) {
    await navigateTo('/auth/login')
    return
  }

  if (!canInteract.value) {
    errorMessage.value = 'Non puoi mettere like adesso'
    return
  }

  loading.value = true

  try {
    const response = await $fetch<{ liked: boolean; likesCount: number }>(`/api/catalog/${props.itemId}/likes`, {
      method: 'POST'
    })

    liked.value = Boolean(response.liked)
    if (typeof response.likesCount === 'number' && Number.isFinite(response.likesCount)) {
      count.value = response.likesCount
    }
  } catch (error: any) {
    if (error?.statusCode === 401) {
      await navigateTo('/auth/login')
      return
    }

    if (error?.statusCode === 403) {
      errorMessage.value = error?.statusMessage || error?.data?.statusMessage || 'Devi completare la lettura per mettere like'
      return
    }

    if (error?.statusCode === 400 || error?.statusCode === 404) {
      errorMessage.value = error?.statusMessage || error?.data?.statusMessage || 'Impossibile aggiornare il like'
      return
    }

    errorMessage.value = error?.statusMessage || error?.data?.statusMessage || 'Errore durante il like'
  } finally {
    loading.value = false
  }
}
</script>
