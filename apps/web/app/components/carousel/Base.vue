<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const scrollEl = ref<HTMLDivElement | null>(null)
const fakeScrollbar = ref<HTMLDivElement | null>(null)
const fakeThumb = ref<HTMLDivElement | null>(null)

function scrollLeft() {
  scrollEl.value?.scrollBy({ left: -window.innerWidth * 0.8, behavior: 'smooth' })
}

function scrollRight() {
  scrollEl.value?.scrollBy({ left: window.innerWidth * 0.8, behavior: 'smooth' })
}

function updateFakeScrollbar() {
  const el = scrollEl.value
  const thumb = fakeThumb.value
  if (!el || !thumb) return
  const trackWidth = el.clientWidth
  if (el.scrollWidth <= el.clientWidth) {
    thumb.style.width = `${trackWidth}px`
    thumb.style.transform = `translateX(0px)`
    return
  }
  const visibleRatio = el.clientWidth / el.scrollWidth
  const minThumb = 20
  const thumbWidth = Math.max(minThumb, Math.floor(visibleRatio * trackWidth))
  const maxThumbLeft = trackWidth - thumbWidth
  const left = Math.floor((el.scrollLeft / (el.scrollWidth - el.clientWidth)) * maxThumbLeft)
  thumb.style.width = `${thumbWidth}px`
  thumb.style.transform = `translateX(${left}px)`
}

function onWheel(e: WheelEvent) {
  const el = scrollEl.value
  if (!el) return
  if (el.scrollWidth <= el.clientWidth) return
  let delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX
  if (!delta) return
  if (e.deltaMode === 1) delta *= 16
  else if (e.deltaMode === 2) delta *= el.clientHeight
  e.preventDefault()
  const multiplier = 1
  el.scrollBy({ left: delta * multiplier, behavior: 'auto' })
  requestAnimationFrame(updateFakeScrollbar)
}

onMounted(() => {
  const el = scrollEl.value
  if (!el) return
  el.addEventListener('scroll', updateFakeScrollbar, { passive: true })
  el.addEventListener('wheel', onWheel, { passive: false, capture: true })
  updateFakeScrollbar()
  window.addEventListener('resize', updateFakeScrollbar)
})

onBeforeUnmount(() => {
  const el = scrollEl.value
  if (!el) return
  el.removeEventListener('scroll', updateFakeScrollbar)
  el.removeEventListener('wheel', onWheel, { capture: true })
  window.removeEventListener('resize', updateFakeScrollbar)
})
</script>

<template>
  <div class="mt-6 flex items-center justify-between px-4 py-3">
    <div class="font-display text-xl font-semibold text-ink">
      <slot name="title" />
    </div>
    <div class="flex-1" />
    <div class="text-sm text-muted">
      <slot name="more" />
    </div>
  </div>

  <div class="relative">
    <div ref="scrollEl" class="w-full box-border overflow-x-auto no-scrollbar px-4 py-3 snap-x snap-mandatory scroll-smooth">
      <div class="flex gap-3 w-max carousel-items">
        <slot />
      </div>
    </div>

    <div ref="fakeScrollbar" class="relative mt-3 h-1.5 w-full">
      <div ref="fakeThumb" class="absolute left-0 top-0 h-1.5 rounded-[var(--radius-md)] bg-accent/40 transition-transform"></div>
    </div>

    <button
      type="button"
      class="absolute left-0 top-0 bottom-0 z-20 flex items-center justify-center bg-ink/25 px-3 opacity-0 backdrop-blur-sm transition hover:opacity-100 focus-visible:opacity-100"
      title="Scroll left"
      @click="scrollLeft"
    >
      <span class="text-2xl text-white">‹</span>
    </button>

    <button
      type="button"
      class="absolute right-0 top-0 bottom-0 z-20 flex items-center justify-center bg-ink/25 px-3 opacity-0 backdrop-blur-sm transition hover:opacity-100 focus-visible:opacity-100"
      title="Scroll right"
      @click="scrollRight"
    >
      <span class="text-2xl text-white">›</span>
    </button>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.35); border-radius: 999px; }
.no-scrollbar::-webkit-scrollbar-track { background: transparent; }
.carousel-items > * { scroll-snap-align: start; scroll-snap-stop: normal; flex: 0 0 auto; }
</style>
