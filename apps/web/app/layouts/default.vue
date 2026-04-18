<script setup lang="ts">
const isSidebarOpen = ref(false)
const authUser = useAuthUser()
//const errorMessage = ref('')

type SessionResponse = {
  ok: true
  user: {
    id: number
    username: string
    email: string
    avatar_dir: string
  }
}

const publicRoutes = ['/auth/login', '/auth/register']
const route = useRoute()
const isPublicRoute = publicRoutes.includes(route.path)

const { data: sessionData } = await useFetch<SessionResponse>('/api/auth/me', {
  method: 'POST',
  credentials: 'include'
})

const isAuthenticated = !!sessionData.value?.ok

if (sessionData.value?.ok) {
  authUser.value = sessionData.value.user
}

if (isPublicRoute) {
  if (isAuthenticated) {
    await navigateTo('/')
  }
} else {
  if (!isAuthenticated) {
    await navigateTo('/auth/login')
  }
}

function openSidebar() {
  isSidebarOpen.value = true
}

function closeSidebar() {
  isSidebarOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <AppHeader />

    <div class="flex w-full">
      <SideNavBar :is-open="isSidebarOpen" @close="closeSidebar" />

      <main class="w-full px-4 py-5 lg:px-8 lg:py-8">
        <div class="mb-4 lg:hidden">
          <button
            class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            type="button"
            aria-label="Apri menu laterale"
            @click="openSidebar"
          >
            <span aria-hidden="true">☰</span>
            Sezioni
          </button>
        </div>

        <slot />
      </main>
    </div>
  </div>
</template>