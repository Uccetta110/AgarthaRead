<template>
  <div class="group flex-shrink-0 relative">
    <div class="overflow-hidden rounded-md bg-slate-50 shadow-sm dark:bg-slate-900/80">
      <div class="w-full" style="aspect-ratio: 2/3;">
        <img v-if="cover" :src="cover" :alt="item.title" class="h-full w-full object-contain bg-white dark:bg-slate-950">
        <div v-else class="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">No image</div>
      </div>
    </div>

    <h3 class="mt-2 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{{ item.title }}</h3>
    <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ authors }}</p>

    <div v-if="likeItemId !== null" class="mt-2">
      <LikeButton
        :item-id="likeItemId"
        :initial-liked="item.isLiked"
        :initial-count="item.likesCount"
        :can-like="item.canLike"
      />
    </div>

    <div class="mt-2" @click.stop>
      <slot name="actions" />
    </div>

    <div v-if="to" class="mt-2">
      <NuxtLink :to="to" class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
        Apri
      </NuxtLink>
    </div>

    <SaveToListMenu :item="item" :catalog-type="props.catalogType">
      <template #trigger="{ openSave, savedInLists }">
        <button
          type="button"
          title="Salva"
          class="absolute right-2 top-2 z-20 rounded-full bg-white p-1 shadow opacity-100 transition-opacity duration-150 dark:bg-slate-100 md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100"
          @click.stop.prevent="openSave"
        >
          <svg v-if="savedInLists.length === 0" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-sky-600" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a1 1 0 00-1 1v12l6-3 6 3V4a1 1 0 00-1-1H5z"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a1 1 0 00-1 1v12l6-3 6 3V4a1 1 0 00-1-1H5z"/></svg>
        </button>
      </template>
    </SaveToListMenu>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  item: { type: Object, required: true },
  catalogType: { type: String, required: false, default: '' },
  to: { type: [String, Object], required: false, default: null }
})

const item = props.item
const cover = computed(() => item.cover || item.thumbnail || item.image || item.poster || item.image_url || null)
const authors = computed(() => ((item.authors || []).slice(0, 2).join(', ')))
const likeItemId = computed(() => {
  const parsedId = Number(item.internalId)
  return Number.isFinite(parsedId) ? parsedId : null
})
</script>
