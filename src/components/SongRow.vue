<script setup lang="ts">
import { computed } from 'vue'
import type { Song } from '../db'
import { current, player, toggle } from '../player'
import { fmtTime } from '../format'
import { songMenu } from '../menus'
import type { SheetAction } from '../ui'
import Cover from './Cover.vue'
import Icon from './Icon.vue'

// `numbered` is the album layout: track number and length instead of cover and artist.
const props = defineProps<{ song: Song; numbered?: boolean; index?: number; sub?: string; menuExtra?: SheetAction[] }>()
const emit = defineEmits<{ play: [] }>()
const isCurrent = computed(() => current.value?.id === props.song.id)
const isPlaying = computed(() => isCurrent.value && player.playing)
// The button pauses and resumes the song that is on; on any other row it starts that song.
const playOrToggle = () => (isCurrent.value ? toggle() : emit('play'))
</script>

<template>
  <div class="song" :class="{ lined: numbered, active: isCurrent }">
    <button class="main" @click="emit('play')">
      <span v-if="numbered" class="n num">{{ song.track || (index ?? 0) + 1 }}</span>
      <Cover v-else class="s44" :cover-id="song.coverId" />
      <span class="grow">
        <span class="t ellipsis" style="display: block">{{ song.title }}</span>
        <span class="s ellipsis" style="display: block">{{ numbered ? fmtTime(song.duration) : (props.sub ?? song.artist) }}</span>
      </span>
    </button>
    <button class="act" :class="{ on: isPlaying }" :aria-label="`${isPlaying ? 'Pause' : 'Play'} ${song.title}`" @click="playOrToggle">
      <Icon :name="isPlaying ? 'pause' : 'play'" :size="20" />
    </button>
    <button class="act" :aria-label="`Options for ${song.title}`" @click="songMenu(song, menuExtra)">
      <Icon name="more" :size="20" />
    </button>
  </div>
</template>
