<template>
  <header class="sticky top-0 z-50 border-b border-headerBorder bg-header/70 text-ink backdrop-blur-xl transition-colors duration-200">
    <div class="relative flex w-full items-center gap-3 px-3 py-3 sm:px-4 md:px-6 lg:px-8">
      <NuxtLink
        to="/"
        class="font-display text-xl font-semibold tracking-tight text-ink hover:text-accent sm:text-2xl"
      >
        AgarthaRead
      </NuxtLink>

      <div class="search-shell flex-1 flex-col sm:flex-row sm:items-stretch md:absolute md:left-1/2 md:top-1/2 md:w-[min(560px,calc(100%-4rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:flex-row md:justify-center">
        <label for="header-search" class="sr-only">Cerca</label>
        <select
          v-model="searchScope"
          aria-label="Tipo di ricerca"
          class="w-full border-b border-line bg-transparent px-3 py-2 text-sm text-ink focus:outline-none sm:w-auto sm:border-b-0 sm:border-r sm:py-0"
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
          class="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </div>

      <nav class="ml-auto flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
        <button
          type="button"
          class="btn btn-outline text-[11px] uppercase tracking-[0.22em] sm:text-xs"
          :aria-label="themeButtonAriaLabel"
          @click="themeManager.toggleTheme"
        >
          {{ themeButtonLabel }}
        </button>

        <NuxtLink
          v-if="!username"
          id="login-link"
          to="/auth/login"
          class="text-sm text-muted hover:text-ink"
        >
          Login
        </NuxtLink>

        <NuxtLink
          v-if="!username"
          id="register-link"
          to="/auth/register"
          class="btn btn-accent"
        >
          Sign Up
        </NuxtLink>

        <NuxtLink
          v-if="username"
          to="/profile"
          class="hidden text-sm text-muted hover:text-ink sm:inline"
        >
          {{ username }}
        </NuxtLink>

        <img
          v-if="username"
          :src="avatarSrc"
          alt="Avatar"
          width="80"
          height="80"
          @error="onAvatarError"
          @click="$router.push('/profile')"
          class="h-9 w-9 cursor-pointer rounded-full ring-1 ring-line sm:h-10 sm:w-10"
        />
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
const themeButtonLabel = computed(() =>
  themeManager.theme.value === 'dark' ? 'Chiaro' : 'Scuro',
);
const themeButtonAriaLabel = computed(() =>
  themeManager.theme.value === 'dark'
    ? 'Passa al tema chiaro'
    : 'Passa al tema scuro',
);
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
