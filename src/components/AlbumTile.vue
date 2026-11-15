<script setup lang="ts">
import type { Album } from '../library'
import { playList } from '../player'
import Cover from './Cover.vue'
import Icon from './Icon.vue'

const props = defineProps<{ album: Album; sub?: string }>()
const to = () => ({ name: 'album', params: { id: props.album.key } })
const play = () => playList(props.album.songs.map((s) => s.id), 0, { kind: 'album', label: props.album.name }, { shuffle: false })
</script>

<template>
  <div class="tile">
    <div class="art">
      <RouterLink :to="to()" tabindex="-1" aria-hidden="true"><Cover :cover-id="album.coverId" :icon="28" /></RouterLink>
      <button class="tile-play" :aria-label="`Play ${album.name}`" @click="play"><Icon name="play" :size="18" /></button>
    </div>
    <RouterLink :to="to()">
      <div class="t ellipsis">{{ album.name }}</div>
      <div class="a ellipsis">{{ sub ?? album.artist }}</div>
    </RouterLink>
  </div>
</template>
