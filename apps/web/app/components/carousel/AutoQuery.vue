<script setup lang="ts">
import { computed } from 'vue'
import CarouselBase from './Base.vue'
import ItemCard from '../ItemCard.vue'

const props = defineProps<{ query: { type: string; query?: string; title?: string } }>()

const { data } = useFetch(() => `/api/${props.query.type}/home`, { server: false })

const items = computed(() => {
  const sections = data.value?.sections || []
  if (props.query.query) {
    const found = sections.find((s: any) => String(s.title).toLowerCase().includes(String(props.query.query).toLowerCase()))
    return (found?.items || []).slice(0, 12)
  }
  return sections.flatMap((s: any) => s.items || []).slice(0, 12)
})
</script>

<template>
  <CarouselBase>
    <template #title>
      {{ props.query.title || props.query.query }}
    </template>
    <template #more>
      <NuxtLink :to="`/${props.query.type}/category/${props.query.query}`">{{ $t('Explore more') }}</NuxtLink>
    </template>

    <ItemCard v-for="i of items" :key="i.id" :item="i" class="flex-1 w-40 md:w-60" />
  </CarouselBase>
</template>
