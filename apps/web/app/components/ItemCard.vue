<template>
  <div class="group relative flex-shrink-0 rounded-[var(--radius-md)] border border-line bg-surface/90 p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div class="overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface2">
      <div class="w-full" style="aspect-ratio: 2/3;">
        <img v-if="cover" :src="cover" :alt="item.title" @error="handleImageError"
          class="h-full w-full object-contain bg-surface">
        <div v-else
          class="flex h-full w-full items-center justify-center bg-surface2 text-xs font-medium text-muted">
          No image</div>
      </div>
    </div>

    <h3 class="mt-3 truncate text-sm font-semibold text-ink">{{ item.title }}</h3>
    <p class="truncate text-xs text-muted">{{ authors }}</p>

    <div v-if="likeItemId !== null" class="mt-3">
      <LikeButton :item-id="likeItemId" :initial-liked="item.isLiked" :initial-count="item.likesCount"
        :can-like="item.canLike" />
    </div>

    <div class="mt-2" @click.stop>
      <slot name="actions" />
    </div>

    <div v-if="to" class="mt-3">
      <NuxtLink :to="to"
        class="btn btn-outline px-2 py-1 text-xs">
        Apri
      </NuxtLink>
    </div>

    <SaveToListMenu :item="item" :catalog-type="props.catalogType">
      <template #trigger="{ openSave, savedInLists }">
        <button type="button" title="Salva"
          class="absolute right-2 top-2 z-20 rounded-[var(--radius-md)] bg-surface/90 p-1 shadow-sm ring-1 ring-line backdrop-blur opacity-100 transition-opacity duration-150 md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100"
          @click.stop.prevent="openSave">
          <svg v-if="savedInLists.length === 0" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent"
            viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 3a1 1 0 00-1 1v12l6-3 6 3V4a1 1 0 00-1-1H5z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent-strong" viewBox="0 0 20 20"
            fill="currentColor">
            <path d="M5 3a1 1 0 00-1 1v12l6-3 6 3V4a1 1 0 00-1-1H5z" />
          </svg>
        </button>
      </template>
    </SaveToListMenu>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { handleImageError } from '#shared/utils/image'

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
