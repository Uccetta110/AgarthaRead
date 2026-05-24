<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const authUser = useAuthUser()
const username = computed(() => authUser.value?.username ?? '')

type AvatarItem = {
  name: string
  url: string
}

const avatarModules = import.meta.glob('../../assets/images/avatars/*.{png,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const avatars = Object.entries(avatarModules)
  .map<AvatarItem | null>(([path, url]) => {
    const segments = path.split('/')
    const name = segments.at(-1)
    return name ? { name, url } : null
  })
  .filter((item): item is AvatarItem => item !== null)
  .sort((a, b) => a.name.localeCompare(b.name))

const defaultAvatar = avatars.find((avatar) => avatar.name === 'default.png')?.url ?? avatars[0]?.url ?? ''
const currentAvatarName = computed(() => authUser.value?.avatar_dir ?? 'default.png')
const avatarSrc = computed(() => {
  const selected = avatars.find((avatar) => avatar.name === currentAvatarName.value)
  return selected ? selected.url : defaultAvatar
})

const selectedAvatar = ref<string>(currentAvatarName.value)
const loading = ref(false)
const message = ref<string | null>(null)
const error = ref<string | null>(null)

watch(currentAvatarName, (value) => {
  if (!selectedAvatar.value) {
    selectedAvatar.value = value
  }
})


async function selectAvatar(name: string) {
  selectedAvatar.value = name
  message.value = null
  error.value = null
}

async function updateAvatar() {
  if (!selectedAvatar.value || !authUser.value) {
    return
  }

  loading.value = true
  error.value = null
  message.value = null

  const token = useCookie('session_token').value as string | undefined

  try {
    const body: { username: string; url: string; identifier?: string } = {
      username: authUser.value.username,
      url: selectedAvatar.value,
    }

    if (token && typeof token === 'string') {
      body.identifier = token
    }

    const res = await $fetch('/api/database/avatar', {
      method: 'POST',
      body,
      credentials: 'include',
    })

    if (!res || !(res as any).success) {
      error.value = 'Sessione non trovata o non autorizzata. Effettua il login e riprova.'
      return
    }

    authUser.value = {
      ...authUser.value,
      avatar_dir: selectedAvatar.value,
    }

    message.value = 'Avatar aggiornato con successo.'
  } catch (err) {
    error.value = 'Impossibile aggiornare l\'avatar. Riprova più tardi.'
    console.error(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-4xl px-4 py-8 text-slate-900 dark:text-slate-100">
    <h1 class="mb-4 text-3xl font-semibold">Modifica il tuo avatar</h1>
    <p class="mb-8 text-neutral-600 dark:text-slate-400">Scegli un avatar dalla lista e conferma per aggiornare il tuo profilo.</p>

    <div class="flex flex-col md:flex-row gap-8 mb-8">
      <div class="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <p class="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">Avatar corrente</p>
        <img
          :src="avatarSrc"
          :alt="`Avatar di ${username}`"
          class="w-40 h-40 rounded-full object-cover mx-auto"
        >
        <p class="mt-4 text-center text-lg font-medium">{{ username }}</p>
        <p class="text-center text-sm text-slate-500 dark:text-slate-400">{{ currentAvatarName }}</p>
      </div>

      <div class="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <p class="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">Seleziona un nuovo avatar</p>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            v-for="avatar in avatars"
            :key="avatar.name"
            type="button"
            :class="[
              'rounded-2xl border p-2 transition duration-200 ease-in-out hover:border-slate-500 focus:outline-none dark:hover:border-slate-500',
              avatar.name === selectedAvatar ? 'border-sky-500 bg-sky-50 shadow-sm dark:bg-sky-950/50' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/60',
            ]"
            @click="selectAvatar(avatar.name)"
          >
            <img
              :src="avatar.url"
              :alt="`Avatar ${avatar.name}`"
              class="w-full h-20 object-cover rounded-xl"
            >
          </button>
        </div>

        <div class="mt-6 flex flex-col gap-3">
          <button
            class="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-white shadow hover:bg-sky-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :disabled="loading || !selectedAvatar"
            @click="updateAvatar"
          >
            {{ loading ? 'Aggiornamento...' : 'Aggiorna avatar' }}
          </button>

          <p v-if="message" class="text-sm text-emerald-700 dark:text-emerald-400">{{ message }}</p>
          <p v-if="error" class="text-sm text-rose-700 dark:text-rose-400">{{ error }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
