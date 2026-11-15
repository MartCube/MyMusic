<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ready } from './library'
import { current, player } from './player'
import { toast } from './ui'
import TabBar from './components/TabBar.vue'
import MiniPlayer from './components/MiniPlayer.vue'
import NowPlaying from './components/NowPlaying.vue'
import SheetHost from './components/SheetHost.vue'

const route = useRoute()
const playerOpen = computed(() => !!route.query.np && !!current.value)

watch(
  () => player.error,
  (e) => {
    if (!e) return
    toast(e)
    player.error = ''
  },
)
</script>

<template>
  <div :class="{ 'has-mini': !!current }" :inert="playerOpen">
    <RouterView v-if="ready" />
    <MiniPlayer v-if="current" />
    <TabBar />
  </div>
  <Transition name="slide">
    <NowPlaying v-if="playerOpen" />
  </Transition>
  <SheetHost />
</template>
