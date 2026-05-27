<template>
  <section
    ref="rootEl"
    class="reader-shell"
    tabindex="0"
    @keydown="onKeydown"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <header class="reader-toolbar">
      <div class="reader-toolbar__meta">
        <p class="reader-kicker">Reader</p>
        <h1 class="reader-title">{{ displayTitle }}</h1>
        <p v-if="displayAuthors.length" class="reader-authors">{{ displayAuthors.join(', ') }}</p>
        <p v-if="sourceLabel" class="reader-source">{{ sourceLabel }}</p>
      </div>

      <div class="reader-toolbar__actions" aria-label="Controlli lettura">
        <button type="button" class="reader-chip" @click="decreaseFontSize" :disabled="fontSize <= minFontSize">A-</button>
        <button type="button" class="reader-chip" @click="resetFontSize">Reset</button>
        <button type="button" class="reader-chip" @click="increaseFontSize" :disabled="fontSize >= maxFontSize">A+</button>
      </div>
    </header>

    <div v-if="tocEntries.length" class="reader-index-card">
      <p class="reader-index-label">Indice</p>
      <div class="reader-index-links">
        <button
          v-for="entry in tocEntries"
          :key="entry.title"
          type="button"
          class="reader-index-link"
          @click="jumpToPage(entry.pageIndex)"
        >
          <span>{{ entry.title }}</span>
          <span>Pagina {{ entry.pageIndex + 1 }}</span>
        </button>
      </div>
    </div>

    <div ref="viewportEl" class="reader-viewport" :style="viewportStyle">
      <button type="button" class="reader-nav reader-nav--left" aria-label="Pagina precedente" @click="prevPage" />
      <button type="button" class="reader-nav reader-nav--right" aria-label="Pagina successiva" @click="nextPage" />

      <div class="reader-spread" :class="{ 'reader-spread--wide': twoPageView }">
        <article
          v-for="page in visiblePages"
          :key="page.id"
          class="reader-page"
          :class="[`reader-page--${page.kind}`]"
        >
          <div class="reader-page__frame">
            <div class="reader-page__inner" v-html="page.html" />
          </div>
        </article>

        <article v-if="twoPageView && visiblePages.length === 1" class="reader-page reader-page--blank">
          <div class="reader-page__frame reader-page__frame--blank" />
        </article>
      </div>
    </div>

    <footer class="reader-footer">
      <div class="reader-footer__stats">
        <span>Pagina {{ displayPageNumber }}</span>
        <span v-if="pages.length">/ {{ pages.length }}</span>
        <span v-if="progressLabel">• {{ progressLabel }}</span>
      </div>
      <div class="reader-footer__actions">
        <button type="button" class="reader-chip" @click="prevPage" :disabled="currentPage <= 0">Prev</button>
        <button type="button" class="reader-chip" @click="nextPage" :disabled="currentPage >= pages.length - 1">Next</button>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type ReadingProgress = {
  locator?: string | null
  percentage?: number | string | null
} | null

type ReaderPage = {
  id: string
  kind: 'title' | 'index' | 'content'
  html: string
}

type TocEntry = {
  title: string
  pageIndex: number
}

const props = defineProps({
  content: { type: String, required: true },
  title: { type: String, default: '' },
  authors: { type: Array as () => string[], default: () => [] },
  itemId: { type: Number, default: null },
  saveUrl: { type: String, default: '' },
  languageCode: { type: String, default: 'und' },
  readingProgress: { type: Object as () => ReadingProgress, default: null },
  sourceLabel: { type: String, default: '' },
})

const rootEl = ref<HTMLElement | null>(null)
const viewportEl = ref<HTMLElement | null>(null)
const currentPage = ref(0)
const pages = ref<ReaderPage[]>([])
const tocEntries = ref<TocEntry[]>([])
const displayTitle = ref('')
const displayAuthors = ref<string[]>([])
const progressLabel = ref('')
const fontSize = ref(18)
const minFontSize = 14
const maxFontSize = 26
const touchStartX = ref<number | null>(null)
const touchStartY = ref<number | null>(null)
const saveTimer = ref<number | null>(null)
const saveInFlight = ref(false)
const lastSavedLocator = ref('')
const lastSavedPercentage = ref(-1)
const maxReachedPage = ref(1)
const maxReachedPercentage = ref(0)
const containerWidth = ref(0)
const containerHeight = ref(0)
let resizeObserver: ResizeObserver | null = null
let windowResizeHandler: (() => void) | null = null

