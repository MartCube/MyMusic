<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { current, next, player, previous, toggle } from '../player'
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
    <button class="ctl wide" aria-label="Previous" @click="previous"><Icon name="prev" :size="22" /></button>
    <button class="ctl" :aria-label="player.playing ? 'Pause' : 'Play'" @click="toggle">
      <Icon :name="player.playing ? 'pause' : 'play'" :size="22" />
    </button>
    <button class="ctl" aria-label="Next" @click="next"><Icon name="skip" :size="22" /></button>
    <span class="prog" :style="{ width: (player.duration ? (player.time / player.duration) * 100 : 0) + '%' }" />
  </div>
</template>
