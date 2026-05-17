<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h1 class="text-2xl font-bold text-slate-900">Le mie liste</h1>

    <form @submit.prevent="createList" class="mt-4 flex gap-2">
      <input v-model="newTitle" placeholder="Nuova lista" class="border rounded px-3 py-2 flex-1" />
      <button class="bg-sky-600 text-white px-4 rounded">Crea</button>
    </form>

    <div v-if="error" class="text-red-600 mt-2">{{ error }}</div>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
      <div v-for="list in lists" :key="list.id" class="p-4 border rounded">
        <NuxtLink :to="`/lists/${list.id}`" class="block font-semibold text-sky-700">{{ list.name }}</NuxtLink>
        <div class="text-sm text-slate-500">{{ list.itemsCount || 0 }} elementi</div>
        <div class="mt-2 text-xs text-slate-600">{{ list.description }}</div>
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
