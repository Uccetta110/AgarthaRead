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

const navItems: NavItem[] = [
    { label: 'Libri', to: '/books' },
    { label: 'Manga', to: '/mangas' },
    { label: 'Giornali', to: '/newspapers' },
    { label: 'Liste', to: '/lists' }
]

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
        class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        @click="closeSidebar"
    />

    <aside
        class="fixed left-0 top-0 z-50 h-full w-72 border-r border-slate-200 bg-white px-4 py-6 shadow-xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-10 lg:h-[calc(100vh-5rem)] lg:w-64 lg:translate-x-0 lg:rounded-r-2xl lg:py-8 lg:shadow-sm"
        :class="props.isOpen ? 'translate-x-0' : '-translate-x-full'"
        aria-label="Navigazione laterale"
    >
        <div class="mb-6 flex items-center justify-between lg:mb-8">
            <h2 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Catalogo</h2>
            <button
                class="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
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
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'"
                @click="closeSidebar"
            >
                {{ item.label }}
            </NuxtLink>
        </nav>
    </aside>
</template>