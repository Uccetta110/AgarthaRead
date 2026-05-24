<script setup lang="ts">
type NavItem = {
    label: string
    to: string
}

const props = withDefaults(defineProps<{
    isOpen?: boolean
}>(), {
    isOpen: false
})

const emit = defineEmits<{
    close: []
}>()

const route = useRoute()
const authUser = useAuthUser()

const moderationCodes = ['AA', 'VU', 'MU', 'EU', 'MI', 'EI', 'EC']

const canOpenModeration = computed(() => {
    if (authUser.value?.role === 'admin') return true
    const permissions = authUser.value?.permissions ?? []
    return moderationCodes.some((code) => permissions.includes(code))
})

const navItems = computed<NavItem[]>(() => {
    const items: NavItem[] = [
        { label: 'Libri', to: '/books' },
        { label: 'Manga', to: '/mangas' },
        { label: 'Giornali', to: '/newspapers' },
        { label: 'Liste', to: '/lists' },
    ]

    if (canOpenModeration.value) {
        items.push({ label: 'Moderazione', to: '/admin' })
    }

    return items
})

function isActive(path: string) {
    return route.path === path || route.path.startsWith(`${path}/`)
}

function closeSidebar() {
    emit('close')
}
</script>

<template>
    <div
        v-if="props.isOpen"
        class="fixed inset-x-0 top-[var(--app-header-height)] bottom-0 z-40 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60 lg:hidden mobile-overlay"
        @click="closeSidebar"
    />

    <aside
        class="fixed left-0 top-[var(--app-header-height)] z-50 h-[calc(100vh-var(--app-header-height))] w-72 border-r border-slate-200 bg-white px-4 py-6 shadow-xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 lg:static lg:h-auto lg:self-stretch lg:w-64 lg:top-0 lg:translate-x-0 lg:py-8 lg:shadow-sm mobile-sidebar"
        :class="props.isOpen ? 'translate-x-0' : '-translate-x-full'"
        aria-label="Navigazione laterale"
    >
        <div class="mb-6 flex items-center justify-between lg:mb-8">
            <h2 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Catalogo</h2>
            <button
                class="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
                type="button"
                aria-label="Chiudi menu"
                @click="closeSidebar"
            >
                ✕
            </button>
        </div>

        <nav class="space-y-2">
            <NuxtLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                class="block rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                :class="isActive(item.to)
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'"
                @click="closeSidebar"
            >
                {{ item.label }}
            </NuxtLink>
        </nav>
    </aside>
</template>