const isWideScreen = computed(() => containerWidth.value >= 1100)
const twoPageView = computed(() => isWideScreen.value)
const effectiveFontSize = computed(() => fontSize.value)
const pageGap = computed(() => (twoPageView.value ? 28 : 0))
const pageWidth = computed(() => {
  const width = containerWidth.value || 0
  if (!width) return 0
  if (!twoPageView.value) return Math.max(320, width)
  return Math.max(320, Math.floor((width - pageGap.value) / 2))
})
const pageHeight = computed(() => Math.max(520, containerHeight.value || 0))
const estimatedCharsPerPage = computed(() => {
  const widthFactor = Math.max(32, Math.floor(pageWidth.value / Math.max(12, effectiveFontSize.value) * 1.15))
  const heightFactor = Math.max(24, Math.floor(pageHeight.value / Math.max(14, effectiveFontSize.value * 1.45)))
  return Math.max(1000, Math.floor(widthFactor * heightFactor * 0.42))
})
const visiblePages = computed(() => {
  if (!pages.value.length) return []
  if (!twoPageView.value) return [pages.value[currentPage.value] || pages.value[0]].filter(Boolean)
  return pages.value.slice(currentPage.value, currentPage.value + 2)
})
const pageStep = computed(() => (twoPageView.value ? 2 : 1))
const displayPageNumber = computed(() => Math.min(currentPage.value + 1, pages.value.length || 1))
const viewportStyle = computed(() => ({
  '--reader-font-size': `${effectiveFontSize.value}px`,
  '--reader-line-height': '1.78',
  '--reader-page-width': `${pageWidth.value || 480}px`,
  '--reader-page-height': `${pageHeight.value}px`,
}))

const currentLocator = computed(() => `page:${currentPage.value + 1}`)
const currentPercentage = computed(() => {
  const totalPages = Math.max(1, pages.value.length)
  return Math.max(0, Math.min(100, Math.round(((currentPage.value + 1) / totalPages) * 100)))
})

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function clearSaveTimer() {
  if (saveTimer.value !== null) {
    window.clearTimeout(saveTimer.value)
    saveTimer.value = null
  }
}

async function flushProgressSave() {
  if (!props.saveUrl || !props.itemId) return
  const pageNumberToSave = Math.max(currentPage.value + 1, maxReachedPage.value)
  const percentageToSave = Math.max(currentPercentage.value, maxReachedPercentage.value)
  const locator = `page:${pageNumberToSave}`

  if (
    !locator ||
    (locator === lastSavedLocator.value && percentageToSave <= lastSavedPercentage.value)
  ) return

  saveInFlight.value = true
  try {
    await $fetch(props.saveUrl, {
      method: 'POST',
      credentials: 'include',
      body: {
        itemId: props.itemId,
        locator,
        percentage: percentageToSave,
        languageCode: props.languageCode || 'und'
      }
    })
    lastSavedLocator.value = locator
    lastSavedPercentage.value = percentageToSave
  } catch {
    // Best-effort save only.
  } finally {
    saveInFlight.value = false
  }
}

function scheduleProgressSave() {
  if (!props.saveUrl || !props.itemId || !pages.value.length) return
  clearSaveTimer()
  saveTimer.value = window.setTimeout(() => {
    void flushProgressSave()
  }, 800)
}

function stripGutenbergText(content: string) {
  const preMatch = content.match(/<pre[^>]*>([\s\S]*)<\/pre>/i)
  let text = preMatch ? preMatch[1] : content
  text = text.replace(/<br\s*\/?\s*>/gi, '\n')
  text = text.replace(/&nbsp;/gi, ' ')
  text = text.replace(/\r\n/g, '\n')
  text = text.replace(/\r/g, '\n')

  const startMatch = text.search(/\*\*\*\s*START OF( THE)? PROJECT GUTENBERG EBOOK/i)
  if (startMatch !== -1) {
    const after = text.slice(startMatch)
    const startEnd = after.indexOf('\n')
    if (startEnd !== -1) text = after.slice(startEnd + 1)
  }

  const endMatch = text.search(/\*\*\*\s*END OF( THE)? PROJECT GUTENBERG EBOOK/i)
  if (endMatch !== -1) {
    text = text.slice(0, endMatch)
  }

  return text.trim()
}

