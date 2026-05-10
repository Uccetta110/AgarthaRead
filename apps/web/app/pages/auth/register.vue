<template>
  <div class="flex h-screen items-center justify-center">
    <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
      <h2 class="mb-6 text-center text-2xl font-bold">Registrazione</h2>
      <form @submit.prevent="onSubmit">
        <div class="mb-4">
          <label for="fullName" class="mb-2 block text-sm font-medium text-gray-700">Nome</label>
          <input
            id="fullName"
            v-model="form.fullName"
            type="text"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Mario Rossi"
            required
          >
        </div>

        <div class="mb-4">
          <label for="username" class="mb-2 block text-sm font-medium text-gray-700">Username</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="mariorossi"
            required
          >
        </div>

        <div class="mb-4">
          <label for="email" class="mb-2 block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="nome@dominio.it"
            required
          >
        </div>

        <div class="mb-6">
          <label for="password" class="mb-2 block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Almeno 8 caratteri"
            required
          >
        </div>

        <p v-if="errorMessage" class="mb-4 text-sm text-red-600">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-60"
        >
          {{ loading ? 'Registrazione...' : 'Registrati' }}
        </button>
      </form>

      <div class="mt-4 text-center text-sm text-slate-600">
        Hai già un account? <NuxtLink to="/auth/login" class="font-medium text-blue-600 hover:underline">Accedi</NuxtLink>
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
    await navigateTo('/')
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
