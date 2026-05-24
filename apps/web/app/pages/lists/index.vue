<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Le mie liste</h1>

    <form @submit.prevent="createList" class="mt-4 flex flex-col gap-2 sm:flex-row">
      <input v-model="newTitle" placeholder="Nuova lista" class="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500" />
      <button class="rounded bg-sky-600 px-4 py-2 text-white dark:bg-sky-500 dark:text-slate-950">Crea</button>
    </form>

    <div v-if="error" class="mt-2 text-red-600 dark:text-red-300">{{ error }}</div>

    <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      <div v-for="list in lists" :key="list.id" class="rounded border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
        <NuxtLink :to="`/lists/${list.id}`" class="block font-semibold text-sky-700 dark:text-sky-300">{{ list.name }}</NuxtLink>
        <div class="text-sm text-slate-500 dark:text-slate-400">{{ list.itemsCount || 0 }} elementi</div>
        <div class="mt-2 text-xs text-slate-600 dark:text-slate-300">{{ list.description }}</div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const lists = ref([])
const newTitle = ref('')
const error = ref('')

async function load() {
  const res = await $fetch('/api/lists')
  lists.value = res.lists || []
}

async function createList() {
  error.value = ''
  if (!newTitle.value.trim()) return (error.value = 'Titolo richiesto')
  try {
    await $fetch('/api/lists', { method: 'POST', body: { name: newTitle.value } })
    newTitle.value = ''
    await load()
  } catch (e) {
    error.value = e?.data?.message || 'Errore'
  }
}

load()
</script>
