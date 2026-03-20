<template>
  <div class="flex h-screen items-center justify-center">
    <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
      <h2 class="mb-6 text-center text-2xl font-bold">Login</h2>

      <form @submit.prevent="onSubmit">
        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium text-gray-700">
            Accedi con
            <button type="button" class="mx-1 underline-offset-2 hover:underline" :class="accessMode === 'email' ? 'text-blue-600 underline' : 'text-gray-700'" @click="setAccessMode('email')">
              Email
            </button>
            o
            <button type="button" class="mx-1 underline-offset-2 hover:underline" :class="accessMode === 'username' ? 'text-blue-600 underline' : 'text-gray-700'" @click="setAccessMode('username')">
              Username
            </button>
          </label>
          <input v-model="form.identifier" :type="accessMode === 'email' ? 'email' : 'text'"
            :placeholder="accessMode === 'email' ? 'nome@dominio.it' : 'Il tuo username'"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none" required />
        </div>

        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input v-model="form.password" type="password"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none" required />
        </div>

        <p v-if="errorMessage" class="mb-4 text-sm text-red-600">
          {{ errorMessage }}
        </p>

        <button type="submit" :disabled="loading"
          class="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-60">
          {{ loading ? 'Accesso...' : 'Login' }}
        </button>
      </form>
    </div>
  </div>
</template>
<script setup lang="ts">
const form = reactive({
  identifier: '',
  password: ''
})

type LoginResponse = {
  ok: boolean
  user: {
    id: number
    username: string
    email: string
  }
}

const loading = ref(false)
const errorMessage = ref('')
const accessMode = ref<'email' | 'username'>('email')

function setAccessMode(mode: 'email' | 'username') {
  accessMode.value = mode
}

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: form.identifier,
        password: form.password,
        type: accessMode.value
      }
    })

    if (import.meta.client) {
      //sessionStorage.setItem('user', JSON.stringify(response.user))
      sessionStorage.setItem('username', response.user.username)
      sessionStorage.setItem('email', response.user.email)
    }

    await navigateTo('/')
  } catch (err: any) {
    errorMessage.value =
      err?.data?.statusMessage || 'Login non riuscito'
  } finally {
    loading.value = false
  }
}
</script>