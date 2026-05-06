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
  as: 'url',
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

const sessionToken = useCookie('session_token').value

async function selectAvatar(name: string) {
  selectedAvatar.value = name
  message.value = null
  error.value = null
}

async function updateAvatar() {
  if (!selectedAvatar.value || !authUser.value) {
    return
  }

  if (!sessionToken || typeof sessionToken !== 'string') {
    error.value = 'Sessione non trovata. Effettua il login e riprova.'
    return
  }

  loading.value = true
  error.value = null
  message.value = null

  try {
    await $fetch('/api/database/avatar', {
      method: 'POST',
      body: {
        identifier: sessionToken,
        username: authUser.value.username,
        url: selectedAvatar.value,
      },
    })

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
  <section class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-semibold mb-4">Modifica il tuo avatar</h1>
    <p class="text-neutral-600 mb-8">Scegli un avatar dalla lista e conferma per aggiornare il tuo profilo.</p>

    <div class="flex flex-col md:flex-row gap-8 mb-8">
      <div class="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <p class="text-sm font-medium text-slate-500 mb-4">Avatar corrente</p>
        <img
          :src="avatarSrc"
          :alt="`Avatar di ${username}`"
          class="w-40 h-40 rounded-full object-cover mx-auto"
        >
        <p class="text-center mt-4 text-lg font-medium">{{ username }}</p>
        <p class="text-center text-sm text-slate-500">{{ currentAvatarName }}</p>
      </div>

      <div class="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium text-slate-500 mb-4">Seleziona un nuovo avatar</p>
        <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <button
            v-for="avatar in avatars"
            :key="avatar.name"
            type="button"
            :class="[
              'rounded-2xl border p-2 transition duration-200 ease-in-out hover:border-slate-500 focus:outline-none',
              avatar.name === selectedAvatar ? 'border-sky-500 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white',
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
            class="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-white shadow hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :disabled="loading || !selectedAvatar"
            @click="updateAvatar"
          >
            {{ loading ? 'Aggiornamento...' : 'Aggiorna avatar' }}
          </button>

          <p v-if="message" class="text-sm text-emerald-700">{{ message }}</p>
          <p v-if="error" class="text-sm text-rose-700">{{ error }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
