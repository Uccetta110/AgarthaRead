<script setup lang="ts">
import { PropType } from 'vue'
import CarouselBase from './Base.vue'
import ItemCard from '../ItemCard.vue'

const props = defineProps({
  type: { type: String as PropType<string>, required: false },
  items: { type: Array as PropType<any[]>, default: () => [] }
})
</script>

<template>
  <CarouselBase>
    <template #title>
      <slot name="title" />
    </template>
    <template #more>
      <slot name="more" />
    </template>

    <ItemCard v-for="i of items" :key="i.id" :item="i" class="flex-1 w-40 md:w-60" />
  </CarouselBase>
</template>
