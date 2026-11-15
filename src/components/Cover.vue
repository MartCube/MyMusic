<script setup lang="ts">
import { coverUrls } from '../library'
import Icon from './Icon.vue'
defineProps<{ coverId?: string; icon?: number }>()
</script>

<template>
  <span class="cover">
    <img v-if="coverId && coverUrls.get(coverId)" :src="coverUrls.get(coverId)" alt="" loading="lazy" decoding="async" />
    <Icon v-else name="note" :size="icon ?? 20" />
  </span>
</template>
