<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { getAvatarUrl, defaultAvatarUrl } from "~/composables/useAvatar";

const authUser = useAuthUser();
const username = computed(() => authUser.value?.username);
const avatarSrc = ref<string>(defaultAvatarUrl);
const avatarDir = computed<string>(() =>
  getAvatarUrl(authUser.value?.avatar_dir),
);
const userId = computed<number | null>(() => authUser.value?.id ?? null);

watch(
  avatarDir,
  (value) => {
    avatarSrc.value = value;
  },
  { immediate: true },
);

function onAvatarError() {
  avatarSrc.value = defaultAvatarUrl;
}

async function logout() {
  await $fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  authUser.value = null;
  await navigateTo("/auth/login");
}
</script>
<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <div class="mt-8 flex flex-col items-center gap-4 px-3 text-slate-900 sm:px-0 dark:text-slate-100">
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
      <button
        type="button"
        class="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        @click="$router.push('/profile/settings')"
      >
        Impostazioni
      </button>
      <button
        type="button"
        class="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        @click="$router.push('/users/' + userId)"
        v-if="userId !== null"
      >
        User
      </button>
      <button
        type="button"
        class="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500"
        @click="logout"
      >
        Logout
      </button>
    </div>
  </div>
</template>
