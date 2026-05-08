<template>
  <div class="relative">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-slate-900" v-if="title">{{ title }}</h2>
      <slot name="actions" />
    </div>
    <div class="mt-3 -mx-2 relative">
      <button v-if="showPrev" @click="scrollPrev" class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-slate-700 rounded-full p-1 shadow" aria-label="Prev">
        ‹
      </button>
      <button v-if="showNext" @click="scrollNext" class="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-slate-700 rounded-full p-1 shadow" aria-label="Next">
        ›
      </button>

      <div ref="scroller" class="overflow-x-auto no-scrollbar py-2 px-6">
        <div class="flex space-x-4">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const props = defineProps({ title: { type: String, default: '' } })
const scroller = ref(null)
const showPrev = ref(false)
const showNext = ref(true)

function updateButtons() {
  const el = scroller.value
  if (!el) return
  showPrev.value = el.scrollLeft > 0
  showNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

function scrollByAmount(amount) {
  const el = scroller.value
  if (!el) return
  el.scrollBy({ left: amount, behavior: 'smooth' })
  // update after a short delay
  setTimeout(updateButtons, 300)
}

function scrollPrev() {
  const el = scroller.value
  if (!el) return
  const amt = Math.floor(el.clientWidth * 0.8)
  scrollByAmount(-amt)
}

function scrollNext() {
  const el = scroller.value
  if (!el) return
  const amt = Math.floor(el.clientWidth * 0.8)
  scrollByAmount(amt)
}

onMounted(() => {
  const el = scroller.value
  if (!el) return
  el.addEventListener('scroll', updateButtons, { passive: true })
  updateButtons()
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
