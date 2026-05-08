<template>
  <div class="w-40 flex-shrink-0">
    <div class="bg-slate-50 rounded-md overflow-hidden shadow-sm">
      <img v-if="cover" :src="cover" :alt="item.title" class="w-full h-56 object-cover" />
      <div v-else class="w-full h-56 bg-gray-100 flex items-center justify-center text-sm text-gray-500">No image</div>
    </div>
    <h3 class="mt-2 text-sm font-medium text-slate-900 truncate">{{ item.title }}</h3>
    <p class="text-xs text-slate-500 truncate">{{ authors }}</p>
  </div>
</template>

<script setup>
const props = defineProps({ item: { type: Object, required: true } })
import { computed } from 'vue'

const item = props.item
const cover = computed(() => item.cover || item.thumbnail || item.image || item.poster || item.image_url || null)
const authors = computed(() => ((item.authors || []).slice(0, 2).join(', ')))
</script>
