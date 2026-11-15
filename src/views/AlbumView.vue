<script setup lang="ts">
import { computed } from 'vue'
import { albumsByKey } from '../library'
import { playList } from '../player'
import { albumMenu } from '../menus'
import { goBack } from '../router'
import { fmtLength, plural } from '../format'
import Cover from '../components/Cover.vue'
import Icon from '../components/Icon.vue'
import SongRow from '../components/SongRow.vue'

const props = defineProps<{ id: string }>()
const album = computed(() => albumsByKey.value.get(props.id))
const multiDisc = computed(() => new Set(album.value?.songs.map((s) => s.disc)).size > 1)
const play = (start: number, shuffle?: boolean) => {
  const a = album.value
  if (a) playList(a.songs.map((s) => s.id), start, { kind: 'album', label: a.name }, { shuffle })
}
</script>

<template>
  <main class="page" style="gap: 20px">
    <div class="between">
      <button class="icon-btn" aria-label="Back" @click="goBack"><Icon name="back" :size="22" /></button>
      <button v-if="album" class="icon-btn" aria-label="Album options" @click="albumMenu(album)"><Icon name="dots" /></button>
    </div>
    <template v-if="album">
      <div class="album-head">
        <Cover :cover-id="album.coverId" :icon="44" />
        <div class="meta">
          <div class="label">Album</div>
          <h1 class="title-sm">{{ album.name }}</h1>
          <RouterLink :to="{ name: 'artist', params: { name: album.artist } }">{{ album.artist }}</RouterLink>
          <div class="small muted">{{ album.year ? album.year + ' · ' : '' }}{{ plural(album.songs.length, 'song') }} · {{ fmtLength(album.duration) }}</div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn primary" @click="play(0, false)"><Icon name="play" :size="18" />Play</button>
        <button class="btn" @click="play(0, true)"><Icon name="shuffle" :size="18" />Shuffle</button>
      </div>
      <div class="songs">
        <template v-for="(s, i) in album.songs" :key="s.id">
          <div v-if="multiDisc && (i === 0 || album.songs[i - 1].disc !== s.disc)" class="label" style="padding: 14px 0 6px">Disc {{ s.disc }}</div>
          <SongRow :song="s" numbered :index="i" @play="play(i)" />
        </template>
      </div>
    </template>
    <div v-else class="empty">
      <h2>Album not found</h2>
      <p>It may have been deleted from this device.</p>
      <RouterLink :to="{ name: 'library' }" class="btn">Back to library</RouterLink>
    </div>
  </main>
</template>
