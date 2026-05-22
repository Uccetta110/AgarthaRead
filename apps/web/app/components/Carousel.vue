<template>
  <div class="relative max-w-full">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100" v-if="title">{{ title }}</h2>
      <slot name="actions" />
    </div>
    <div class="mt-3 relative">
      <button v-if="showPrev" @click="scrollPrev" class="absolute left-0 top-1/2 z-20 flex items-center justify-center rounded-full bg-white/80 p-1 text-slate-700 shadow hover:bg-white dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800" aria-label="Prev">
        ‹
      </button>
      <button v-if="showNext" @click="scrollNext" class="absolute right-0 top-1/2 z-20 flex items-center justify-center rounded-full bg-white/80 p-1 text-slate-700 shadow hover:bg-white dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800" aria-label="Next">
        ›
      </button>

      <div
        ref="scroller"
        class="w-full box-border overflow-x-auto no-scrollbar py-2 px-4 lg:px-6 snap-x snap-mandatory scroll-smooth"
        tabindex="0"
        role="region"
        :aria-label="title ? `${title} carousel` : 'carousel'"
        @keydown="onKeydown"
      >
        <div class="flex space-x-4 carousel-content">
          <slot />
        </div>
      </div>
      <div ref="fakeScrollbar" class="mt-2 h-2 w-full relative">
        <div ref="fakeThumb" class="absolute left-0 top-0 h-2 rounded-full bg-slate-300 transition-transform dark:bg-slate-600"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
// Ensure component has a multi-word name to satisfy ESLint rule `vue/multi-word-component-names`
defineOptions({ name: 'UiCarousel' })

//const props = defineProps({ title: { type: String, default: '' } })
const scroller = ref(null)
const showPrev = ref(false)
const showNext = ref(true)
const fakeScrollbar = ref(null)
const fakeThumb = ref(null)

function updateButtons() {
  const el = scroller.value
  if (!el) return
  showPrev.value = el.scrollLeft > 0
  showNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

function updateFakeScrollbar() {
  const el = scroller.value
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

function onKeydown(e) {
  if (!scroller.value) return
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    scrollPrev()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    scrollNext()
  } else if (e.key === 'Home') {
    scroller.value.scrollLeft = 0
    updateButtons()
  } else if (e.key === 'End') {
    scroller.value.scrollLeft = scroller.value.scrollWidth
    updateButtons()
  }
}

function onWheel(e) {
  const el = scroller.value
  if (!el) return
  // If there is no horizontal overflow, let the page handle the wheel
  if (el.scrollWidth <= el.clientWidth) return
  // Determine dominant delta (vertical vs horizontal)
  let delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX
  if (!delta) return
  // Normalize deltaMode (0=pixels,1=lines,2=pages)
  if (e.deltaMode === 1) delta *= 16
  else if (e.deltaMode === 2) delta *= el.clientHeight
  e.preventDefault()
  // Apply horizontal scroll. Use scrollBy for better browser handling.
  // Multiplier can be tuned if too fast/slow.
  const multiplier = 1
  el.scrollBy({ left: delta * multiplier, behavior: 'auto' })
  requestAnimationFrame(() => { updateButtons(); updateFakeScrollbar(); })
}

onMounted(() => {
  const el = scroller.value
  if (!el) return
  el.addEventListener('scroll', updateButtons, { passive: true })
  el.addEventListener('wheel', onWheel, { passive: false, capture: true })
  updateButtons()
  updateFakeScrollbar()
  window.addEventListener('resize', updateFakeScrollbar)
})

onBeforeUnmount(() => {
  const el = scroller.value
  if (!el) return
  el.removeEventListener('scroll', updateButtons)
  el.removeEventListener('wheel', onWheel, { capture: true })
  window.removeEventListener('resize', updateFakeScrollbar)
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.35); border-radius: 999px; }
.no-scrollbar::-webkit-scrollbar-track { background: transparent; }
.carousel-content > * { scroll-snap-align: start; scroll-snap-stop: normal; flex: 0 0 auto; }
</style>
