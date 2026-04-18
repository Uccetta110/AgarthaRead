<script setup lang="ts">
import defaultAvatar from '~/assets/images/avatars/default.png'
import { ref, watch, computed } from 'vue'

const authUser = useAuthUser()
const username = computed(() => authUser.value?.username)
const avatarDir = computed<string>(() => {
  const avatar = authUser.value?.avatar_dir
  return avatar ? `/images/avatars/${avatar}` : defaultAvatar
})
const avatarSrc = ref<string>(avatarDir.value)

watch(avatarDir, (value) => {
  avatarSrc.value = value
})

function onAvatarError() {
  avatarSrc.value = defaultAvatar
}
</script>
<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <div class="flex flex-col items-center gap-4 mt-8">
      <!-- Avatar -->
    <img
          :src="avatarSrc"
          alt="Avatar"
          width="80"
          height="80"
          @error="onAvatarError"
          class="rounded-full"
        />
    <!-- Username in grande -->
    <h1 class="text-2xl font-bold">{{ username }}</h1>
    </div>
  </div>
</template>
