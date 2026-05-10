<script setup lang="ts">
import { ref } from 'vue'

const scrollEl = ref<HTMLDivElement | null>(null)

function scrollLeft() {
  scrollEl.value?.scrollBy({ left: -window.innerWidth * 0.8, behavior: 'smooth' })
}

function scrollRight() {
  scrollEl.value?.scrollBy({ left: window.innerWidth * 0.8, behavior: 'smooth' })
}
</script>

<template>
  <div class="flex items-center justify-between py-3 px-4 mt-5">
    <div class="text-2xl">
      <slot name="title" />
    </div>
    <div class="flex-1" />
    <slot name="more" />
  </div>

  <div class="relative">
    <div ref="scrollEl" class="overflow-x-auto no-scrollbar">
      <div class="flex gap-2 w-max p-2 px-4">
        <slot />
      </div>
    </div>

    <button
      type="button"
      class="absolute left-0 top-0 bottom-0 bg-black/50 p-3 items-center justify-center opacity-0 hover:opacity-100 transition"
      title="Scroll left"
      @click="scrollLeft"
    >
      <span class="text-white text-3xl">‹</span>
    </button>

    <button
      type="button"
      class="absolute right-0 top-0 bottom-0 bg-black/50 p-3 items-center justify-center opacity-0 hover:opacity-100 transition"
      title="Scroll right"
      @click="scrollRight"
    >
      <span class="text-white text-3xl">›</span>
    </button>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
