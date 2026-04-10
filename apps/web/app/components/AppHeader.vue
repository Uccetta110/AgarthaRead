<template>
  <header class="bg-gray-800 text-white">
    <div class="grid w-full grid-cols-[1fr_minmax(320px,560px)_1fr] items-center gap-6 px-2 py-4">
      <NuxtLink to="/" class="justify-self-start pl-2 text-2xl font-bold tracking-tight">AgarthaRead</NuxtLink>

      <div class="w-full justify-self-center">
        <label for="header-search" class="sr-only">Cerca</label>
        <input id="header-search" type="text" placeholder="Cerca libri, manga, giornali..." @input="handleInput"
          @keydown="handleKeyDown"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none" />
      </div>

      <nav class="flex justify-self-end items-center gap-4 pr-2">
        <NuxtLink to="/" class="text-sm text-gray-200 hover:text-white">Home</NuxtLink>
        <NuxtLink id="login-link" to="/auth/login" class="text-sm text-gray-200 hover:text-white">Login</NuxtLink>
        <NuxtLink id="register-link" to="/auth/register"
          class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100">
          Sign Up
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
<script setup lang="ts">
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
    window.location.href = `search?q=${encodeURIComponent(query)}`;
  }
}
onMounted(() => {
  if (sessionStorage.getItem('username')) {
    const username = sessionStorage.getItem('username');
    console.log("Username in session:", username);
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    if (loginLink) loginLink.classList.add('hidden');
    if (registerLink) registerLink.classList.add('hidden');
  } else {
    console.log("No username in session");
  }
});
</script>
