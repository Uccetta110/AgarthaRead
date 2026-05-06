<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { getAvatarUrl, defaultAvatarUrl } from '~/composables/useAvatar'

const authUser = useAuthUser()
const username = computed(() => authUser.value?.username)
const avatarSrc = ref<string>(defaultAvatarUrl)
const avatarDir = computed<string>(() => getAvatarUrl(authUser.value?.avatar_dir))

watch(avatarDir, (value) => {
  avatarSrc.value = value
}, { immediate: true })

function onAvatarError() {
  avatarSrc.value = defaultAvatarUrl
}
</script>
<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <div class="flex flex-col items-center gap-4 mt-8">
      <!-- Avatar -->
       <!-- immagine che fa da link a /avatar-->
    <img
          :src="avatarSrc"
          alt="Avatar"
          width="80"
          height="80"
          @error="onAvatarError"
          class="rounded-full"
          @click="$router.push('/profile/avatar')"
        />
    <!-- Username in grande -->
    <h1 class="text-2xl font-bold">{{ username }}</h1>
    </div>
  </div>
</template>
