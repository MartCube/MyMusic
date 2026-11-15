<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { albums, artists, cmp, songs, type Album } from '../library'
import type { Song } from '../db'
import { playList } from '../player'
import { openSheet } from '../ui'
import { plural } from '../format'
import Cover from '../components/Cover.vue'
import Icon from '../components/Icon.vue'
import SongRow from '../components/SongRow.vue'

type Tab = 'albums' | 'artists' | 'songs'
const TABS: { id: Tab; label: string }[] = [
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'songs', label: 'Songs' },
]
const route = useRoute()
const router = useRouter()
const tab = computed<Tab>(() => (TABS.some((t) => t.id === route.query.tab) ? (route.query.tab as Tab) : 'albums'))
const setTab = (id: Tab) => router.replace({ query: { ...route.query, tab: id === 'albums' ? undefined : id } })

const ALBUM_SORTS: Record<string, { label: string; fn: (a: Album, b: Album) => number }> = {
  artist: { label: 'Artist A–Z', fn: (a, b) => cmp(a.artist, b.artist) || a.year - b.year || cmp(a.name, b.name) },
  title: { label: 'Album A–Z', fn: (a, b) => cmp(a.name, b.name) },
  added: { label: 'Recently added', fn: (a, b) => b.addedAt - a.addedAt },
  year: { label: 'Newest first', fn: (a, b) => b.year - a.year || cmp(a.name, b.name) },
}
const SONG_SORTS: Record<string, { label: string; fn: (a: Song, b: Song) => number }> = {
  title: { label: 'Title A–Z', fn: (a, b) => cmp(a.title, b.title) },
  artist: { label: 'Artist A–Z', fn: (a, b) => cmp(a.artist, b.artist) || cmp(a.title, b.title) },
  album: { label: 'Album A–Z', fn: (a, b) => cmp(a.album, b.album) || a.disc - b.disc || a.track - b.track },
  added: { label: 'Recently added', fn: (a, b) => b.addedAt - a.addedAt || cmp(a.title, b.title) },
}
const remembered = (key: string, options: object, fallback: string) => {
  const v = localStorage.getItem(key)
  return ref(v && v in options ? v : fallback)
}
const albumSort = remembered('sort.albums', ALBUM_SORTS, 'artist')
const songSort = remembered('sort.songs', SONG_SORTS, 'title')

const sortedAlbums = computed(() => [...albums.value].sort(ALBUM_SORTS[albumSort.value].fn))
const sortedSongs = computed(() => [...songs.value].sort(SONG_SORTS[songSort.value].fn))

function chooseSort() {
  const forAlbums = tab.value === 'albums'
  const options = forAlbums ? ALBUM_SORTS : SONG_SORTS
  const state = forAlbums ? albumSort : songSort
  openSheet({
    title: forAlbums ? 'Sort albums' : 'Sort songs',
    actions: Object.entries(options).map(([id, o]) => ({
      label: o.label,
      primary: state.value === id,
      run: () => {
        state.value = id
        localStorage.setItem(forAlbums ? 'sort.albums' : 'sort.songs', id)
      },
    })),
  })
}

const playAll = (start: number, shuffle?: boolean) =>
  playList(sortedSongs.value.map((s) => s.id), start, { kind: 'library', label: 'All songs' }, { shuffle })
</script>

<template>
  <main class="page">
    <div class="between">
      <h1 class="title">Library</h1>
      <div class="row" style="gap: 8px">
        <RouterLink :to="{ name: 'search' }" class="icon-btn" aria-label="Search"><Icon name="search" /></RouterLink>
        <RouterLink :to="{ name: 'import' }" class="icon-btn accent" aria-label="Import music"><Icon name="plus" /></RouterLink>
      </div>
    </div>

    <div v-if="!songs.length" class="empty">
      <div class="mark"><Icon name="note" :size="34" /></div>
      <h2>No music yet</h2>
      <p>Add the songs you own from this device. After that they play here with no internet.</p>
      <RouterLink :to="{ name: 'import' }" class="btn primary"><Icon name="plus" :size="18" />Import music</RouterLink>
    </div>

    <template v-else>
      <div class="segmented" role="tablist">
        <button v-for="t in TABS" :key="t.id" role="tab" :aria-selected="tab === t.id" @click="setTab(t.id)">{{ t.label }}</button>
      </div>

      <div class="between">
        <div class="small muted">
          <template v-if="tab === 'artists'">{{ plural(artists.length, 'artist') }}</template>
          <template v-else>{{ plural(albums.length, 'album') }} · {{ plural(songs.length, 'song') }}</template>
        </div>
        <button v-if="tab !== 'artists'" class="text-btn" @click="chooseSort">
          <Icon name="sort" :size="16" />{{ (tab === 'albums' ? ALBUM_SORTS[albumSort] : SONG_SORTS[songSort]).label }}
        </button>
      </div>

      <template v-if="tab === 'albums'">
        <div v-if="sortedAlbums.length" class="grid">
          <RouterLink v-for="al in sortedAlbums" :key="al.key" :to="{ name: 'album', params: { id: al.key } }" class="tile">
            <Cover :cover-id="al.coverId" :icon="28" />
            <div>
              <div class="t ellipsis">{{ al.name }}</div>
              <div class="a ellipsis">{{ al.artist }}</div>
            </div>
          </RouterLink>
        </div>
        <p v-else class="muted" style="font-size: 14px; line-height: 1.5">None of your songs has an album name in its tags. You'll find them all under Songs.</p>
      </template>

      <div v-else-if="tab === 'artists'" class="stack">
        <RouterLink v-for="a in artists" :key="a.name" :to="{ name: 'artist', params: { name: a.name } }" class="artist-row">
          <span class="cover round">{{ a.name.charAt(0).toUpperCase() }}</span>
          <span class="grow">
            <span class="t ellipsis" style="display: block">{{ a.name }}</span>
            <span class="small muted">{{ a.albums.length ? plural(a.albums.length, 'album') + ' · ' : '' }}{{ plural(a.songs.length, 'song') }}</span>
          </span>
        </RouterLink>
      </div>

      <template v-else>
        <div class="btn-row">
          <button class="btn primary" @click="playAll(0, false)"><Icon name="play" :size="18" />Play</button>
          <button class="btn" @click="playAll(0, true)"><Icon name="shuffle" :size="18" />Shuffle</button>
        </div>
        <div class="songs">
          <SongRow v-for="(s, i) in sortedSongs" :key="s.id" :song="s" :sub="s.album ? `${s.artist} · ${s.album}` : s.artist" @play="playAll(i)" />
        </div>
      </template>
    </template>
  </main>
</template>
