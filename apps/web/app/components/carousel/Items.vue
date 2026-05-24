<script setup lang="ts">
import type { PropType } from 'vue'
import CarouselBase from './Base.vue'
import ItemCard from '../ItemCard.vue'

const props = defineProps({
  type: { type: String as PropType<string>, required: false },
  items: { type: Array as PropType<any[]>, default: () => [] }
})

const itemRoute = (item: any) => {
  const typePath = props.type || item.type || 'books'
  const itemId = item.id ?? item.key ?? item.title ?? ''
  return `/${typePath}/${encodeURIComponent(String(itemId))}`
}
</script>

<template>
  <CarouselBase>
    <template #title>
      <slot name="title" />
    </template>
    <template #more>
      <slot name="more" />
    </template>

    <ItemCard
      v-for="item of items"
      :key="item.id ?? item.key ?? item.title"
      :item="item"
      :to="itemRoute(item)"
      class="block w-40 flex-shrink-0 sm:w-48 md:w-56 lg:w-64"
    />
  </CarouselBase>
</template>
