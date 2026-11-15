<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { albums, artists, cmp, songs, type Album } from '../library'
import type { Song } from '../db'
import { isActive, player, playList, playOrToggle } from '../player'
import { openSheet } from '../ui'
import { plural } from '../format'
import { playlists } from '../playlists'
import { newPlaylist, playlistMenu } from '../menus'
import type { Playlist } from '../db'
import AlbumTile from '../components/AlbumTile.vue'
import PlaylistCover from '../components/PlaylistCover.vue'
import Icon from '../components/Icon.vue'
import PlayButtons from '../components/PlayButtons.vue'
import SongRow from '../components/SongRow.vue'

type Tab = 'albums' | 'playlists' | 'artists' | 'songs'
const TABS: { id: Tab; label: string }[] = [
  { id: 'albums', label: 'Albums' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'artists', label: 'Artists' },
  { id: 'songs', label: 'Songs' },
]
const route = useRoute()
const router = useRouter()
// The tab is in the URL (so Back returns to it) and remembered, so the app reopens where you left it.
const isTab = (v: unknown): v is Tab => TABS.some((t) => t.id === v)
const tab = computed<Tab>(() => {
  if (isTab(route.query.tab)) return route.query.tab
  const last = localStorage.getItem('library.tab')
  return isTab(last) ? last : 'albums'
})
function setTab(id: Tab) {
  localStorage.setItem('library.tab', id)
  router.replace({ query: { ...route.query, tab: id } })
}

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
  playList(sortedSongs.value.map((s) => s.id), start, { kind: 'library', label: 'All songs', id: 'all' }, { shuffle })

function playPlaylist(p: Playlist) {
  const have = new Set(songs.value.map((s) => s.id))
  playOrToggle(p.songIds.filter((id) => have.has(id)), { kind: 'playlist', label: p.name, id: p.id })
}
const playlistPlaying = (p: Playlist) => isActive({ kind: 'playlist', id: p.id }) && player.playing
async function addPlaylist() {
  const p = await newPlaylist()
  if (p) router.push({ name: 'playlist', params: { id: p.id } })
}
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
          <template v-else-if="tab === 'playlists'">{{ plural(playlists.length, 'playlist') }}</template>
          <template v-else>{{ plural(albums.length, 'album') }} · {{ plural(songs.length, 'song') }}</template>
        </div>
        <button v-if="tab === 'playlists'" class="text-btn" style="color: var(--accent); font-weight: 700" @click="addPlaylist"><Icon name="plus" :size="16" />New playlist</button>
        <button v-else-if="tab !== 'artists'" class="text-btn" @click="chooseSort">
          <Icon name="sort" :size="16" />{{ (tab === 'albums' ? ALBUM_SORTS[albumSort] : SONG_SORTS[songSort]).label }}
        </button>
      </div>

      <template v-if="tab === 'albums'">
        <div v-if="sortedAlbums.length" class="grid">
          <AlbumTile v-for="al in sortedAlbums" :key="al.key" :album="al" />
        </div>
        <p v-else class="muted" style="font-size: 14px; line-height: 1.5">None of your songs has an album name in its tags. You'll find them all under Songs.</p>
      </template>

      <template v-else-if="tab === 'playlists'">
        <div v-if="playlists.length" class="stack">
          <div v-for="p in playlists" :key="p.id" class="song tall">
            <RouterLink :to="{ name: 'playlist', params: { id: p.id } }" class="main">
              <PlaylistCover class="s56" :playlist="p" />
              <span class="grow">
                <span class="t ellipsis" style="display: block; font-weight: 700">{{ p.name }}</span>
                <span class="s">{{ plural(p.songIds.length, 'song') }}</span>
              </span>
            </RouterLink>
            <button class="act" :class="{ on: playlistPlaying(p) }" :disabled="!p.songIds.length" :aria-label="`${playlistPlaying(p) ? 'Pause' : 'Play'} ${p.name}`" @click="playPlaylist(p)"><Icon :name="playlistPlaying(p) ? 'pause' : 'play'" :size="20" /></button>
            <button class="act" :aria-label="`Options for ${p.name}`" @click="playlistMenu(p)"><Icon name="more" :size="20" /></button>
          </div>
        </div>
        <div v-else class="empty" style="margin: 0">
          <div class="mark"><Icon name="playlist" :size="34" /></div>
          <h2>No playlists yet</h2>
          <p>Group songs you like to hear together. You can also start one from any song's ⋮ menu.</p>
          <button class="btn primary" @click="addPlaylist"><Icon name="plus" :size="18" />New playlist</button>
        </div>
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
          <PlayButtons :ids="sortedSongs.map((s) => s.id)" :context="{ kind: 'library', label: 'All songs', id: 'all' }" />
        </div>
        <div class="songs">
          <SongRow v-for="(s, i) in sortedSongs" :key="s.id" :song="s" :sub="s.album ? `${s.artist} · ${s.album}` : s.artist" @play="playAll(i)" />
        </div>
      </template>
    </template>
  </main>
</template>
