<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    
  </div>
</template>

<script setup lang="ts">
//prendi il session_token dai cookie
const session_token = useCookie('session_token')

const loading = ref(false)
const errorMessage = ref('')

type SessionResponse = {
  ok: true,
  user: {
    id: number
    username: string
    email: string
  }
}

loading.value = true
errorMessage.value = ''

try {
  const response = await $fetch<SessionResponse>('/api/auth/me', {
    method: 'POST',
    body: {
      session_token: session_token.value
    }
  })
        sessionStorage.setItem('username', response.user.username)
      sessionStorage.setItem('email', response.user.email)
  await navigateTo('/')
} catch (err: any) {
  errorMessage.value =
    err?.data?.statusMessage || 'Login tramite sessione non riuscito'
} finally {
  loading.value = false
}
</script>