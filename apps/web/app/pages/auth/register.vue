<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 px-3 py-6 text-slate-900 sm:px-4 sm:py-10 dark:bg-slate-950 dark:text-slate-100">
    <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg sm:max-w-md sm:p-8 dark:bg-slate-900 dark:shadow-black/20">
      <h2 class="mb-6 text-center text-2xl font-bold">Registrazione</h2>
      <form @submit.prevent="onSubmit">
        <div class="mb-4">
          <label for="fullName" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome</label>
          <input
            id="fullName"
            v-model="form.fullName"
            type="text"
            class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="Mario Rossi"
            required
          >
        </div>

        <div class="mb-4">
          <label for="username" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="mariorossi"
            required
          >
        </div>

        <div class="mb-4">
          <label for="email" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="nome@dominio.it"
            required
          >
        </div>

        <div class="mb-6">
          <label for="password" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="Almeno 8 caratteri"
            required
          >
        </div>

        <p v-if="errorMessage" class="mb-4 text-sm text-red-600 dark:text-red-300">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white disabled:opacity-60"
        >
          {{ loading ? 'Registrazione...' : 'Registrati' }}
        </button>
      </form>

      <div class="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
        Hai già un account? <NuxtLink to="/auth/login" class="font-medium text-blue-600 hover:underline dark:text-sky-400">Accedi</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const form = reactive({
  fullName: '',
  username: '',
  email: '',
  password: ''
})

const authUser = useAuthUser()
const loading = ref(false)
const errorMessage = ref('')

type RegisterResponse = {
  ok: boolean
  user: {
    id: number
    username: string
    email: string
    avatar_dir: string
    role: 'user' | 'unconfirmed' | 'artist' | 'manager' | 'admin' | 'editor' | 'suspended' | 'banned'
    email_verified_at?: string | null
    two_factor_method?: 'none' | 'email' | 'totp'
    totp_enabled_at?: string | null
    suspended_until?: string | null
  }
}

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      body: {
        fullName: form.fullName,
        username: form.username,
        email: form.email,
        password: form.password
      }
    })

    authUser.value = response.user
    await navigateTo('/profile/settings')
  } catch (err: unknown) {
    const message = getErrorMessage(err)
    errorMessage.value = message
  } finally {
    loading.value = false
  }
}

type FetchError = {
  data?: {
    statusMessage?: string
  }
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error
  ) {
    const fetchError = error as FetchError
    if (typeof fetchError.data?.statusMessage === 'string') {
      return fetchError.data.statusMessage
    }
  }
  return 'Registrazione non riuscita'
}
</script>