function extractMetadata(plainText: string) {
  const lines = plainText.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 50)
  let title = ''
  let author = ''

  for (const line of lines) {
    if (!title && /^Title:\s*/i.test(line)) {
      title = line.replace(/^Title:\s*/i, '').trim()
      continue
    }
    if (!author && /^Author:\s*/i.test(line)) {
      author = line.replace(/^Author:\s*/i, '').trim()
      continue
    }
    if (!title && /^[A-Z0-9 ,;:'"()\-]{4,120}$/.test(line) && /[A-Z]/.test(line)) {
      title = line
    }
  }

  return { title, author }
}

function normalizeHeading(text: string) {
  return text
    .replace(/^\s+|\s+$/g, '')
    .replace(/^\*+\s*/, '')
    .replace(/\s+\*+$/, '')
}

function isPrefaceHeading(text: string) {
  return /^(preface|prefazione|introduzione|foreword|prologo|prefatory note)$/i.test(text)
}

function isChapterHeading(text: string) {
  return /^(chapter|capitolo|book|part|indice|index|appendix|epilogue|prologue)\b/i.test(text) || /^chapter\s+[ivxlcdm0-9]+\b/i.test(text) || /^capitolo\s+[ivxlcdm0-9]+\b/i.test(text)
}

function isHeadingParagraph(text: string) {
  const normalized = normalizeHeading(text)
  if (!normalized) return false
  if (normalized.length > 140) return false
  if (/^\d+$/.test(normalized)) return false
  if (isChapterHeading(normalized) || isPrefaceHeading(normalized)) return true
  if (/^[A-Z0-9 ,;:'"()\-]{4,120}$/.test(normalized) && /[A-Z]/.test(normalized)) return true
  return false
}

function paragraphHtml(text: string) {
  return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`
}

function headingHtml(text: string) {
  return `<h2>${escapeHtml(normalizeHeading(text))}</h2>`
}

function splitLongParagraph(text: string, targetLength: number) {
  if (text.length <= targetLength) return [text]
  const chunks: string[] = []
  let remaining = text.trim()
  while (remaining.length > targetLength) {
    let cut = remaining.lastIndexOf(' ', targetLength)
    if (cut < Math.floor(targetLength * 0.5)) cut = targetLength
    chunks.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }
  if (remaining) chunks.push(remaining)
  return chunks.filter(Boolean)
}

function buildPages() {
  const plain = stripGutenbergText(props.content)
  const metadata = extractMetadata(plain)
  displayTitle.value = props.title?.trim() || metadata.title || 'Reader'
  displayAuthors.value = props.authors.length ? props.authors.filter(Boolean) : metadata.author ? [metadata.author] : []

  const paragraphs = plain
    .split(/\n{2,}/g)
    .map((part) => part.trim())
    .filter(Boolean)

  const contentBlocks: Array<{ kind: 'heading' | 'paragraph'; text: string }> = []
  const chapterEntries: TocEntry[] = []

  for (const paragraph of paragraphs) {
    const normalized = normalizeHeading(paragraph)
    if (isHeadingParagraph(normalized)) {
      contentBlocks.push({ kind: 'heading', text: normalized })
      if (isChapterHeading(normalized)) {
        chapterEntries.push({ title: normalized, pageIndex: 0 })
      }
      continue
    }

    const splitParts = splitLongParagraph(paragraph, Math.max(500, Math.floor(estimatedCharsPerPage.value * 0.72)))
    for (const part of splitParts) {
      contentBlocks.push({ kind: 'paragraph', text: part })
    }
  }

  const contentPages: ReaderPage[] = []
  let currentHtml = ''
  let currentLength = 0
  let currentContentPageIndex = 0
  const chapterMap = new Map<number, number>()
  let currentChapterPointer = 0

  const pushPage = () => {
    if (!currentHtml.trim()) return
    contentPages.push({
      id: `content-${contentPages.length}`,
      kind: 'content',
      html: currentHtml,
    })
    currentHtml = ''
    currentLength = 0
    currentContentPageIndex += 1
  }

  const estimated = estimatedCharsPerPage.value
  for (const block of contentBlocks) {
    const blockHtml = block.kind === 'heading' ? headingHtml(block.text) : paragraphHtml(block.text)
    const blockCost = block.text.length * (block.kind === 'heading' ? 0.6 : 1)

    if (block.kind === 'heading' && currentLength > estimated * 0.65) {
      pushPage()
    }

    if (currentLength + blockCost > estimated && currentHtml.trim()) {
      pushPage()
    }

    if (block.kind === 'heading') {
      chapterMap.set(currentChapterPointer, currentContentPageIndex)
      if (currentChapterPointer < chapterEntries.length) {
        chapterEntries[currentChapterPointer].pageIndex = currentContentPageIndex
        currentChapterPointer += 1
      }
    }

    currentHtml += blockHtml
    currentLength += blockCost
  }

  pushPage()

  const titlePage: ReaderPage = {
    id: 'title-page',
    kind: 'title',
    html: `
      <div class="reader-title-page">
        <p class="reader-page-eyebrow">${escapeHtml(props.sourceLabel || 'Libro')}</p>
        <h2>${escapeHtml(displayTitle.value)}</h2>
        ${displayAuthors.value.length ? `<p class="reader-page-authors">${escapeHtml(displayAuthors.value.join(', '))}</p>` : ''}
        <p class="reader-page-note">Premi Spazio, Invio o le frecce per voltare pagina.</p>
      </div>
    `,
  }

  const indexPage: ReaderPage | null = chapterEntries.length
    ? {
        id: 'index-page',
        kind: 'index',
        html: `
          <div class="reader-index-page">
            <h2>Indice</h2>
            <p>Capitoli trovati nel testo.</p>
            <div class="reader-index-page__list">
              ${chapterEntries
                .map(
                  (entry) => `
                    <button type="button" class="reader-index-page__item" data-page="${entry.pageIndex + 1}">
                      <span>${escapeHtml(entry.title)}</span>
                      <span>Pagina ${entry.pageIndex + 1}</span>
                    </button>
                  `,
                )
                .join('')}
            </div>
          </div>
        `,
      }
    : null

  tocEntries.value = chapterEntries
  pages.value = [titlePage, ...(indexPage ? [indexPage] : []), ...contentPages]
  applyInitialProgress()
  if (progressLabel.value === '') {
    lastSavedLocator.value = ''
  }
}

function normalizeProgressLocator(locator?: string | null) {
  if (!locator) return null
  const value = String(locator).trim().toLowerCase()
  const pageMatch = value.match(/^(page|p):\s*(\d+)$/i)
  if (pageMatch) return { kind: 'page', value: Number(pageMatch[2]) }
  const percentMatch = value.match(/^(percent|progress|perc):\s*(\d+(?:\.\d+)?)$/i)
  if (percentMatch) return { kind: 'percentage', value: Number(percentMatch[2]) }
  return null
}

function applyInitialProgress() {
  const progress = props.readingProgress
  if (!progress) {
    currentPage.value = 0
    maxReachedPage.value = 1
    maxReachedPercentage.value = currentPercentage.value
    return
  }

  const locator = normalizeProgressLocator(progress.locator || null)
  if (locator?.kind === 'page') {
    currentPage.value = clampPageIndex(locator.value)
    maxReachedPage.value = Math.max(1, currentPage.value + 1)
    const incomingPercentage = Number(progress.percentage ?? 0)
    maxReachedPercentage.value = Number.isFinite(incomingPercentage)
      ? Math.max(0, Math.min(100, incomingPercentage), currentPercentage.value)
      : currentPercentage.value
    return
  }

  const percentage = Number(progress.percentage ?? 0)
  if (Number.isFinite(percentage) && pages.value.length > 1) {
    currentPage.value = clampPageIndex(Math.round((percentage / 100) * (pages.value.length - 1)))
    maxReachedPage.value = Math.max(1, currentPage.value + 1)
    maxReachedPercentage.value = Math.max(0, Math.min(100, percentage), currentPercentage.value)
    return
  }

  currentPage.value = 0
  maxReachedPage.value = 1
  maxReachedPercentage.value = currentPercentage.value
}

function clampPageIndex(pageIndex: number) {
  if (!pages.value.length) return 0
  return Math.max(0, Math.min(pageIndex, pages.value.length - 1))
}

function jumpToPage(pageIndex: number) {
  currentPage.value = clampPageIndex(pageIndex)
  nextTick(() => rootEl.value?.focus())
}

function nextPage() {
  currentPage.value = clampPageIndex(currentPage.value + pageStep.value)
}

function prevPage() {
  currentPage.value = clampPageIndex(currentPage.value - pageStep.value)
}

function goToEdge(direction: 'start' | 'end') {
  currentPage.value = direction === 'start' ? 0 : clampPageIndex(pages.value.length - 1)
}

function increaseFontSize() {
  fontSize.value = Math.min(maxFontSize, fontSize.value + 1)
}

function decreaseFontSize() {
  fontSize.value = Math.max(minFontSize, fontSize.value - 1)
}

function resetFontSize() {
  fontSize.value = 18
}

function onKeydown(event: KeyboardEvent) {
  const key = event.key
  if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Spacebar' || key === 'Enter') {
    event.preventDefault()
    nextPage()
    return
  }
  if (key === 'ArrowLeft' || key === 'PageUp' || key === 'Backspace') {
    event.preventDefault()
    prevPage()
    return
  }
  if (key === 'Home') {
    event.preventDefault()
    goToEdge('start')
    return
  }
  if (key === 'End') {
    event.preventDefault()
    goToEdge('end')
  }
}

function onTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
}

function onTouchEnd(event: TouchEvent) {
  const touch = event.changedTouches[0]
  if (!touch || touchStartX.value === null || touchStartY.value === null) return
  const deltaX = touch.clientX - touchStartX.value
  const deltaY = Math.abs(touch.clientY - touchStartY.value)
  if (Math.abs(deltaX) > 50 && deltaY < 80) {
    if (deltaX < 0) nextPage()
    else prevPage()
  }
  touchStartX.value = null
  touchStartY.value = null
}

function updateLayoutMetrics() {
  const hostEl = rootEl.value
  if (!hostEl) return

  const hostRect = hostEl.getBoundingClientRect()
  containerWidth.value = Math.max(0, Math.floor(hostRect.width))

  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : Math.floor(hostRect.height)
  const desiredReaderHeight = Math.floor(viewportHeight * 0.72)
  containerHeight.value = Math.max(520, Math.min(980, desiredReaderHeight))
}

onMounted(async () => {
  updateLayoutMetrics()
  if (rootEl.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateLayoutMetrics()
    })
    resizeObserver.observe(rootEl.value)
  }
  if (typeof window !== 'undefined') {
    windowResizeHandler = () => updateLayoutMetrics()
    window.addEventListener('resize', windowResizeHandler, { passive: true })
  }
  await nextTick()
  buildPages()
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (windowResizeHandler && typeof window !== 'undefined') {
    window.removeEventListener('resize', windowResizeHandler)
    windowResizeHandler = null
  }
  void flushProgressSave()
})

watch(
  () => [props.content, props.title, props.authors.join('|'), props.sourceLabel],
  async () => {
    await nextTick()
    buildPages()
  },
)

watch(
  () => [containerWidth.value, containerHeight.value, fontSize.value],
  async () => {
    if (!pages.value.length) return
    const currentProgress = progressLabel.value
    await nextTick()
    buildPages()
    progressLabel.value = currentProgress
  },
)

watch(
  () => currentPage.value,
  () => {
    if (!pages.value.length) return
    maxReachedPage.value = Math.max(maxReachedPage.value, currentPage.value + 1)
    maxReachedPercentage.value = Math.max(maxReachedPercentage.value, currentPercentage.value)
    scheduleProgressSave()
  },
)

watch(
  () => pages.value.length,
  () => {
    if (currentPage.value >= pages.value.length) {
      currentPage.value = clampPageIndex(currentPage.value)
    }
  },
)

watch(
  () => currentPage.value,
  () => {
    if (!pages.value.length) return
    const total = pages.value.length
    progressLabel.value = `${Math.round(((currentPage.value + 1) / total) * 100)}% letto`
  },
  { immediate: true },
)

watch(
  () => [props.saveUrl, props.itemId],
  () => {
    lastSavedLocator.value = ''
    lastSavedPercentage.value = -1
    maxReachedPage.value = Math.max(1, currentPage.value + 1)
    maxReachedPercentage.value = currentPercentage.value
  },
)
</script>

<style scoped>
.reader-shell {
  --reader-ink: rgb(15 23 42);
  --reader-paper: rgb(250 248 244);
  --reader-paper-deep: rgb(245 240 232);
  --reader-border: rgb(226 232 240);
  --reader-shadow: 0 22px 70px rgba(15, 23, 42, 0.12);
  color: var(--reader-ink);
  outline: none;
}

.reader-toolbar,
.reader-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.reader-toolbar {
  margin-bottom: 1rem;
}

.reader-toolbar__meta {
  min-width: 0;
}

.reader-kicker,
.reader-index-label,
.reader-source,
.reader-page-eyebrow {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.reader-title {
  margin: 0.1rem 0 0;
  font-size: clamp(1.5rem, 2vw, 2.2rem);
  line-height: 1.05;
  font-weight: 800;
}

.reader-authors {
  margin: 0.5rem 0 0;
  color: rgb(71 85 105);
}

.reader-toolbar__actions,
.reader-footer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.reader-chip {
  border: 1px solid var(--reader-border);
  background: white;
  color: var(--reader-ink);
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.reader-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.reader-index-card {
  border: 1px solid var(--reader-border);
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.88);
  padding: 1rem;
  margin-bottom: 1rem;
}

.reader-index-links {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

.reader-index-link,
.reader-index-page__item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  border: 1px solid var(--reader-border);
  border-radius: 1rem;
  background: white;
  padding: 0.85rem 1rem;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.reader-viewport {
  position: relative;
  min-height: var(--reader-page-height);
  border-radius: 2rem;
  border: 1px solid var(--reader-border);
  background: linear-gradient(135deg, var(--reader-paper), var(--reader-paper-deep));
  box-shadow: var(--reader-shadow);
  overflow: hidden;
  padding: 1rem;
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.reader-spread {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.reader-spread--wide {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.reader-page {
  min-height: calc(var(--reader-page-height) - 2rem);
}

.reader-page__frame {
  height: 100%;
  min-height: calc(var(--reader-page-height) - 2rem);
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.35);
  padding: 2rem 1.7rem;
  overflow: hidden;
}

.reader-page__frame--blank {
  background: transparent;
  border-style: dashed;
}

.reader-page__inner {
  font-size: var(--reader-font-size);
  line-height: var(--reader-line-height);
  color: rgb(30 41 59);
  height: 100%;
  overflow: hidden;
}

.reader-page__inner :deep(h2) {
  margin: 0 0 1rem;
  font-size: 1.15em;
  line-height: 1.15;
}

.reader-page__inner :deep(p) {
  margin: 0 0 1em;
}

.reader-page__inner :deep(pre) {
  margin: 0 0 1em;
  white-space: pre-wrap;
  font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
}

.reader-title-page,
.reader-index-page {
  max-width: 42rem;
  margin: 0 auto;
  padding-top: 4rem;
}

.reader-title-page h2,
.reader-index-page h2 {
  margin: 0.5rem 0 0;
  font-size: clamp(2rem, 4vw, 3.8rem);
  line-height: 0.95;
}

.reader-page-authors,
.reader-page-note {
  font-size: 1rem;
  line-height: 1.7;
  color: rgb(71 85 105);
}

.reader-page-note {
  margin-top: 2rem;
}

.reader-index-page p {
  color: rgb(71 85 105);
}

.reader-index-page__list {
  display: grid;
  gap: 0.65rem;
  margin-top: 1rem;
}

.reader-footer {
  margin-top: 1rem;
  color: rgb(71 85 105);
}

.reader-footer__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
}

.reader-nav {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 22%;
  border: 0;
  background: transparent;
  z-index: 2;
  cursor: pointer;
}

.reader-nav--left {
  left: 0;
}

.reader-nav--right {
  right: 0;
}

@media (max-width: 767px) {
  .reader-toolbar,
  .reader-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .reader-viewport {
    padding: 0.75rem;
  }

  .reader-page__frame {
    padding: 1.35rem 1.15rem;
  }

  .reader-nav {
    width: 32%;
  }
}
</style>
