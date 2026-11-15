<script setup lang="ts">
import type { Song } from '../db'
import { current } from '../player'
import { fmtTime } from '../format'
import { songMenu } from '../menus'
import Cover from './Cover.vue'
import Icon from './Icon.vue'

// `numbered` is the album layout: track number and length instead of cover and artist.
const props = defineProps<{ song: Song; numbered?: boolean; index?: number; sub?: string }>()
defineEmits<{ play: [] }>()
</script>

<template>
  <div class="song" :class="{ lined: numbered, active: current?.id === song.id }">
    <button class="main" @click="$emit('play')">
      <span v-if="numbered" class="n num">{{ song.track || (index ?? 0) + 1 }}</span>
      <Cover v-else class="s40" :cover-id="song.coverId" />
      <span class="grow">
        <span class="t ellipsis" style="display: block">{{ song.title }}</span>
        <span v-if="!numbered" class="s ellipsis" style="display: block">{{ props.sub ?? song.artist }}</span>
      </span>
      <span v-if="numbered" class="dur num">{{ fmtTime(song.duration) }}</span>
    </button>
    <button class="more" :aria-label="`Options for ${song.title}`" @click="songMenu(song)">
      <Icon name="more" :size="18" />
    </button>
  </div>
</template>
