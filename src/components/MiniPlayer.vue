<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { current, cycleRepeat, next, player, previous, seek, toggle, toggleShuffle } from '../player'
import { fmtTime } from '../format'
import Cover from './Cover.vue'
import Icon from './Icon.vue'

const route = useRoute()
const router = useRouter()
const open = () => router.push({ query: { ...route.query, np: '1' } })
</script>

<template>
  <div v-if="current" class="mini">
    <button class="open" aria-label="Open player" @click="open">
      <Cover class="s40" :cover-id="current.coverId" />
      <span class="grow">
        <span class="t ellipsis" style="display: block">{{ current.title }}</span>
        <span class="s ellipsis" style="display: block">{{ current.artist }}</span>
      </span>
    </button>
    <button class="ctl wide" :class="{ lit: player.shuffle }" aria-label="Shuffle" :aria-pressed="player.shuffle" @click="toggleShuffle"><Icon name="shuffle" :size="18" /></button>
    <button class="ctl wide" aria-label="Previous" @click="previous"><Icon name="prev" :size="22" /></button>
    <button class="ctl" :aria-label="player.playing ? 'Pause' : 'Play'" @click="toggle">
      <Icon :name="player.playing ? 'pause' : 'play'" :size="22" />
    </button>
    <button class="ctl" aria-label="Next" @click="next"><Icon name="skip" :size="22" /></button>
    <button class="ctl wide" :class="{ lit: player.repeat !== 'off' }" :aria-label="`Repeat: ${player.repeat}`" @click="cycleRepeat">
      <Icon name="repeat" :size="18" /><span v-if="player.repeat === 'one'" class="one">1</span>
    </button>
    <div class="seek wide">
      <span class="num">{{ fmtTime(player.time) }}</span>
      <input type="range" min="0" :max="player.duration || 0" step="0.5" :value="player.time" :style="{ '--p': (player.duration ? (player.time / player.duration) * 100 : 0) + '%' }" aria-label="Position in song" @change="seek(Number(($event.target as HTMLInputElement).value))" />
      <span class="num">{{ fmtTime(player.duration) }}</span>
    </div>
    <span class="prog" :style="{ width: (player.duration ? (player.time / player.duration) * 100 : 0) + '%' }" />
  </div>
</template>
