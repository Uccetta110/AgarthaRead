<template>
  <div class="flex h-screen items-center justify-center">
    <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
      <h2 class="mb-6 text-center text-2xl font-bold">
        {{ step === 'credentials' ? 'Login' : 'Verifica 2FA' }}
      </h2>

      <form v-if="step === 'credentials'" @submit.prevent="onSubmit">
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

      <form v-else @submit.prevent="onVerifyOtp">
        <p class="mb-4 text-sm text-slate-600">
          {{ twoFactorMethod === 'email'
            ? 'Inserisci il codice ricevuto via email.'
            : 'Inserisci il codice della tua app di autenticazione.' }}
        </p>

        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium text-gray-700">
            Codice 2FA
          </label>
          <input v-model="otpCode" inputmode="numeric" autocomplete="one-time-code"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none" required />
        </div>

        <p v-if="errorMessage" class="mb-4 text-sm text-red-600">
          {{ errorMessage }}
        </p>

        <button type="submit" :disabled="loading"
          class="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-60">
          {{ loading ? 'Verifica...' : 'Conferma' }}
        </button>

        <button type="button" class="mt-3 w-full rounded border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-50" @click="resetLogin">
          Torna al login
        </button>
      </form>

      <div v-if="step === 'credentials'" class="mt-4 text-center text-sm text-slate-600">
        Non hai un account? <NuxtLink to="/auth/register" class="font-medium text-blue-600 hover:underline">Registrati</NuxtLink>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
const form = reactive({
  identifier: '',
  password: ''
})

type LoginSuccessResponse = {
  ok: true
  user: {
    id: number
    username: string
    email: string
    avatar_dir: string
    email_verified_at?: string | null
    two_factor_method?: 'none' | 'email' | 'totp'
    totp_enabled_at?: string | null
  }
}

type LoginRequires2faResponse = {
  ok: false
  requires2fa: true
  method: 'email' | 'totp'
  challengeToken: string
}

type LoginResponse = LoginSuccessResponse | LoginRequires2faResponse

const authUser = useAuthUser()
const loading = ref(false)
const errorMessage = ref('')
const accessMode = ref<'email' | 'username'>('email')
const step = ref<'credentials' | 'otp'>('credentials')
const twoFactorMethod = ref<'email' | 'totp' | null>(null)
const challengeToken = ref('')
const otpCode = ref('')

function setAccessMode(mode: 'email' | 'username') {
  accessMode.value = mode
}

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      body: {
        identifier: form.identifier,
        password: form.password
      }
    })

    if (response.ok) {
      authUser.value = response.user
      await navigateTo('/')
    } else if (response.requires2fa) {
      step.value = 'otp'
      twoFactorMethod.value = response.method
      challengeToken.value = response.challengeToken
      otpCode.value = ''
    }
  } catch (err: any) {
    errorMessage.value =
      err?.data?.statusMessage || 'Login non riuscito'
      console.error('Login error:', err)
  } finally {
    loading.value = false
  }
}

async function onVerifyOtp() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<LoginSuccessResponse>('/api/auth/login/verify', {
      method: 'POST',
      credentials: 'include',
      body: {
        challengeToken: challengeToken.value,
        code: otpCode.value
      }
    })

    authUser.value = response.user
    await navigateTo('/')
  } catch (err: any) {
    errorMessage.value =
      err?.data?.statusMessage || 'Codice non valido'
    console.error('Login OTP error:', err)
  } finally {
    loading.value = false
  }
}

function resetLogin() {
  step.value = 'credentials'
  twoFactorMethod.value = null
  challengeToken.value = ''
  otpCode.value = ''
  errorMessage.value = ''
}
</script>