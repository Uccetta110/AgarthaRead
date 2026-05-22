<template>
  <header class="border-b border-transparent bg-white text-slate-900 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <div
      class="grid w-full grid-cols-[1fr_minmax(320px,560px)_1fr] items-center gap-6 px-2 py-4"
    >
      <NuxtLink
        to="/"
        class="justify-self-start pl-2 text-2xl font-bold tracking-tight"
        >AgarthaRead</NuxtLink
      >

      <div class="w-full justify-self-center">
        <label for="header-search" class="sr-only">Cerca</label>
        <div class="flex w-full items-stretch">
          <select
            v-model="searchScope"
            aria-label="Tipo di ricerca"
            class="rounded-l-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="books">Libri</option>
            <option value="manga">Manga</option>
            <option value="news">News</option>
          </select>
          <input
            id="header-search"
            type="text"
            placeholder="Cerca libri, manga, giornali..."
            @input="handleInput"
            @keydown="handleKeyDown"
            class="w-full rounded-r-md border border-l-0 border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        </div>
      </div>

      <nav class="flex justify-self-end items-center gap-4 pr-2">
        <button
          type="button"
          class="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          :aria-label="themeManager.isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'"
          @click="themeManager.toggleTheme"
        >
          {{ themeManager.isDark ? 'Chiaro' : 'Scuro' }}
        </button>

        <!-- Avatar -->
        <img
          v-if="username"
          :src="avatarSrc"
          alt="Avatar"
          width="80"
          height="80"
          @error="onAvatarError"
          @click="$router.push('/profile')"
          class="rounded-full"
        />
        <!-- UserName-->
        <NuxtLink
          to="/profile"
          v-if="username"
          class="text-sm text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white"
        >
          {{ username }}
        </NuxtLink>

        <NuxtLink to="/" class="text-sm text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white"
          >Home</NuxtLink
        >
        <NuxtLink
          v-if="!username"
          id="login-link"
          to="/auth/login"
          class="text-sm text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white"
          >Login</NuxtLink
        >
        <NuxtLink
          v-if="!username"
          id="register-link"
          to="/auth/register"
          class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Sign Up
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { getAvatarUrl, defaultAvatarUrl } from "~/composables/useAvatar";

const route = useRoute();
const authUser = useAuthUser();
const themeManager = useThemePreference();
const username = computed(() => authUser.value?.username);
const avatarSrc = ref<string>(defaultAvatarUrl);
const searchScope = ref("books");
const avatarDir = computed<string>(() =>
  getAvatarUrl(authUser.value?.avatar_dir),
);

function updateSearchScopeFromRoute() {
  if (route.path.startsWith("/books")) {
    searchScope.value = "books";
  } else if (route.path.startsWith("/mangas")) {
    searchScope.value = "manga";
  } else if (
    route.path.startsWith("/newspapers") ||
    route.path.startsWith("/news")
  ) {
    searchScope.value = "news";
  } else if (route.path.startsWith("/search")) {
    const type = String(route.query.type || "").toLowerCase();
    if (["books", "manga", "news"].includes(type)) {
      searchScope.value = type as "books" | "manga" | "news";
    }
  }
}

watch(route, updateSearchScopeFromRoute, { immediate: true, deep: true });
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

function sanitizeInput(input: string): string {
  // Rimuove caratteri speciali indesiderati, ma consente lettere, numeri, spazi e accenti
  return input.replace(/[^a-zA-Z0-9òèàùì',.~\s]/g, "");
}

function handleInput(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input) return;
  const oldValue = input.value;
  const sanitized = sanitizeInput(oldValue);
  if (sanitized !== oldValue) {
    const caret = input.selectionStart ?? sanitized.length;
    input.value = sanitized;
    const newPos = Math.min(caret, sanitized.length);
    try {
      input.setSelectionRange(newPos, newPos);
    } catch (error) {
      console.error("Error setting caret position:", error);
    }
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key !== "Enter") return;
  const input = event.target as HTMLInputElement;
  if (!input) return;
  const query = sanitizeInput(input.value).trim();
  if (query) {
    window.location.href = `/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(searchScope.value)}`;
  }
}
onMounted(() => {
  const header = document.querySelector("header") as HTMLElement | null;
  if (header) {
    document.documentElement.style.setProperty(
      "--app-header-height",
      `${header.offsetHeight}px`,
    );
  }
});
</script>
