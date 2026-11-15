<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ready } from './library'
import { current, next, player, previous, seek, toggle } from './player'
import { importFiles } from './importer'
import { toast } from './ui'
import TabBar from './components/TabBar.vue'
import MiniPlayer from './components/MiniPlayer.vue'
import NowPlaying from './components/NowPlaying.vue'
import SheetHost from './components/SheetHost.vue'

const route = useRoute()
const router = useRouter()

// Keyboard on a laptop: Space play/pause, arrows seek 5 s, Shift+arrows change song, "/" search.
addEventListener('keydown', (e) => {
  const el = e.target as HTMLElement
  if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
  if (e.key === '/') {
    e.preventDefault()
    router.push({ name: 'search' })
  }
  if (!current.value) return
  if (e.key === ' ' && el.tagName !== 'BUTTON' && el.tagName !== 'A') {
    e.preventDefault()
    toggle()
  } else if (e.key === 'ArrowRight') e.shiftKey ? next() : seek(player.time + 5)
  else if (e.key === 'ArrowLeft') e.shiftKey ? previous() : seek(player.time - 5)
})

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
