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
        class="fixed inset-x-0 top-[var(--app-header-height)] bottom-0 z-40 bg-black/40 backdrop-blur-sm dark:bg-black/60 lg:hidden mobile-overlay"
        @click="closeSidebar"
    />

    <aside
        class="fixed left-0 top-[var(--app-header-height)] z-50 h-[calc(100vh-var(--app-header-height))] w-72 border-r border-line bg-surface px-4 py-6 shadow-elevated transition-transform duration-300 lg:static lg:h-auto lg:self-stretch lg:w-64 lg:top-0 lg:translate-x-0 lg:py-8 lg:shadow-none mobile-sidebar"
        :class="props.isOpen ? 'translate-x-0' : '-translate-x-full'"
        aria-label="Navigazione laterale"
    >
        <div class="mb-6 flex items-center justify-between lg:mb-8">
            <h2 class="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">Catalogo</h2>
            <button
                class="btn btn-ghost lg:hidden"
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
                class="block rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold transition-colors"
                :class="isActive(item.to)
                    ? 'bg-accent/20 text-ink ring-1 ring-accent/30'
                    : 'text-muted hover:bg-surface2 hover:text-ink'"
                @click="closeSidebar"
            >
                {{ item.label }}
            </NuxtLink>
        </nav>
    </aside>
</template>
