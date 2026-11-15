<script setup lang="ts">
import { computed } from 'vue'
import type { Playlist } from '../db'
import { coverUrls, songsById } from '../library'
import Icon from './Icon.vue'

// Built from the songs: four different covers as a 2x2 tile, otherwise the first one.
const props = defineProps<{ playlist: Playlist; icon?: number }>()
const urls = computed(() => {
  const seen = new Set<string>()
  for (const id of props.playlist.songIds) {
    const c = songsById.value.get(id)?.coverId
    if (c && coverUrls.has(c)) seen.add(c)
    if (seen.size === 4) break
  }
  const list = [...seen].map((c) => coverUrls.get(c)!)
  return list.length >= 4 ? list : list.slice(0, 1)
})
</script>

<template>
  <span class="cover" :class="{ quad: urls.length === 4 }">
    <img v-for="u in urls" :key="u" :src="u" alt="" loading="lazy" decoding="async" />
    <Icon v-if="!urls.length" name="playlist" :size="icon ?? 22" />
  </span>
</template>
