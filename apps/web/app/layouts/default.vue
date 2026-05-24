<script setup lang="ts">
const isSidebarOpen = ref(false)
const authUser = useAuthUser()
//const errorMessage = ref('')
const themeManager = useThemePreference()

type SessionResponse = {
  ok: true
  user: {
    id: number
    username: string
    email: string
    avatar_dir: string
    role: 'user' | 'unconfirmed' | 'artist' | 'manager' | 'admin' | 'editor' | 'suspended' | 'banned'
    permissions?: string[]
    suspended_until?: string | null
  }
}

const publicRoutes = ['/auth/login', '/auth/register']
const route = useRoute()
const isPublicRoute = computed(() => publicRoutes.includes(route.path))

const sessionResult = await useFetch<SessionResponse>('/api/auth/me', {
  method: 'POST',
  credentials: 'include'
})

async function loadThemePreference() {
  if (!sessionData.value?.ok) {
    await themeManager.loadThemePreference('light')
    if (import.meta.client) {
      document.documentElement.style.fontSize = '16px'
    }
    return
  }

  try {
    const response = await $fetch<{ ok: true; preferences: { theme: string | null; font_size: number | null } }>('/api/profile/settings', {
      method: 'GET',
      credentials: 'include'
    })

    await themeManager.loadThemePreference(response.preferences?.theme)
    if (import.meta.client) {
      document.documentElement.style.fontSize = `${response.preferences?.font_size ?? 16}px`
    }
  } catch {
    await themeManager.loadThemePreference('light')
    if (import.meta.client) {
      document.documentElement.style.fontSize = '16px'
    }
  }
}

const sessionData = sessionResult?.data

function syncAuthUser() {
  if (sessionData?.value?.ok) {
    authUser.value = sessionData.value.user
  } else {
    authUser.value = null
  }
}

syncAuthUser()

onMounted(() => {
  loadThemePreference()
})

const isAuthenticated = computed(() => !!authUser.value)

async function enforceRouteAccess() {
  if (isPublicRoute.value) {
    if (isAuthenticated.value) {
      await navigateTo('/')
    }
  } else {
    if (!isAuthenticated.value) {
      await navigateTo('/auth/login')
    }
  }
}

await enforceRouteAccess()

watch(sessionData, () => {
  syncAuthUser()
  if (import.meta.client) {
    loadThemePreference()
  }
})

watch([isPublicRoute, isAuthenticated], () => {
  enforceRouteAccess()
})

function openSidebar() {
  isSidebarOpen.value = true
}

function closeSidebar() {
  isSidebarOpen.value = false
}
</script>

<template>
  <div class="min-h-screen overflow-x-hidden bg-slate-100 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
    <AppHeader />

    <div class="flex w-full min-h-screen items-stretch">
      <SideNavBar :is-open="isSidebarOpen" @close="closeSidebar" />

      <main class="flex-1 min-w-0 px-3 py-4 sm:px-4 sm:py-5 lg:px-8 lg:py-8">
        <div class="mb-4 lg:hidden">
          <button
            class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
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