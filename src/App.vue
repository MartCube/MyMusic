<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ready } from './library'
import { current, player } from './player'
import { installShortcuts } from './shortcuts'
import { importFiles } from './importer'
import { toast, ui } from './ui'
import TabBar from './components/TabBar.vue'
import MiniPlayer from './components/MiniPlayer.vue'
import NowPlaying from './components/NowPlaying.vue'
import SheetHost from './components/SheetHost.vue'

const route = useRoute()
const router = useRouter()

installShortcuts(router)

// Dropping files anywhere on the window imports them.
addEventListener('dragover', (e) => e.dataTransfer?.types.includes('Files') && e.preventDefault())
addEventListener('drop', (e) => {
  const files = [...(e.dataTransfer?.files ?? [])]
  if (!files.length) return
  e.preventDefault()
  router.push({ name: 'import' })
  importFiles(files)
})
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
  <div :class="{ 'has-mini': !!current }" :inert="playerOpen || !!ui.sheet">
    <RouterView v-if="ready" />
    <MiniPlayer v-if="current" />
    <TabBar />
  </div>
  <Transition name="slide">
    <NowPlaying v-if="playerOpen" :inert="!!ui.sheet" />
  </Transition>
  <SheetHost />
</template>
