<template>
  <div class="flex h-screen items-center justify-center">
    <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
      <h2 class="mb-6 text-center text-2xl font-bold">Login</h2>

      <form @submit.prevent="onSubmit">
        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium text-gray-700">
            Email o Username
          </label>
          <input v-model="form.identifier" type="text"
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

const loading = ref(false)
const errorMessage = ref('')

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: form.identifier,
        password: form.password
      }
    })

    await navigateTo('/')
  } catch (err: any) {
    errorMessage.value =
      err?.data?.statusMessage || 'Login non riuscito'
  } finally {
    loading.value = false
  }
}
</script>