<script setup lang="ts">
import { computed } from 'vue'
import { findArtist } from '../library'
import { playList } from '../player'
import { goBack } from '../router'
import { plural } from '../format'
import AlbumTile from '../components/AlbumTile.vue'
import Icon from '../components/Icon.vue'
import PlayButtons from '../components/PlayButtons.vue'
import SongRow from '../components/SongRow.vue'

const props = defineProps<{ name: string }>()
const artist = computed(() => findArtist(props.name))
// Albums in order first, then songs that are not on any of this artist's albums.
const playOrder = computed(() => {
  const a = artist.value
  if (!a) return []
  const ids = a.albums.flatMap((al) => al.songs.map((s) => s.id))
  const seen = new Set(ids)
  return [...ids, ...a.songs.filter((s) => !seen.has(s.id)).map((s) => s.id)]
})
const play = (id?: string, shuffle?: boolean) =>
  playList(playOrder.value, id ? Math.max(playOrder.value.indexOf(id), 0) : 0, { kind: 'artist', label: artist.value!.name, id: artist.value!.name.toLowerCase() }, { shuffle })
</script>

<template>
  <main class="page" style="gap: 20px">
    <div><button class="icon-btn" aria-label="Back" @click="goBack"><Icon name="back" :size="22" /></button></div>
    <template v-if="artist">
      <div>
        <div class="label">Artist</div>
        <h1 class="title" style="margin-top: 4px">{{ artist.name }}</h1>
        <div class="small muted" style="margin-top: 4px">{{ artist.albums.length ? plural(artist.albums.length, 'album') + ' · ' : '' }}{{ plural(artist.songs.length, 'song') }}</div>
      </div>
      <div class="btn-row">
        <PlayButtons :ids="playOrder" :context="{ kind: 'artist', label: artist.name, id: artist.name.toLowerCase() }" />
      </div>
      <section v-if="artist.albums.length" class="section">
        <h2 class="label">Albums</h2>
        <div class="grid">
          <AlbumTile v-for="al in artist.albums" :key="al.key" :album="al" :sub="String(al.year || plural(al.songs.length, 'song'))" />
        </div>
      </section>
      <section v-if="artist.songs.length" class="section">
        <h2 class="label">Songs</h2>
        <div class="songs">
          <SongRow v-for="s in artist.songs" :key="s.id" :song="s" :sub="s.album || 'No album'" @play="play(s.id)" />
        </div>
      </section>
    </template>
    <div v-else class="empty">
      <h2>Artist not found</h2>
      <p>Their music may have been deleted from this device.</p>
      <RouterLink :to="{ name: 'library' }" class="btn">Back to library</RouterLink>
    </div>
  </main>
</template>
