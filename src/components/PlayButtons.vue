<script setup lang="ts">
import { computed } from 'vue'
import { isActive, player, playOrToggle, shuffleOrToggle, type PlayContext } from '../player'
import Icon from './Icon.vue'

// Play and Shuffle for an album, playlist, artist or the whole library. While that one is playing,
// Play becomes Pause and Shuffle switches shuffle for the rest without restarting the song.
const props = defineProps<{ ids: string[]; context: PlayContext }>()
const active = computed(() => isActive(props.context))
const playing = computed(() => active.value && player.playing)
const shuffled = computed(() => active.value && player.shuffle)
</script>

<template>
  <button class="btn primary" :disabled="!ids.length" @click="playOrToggle(ids, context)">
    <Icon :name="playing ? 'pause' : 'play'" :size="18" />{{ playing ? 'Pause' : active ? 'Resume' : 'Play' }}
  </button>
  <button class="btn" :class="{ lit: shuffled }" :disabled="!ids.length" :aria-pressed="active ? shuffled : undefined" @click="shuffleOrToggle(ids, context)">
    <Icon name="shuffle" :size="18" />{{ shuffled ? 'Shuffle on' : 'Shuffle' }}
  </button>
</template>
