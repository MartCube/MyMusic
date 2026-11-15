<script setup lang="ts">
import type { Album } from '../library'
import { computed } from 'vue'
import { isActive, player, playOrToggle } from '../player'
import Cover from './Cover.vue'
import Icon from './Icon.vue'

const props = defineProps<{ album: Album; sub?: string }>()
const to = () => ({ name: 'album', params: { id: props.album.key } })
const ctx = () => ({ kind: 'album', label: props.album.name, id: props.album.key })
const playing = computed(() => isActive(ctx()) && player.playing)
const play = () => playOrToggle(props.album.songs.map((s) => s.id), ctx())
</script>

<template>
  <div class="tile">
    <div class="art">
      <RouterLink :to="to()" tabindex="-1" aria-hidden="true"><Cover :cover-id="album.coverId" :icon="28" /></RouterLink>
      <button class="tile-play" :class="{ on: playing }" :aria-label="`${playing ? 'Pause' : 'Play'} ${album.name}`" @click="play"><Icon :name="playing ? 'pause' : 'play'" :size="18" /></button>
    </div>
    <RouterLink :to="to()">
      <div class="t ellipsis">{{ album.name }}</div>
      <div class="a ellipsis">{{ sub ?? album.artist }}</div>
    </RouterLink>
  </div>
</template>
