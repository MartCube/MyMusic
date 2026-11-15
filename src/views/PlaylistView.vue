<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Song } from '../db'
import { songsById } from '../library'
import { findPlaylist, removeFromPlaylist, setPlaylistOrder } from '../playlists'
import { playList } from '../player'
import { playlistMenu } from '../menus'
import { goBack } from '../router'
import { toast } from '../ui'
import { fmtLength, plural } from '../format'
import Cover from '../components/Cover.vue'
import Icon from '../components/Icon.vue'
import PlaylistCover from '../components/PlaylistCover.vue'
import PlayButtons from '../components/PlayButtons.vue'
import SongRow from '../components/SongRow.vue'

const props = defineProps<{ id: string }>()
const playlist = computed(() => findPlaylist(props.id))
const list = computed(() => (playlist.value?.songIds ?? []).map((id) => songsById.value.get(id)).filter((s): s is Song => !!s))
const duration = computed(() => list.value.reduce((n, s) => n + s.duration, 0))
const editing = ref(false)

const play = (start: number, shuffle?: boolean) =>
  playList(list.value.map((s) => s.id), start, { kind: 'playlist', label: playlist.value!.name, id: playlist.value!.id }, { shuffle })

async function remove(song: Song) {
  await removeFromPlaylist(props.id, song.id)
  toast('Removed from playlist')
  if (!list.value.length) editing.value = false
}
// Extra entries in a song's ⋮ menu inside a playlist: change its place, or take it out.
async function moveTo(song: Song, to: number) {
  const ids = list.value.map((s) => s.id)
  const from = ids.indexOf(song.id)
  if (from < 0 || from === to) return
  ids.splice(to, 0, ...ids.splice(from, 1))
  await setPlaylistOrder(props.id, ids)
  toast(to === 0 ? 'Moved to the top' : to === ids.length - 1 ? 'Moved to the bottom' : `Now number ${to + 1}`)
}
function playlistActions(song: Song) {
  const i = list.value.findIndex((s) => s.id === song.id)
  const last = list.value.length - 1
  return [
    ...(i > 0 ? [{ label: 'Move to top', icon: 'top', run: () => moveTo(song, 0) }, { label: 'Move up', icon: 'up', run: () => moveTo(song, i - 1) }] : []),
    ...(i < last ? [{ label: 'Move down', icon: 'down', run: () => moveTo(song, i + 1) }, { label: 'Move to bottom', icon: 'bottom', run: () => moveTo(song, last) }] : []),
    { label: 'Remove from this playlist', icon: 'close', run: () => remove(song) },
  ]
}

// ---- drag to reorder (edit mode). Rows have a fixed height, so the target slot is simple arithmetic.
const ROW = 60
const drag = reactive({ from: -1, to: -1, dy: 0, startY: 0 })
function dragStart(e: PointerEvent, i: number) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  Object.assign(drag, { from: i, to: i, dy: 0, startY: e.clientY })
}
function dragMove(e: PointerEvent) {
  if (drag.from < 0) return
  const max = list.value.length - 1
  drag.dy = Math.max(-drag.from * ROW, Math.min(e.clientY - drag.startY, (max - drag.from) * ROW))
  drag.to = Math.max(0, Math.min(max, drag.from + Math.round(drag.dy / ROW)))
}
async function dragEnd() {
  const { from, to } = drag
  drag.from = -1
  if (from < 0 || from === to) return
  const ids = list.value.map((s) => s.id)
  ids.splice(to, 0, ...ids.splice(from, 1))
  await setPlaylistOrder(props.id, ids)
}
function rowStyle(i: number) {
  const { from, to, dy } = drag
  if (from < 0) return {}
  if (i === from) return { transform: `translateY(${dy}px)`, zIndex: 2, background: 'var(--raised)', transition: 'none' }
  if (from < to && i > from && i <= to) return { transform: `translateY(${-ROW}px)` }
  if (from > to && i >= to && i < from) return { transform: `translateY(${ROW}px)` }
  return {}
}
// Keyboard and screen-reader way to reorder.
async function nudge(i: number, by: number) {
  const ids = list.value.map((s) => s.id)
  const j = i + by
  if (j < 0 || j >= ids.length) return
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  await setPlaylistOrder(props.id, ids)
}
</script>

<template>
  <main class="page" style="gap: 20px">
    <div class="between">
      <button class="icon-btn" aria-label="Back" @click="goBack"><Icon name="back" :size="22" /></button>
      <button v-if="editing" class="btn primary" style="height: 44px" @click="editing = false">Done</button>
      <button v-else-if="playlist" class="icon-btn" aria-label="Playlist options" @click="playlistMenu(playlist, () => (editing = true))"><Icon name="dots" /></button>
    </div>
    <template v-if="playlist">
      <div class="album-head">
        <PlaylistCover :playlist="playlist" :icon="44" />
        <div class="meta">
          <div class="label">Playlist</div>
          <h1 class="title-sm">{{ playlist.name }}</h1>
          <div class="small muted">{{ plural(list.length, 'song') }}{{ list.length ? ' · ' + fmtLength(duration) : '' }}</div>
        </div>
      </div>

      <template v-if="list.length">
        <div v-if="!editing" class="btn-row">
          <PlayButtons :ids="list.map((s) => s.id)" :context="{ kind: 'playlist', label: playlist.name, id: playlist.id }" />
        </div>
        <div v-if="!editing && list.length > 1" class="between" style="margin-bottom: -8px">
          <span class="small muted">Use a song’s three-dot menu to move it</span>
          <button class="text-btn" style="color: var(--accent); font-weight: 700" @click="editing = true"><Icon name="grip" :size="16" />Reorder</button>
        </div>
        <p v-else class="small muted">Drag the handle to change the order. Tap × to take a song out of the playlist.</p>

        <div v-if="editing" class="songs">
          <div v-for="(s, i) in list" :key="s.id" class="song edit" :style="rowStyle(i)">
            <button class="act plain" :aria-label="`Remove ${s.title} from playlist`" @click="remove(s)"><Icon name="close" :size="18" /></button>
            <Cover class="s44" :cover-id="s.coverId" />
            <span class="grow">
              <span class="t ellipsis" style="display: block">{{ s.title }}</span>
              <span class="s ellipsis" style="display: block">{{ s.artist }}</span>
            </span>
            <button
              class="act plain handle"
              :aria-label="`Move ${s.title}. Use arrow up and down.`"
              @pointerdown="dragStart($event, i)"
              @pointermove="dragMove"
              @pointerup="dragEnd"
              @pointercancel="dragEnd"
              @keydown.up.prevent="nudge(i, -1)"
              @keydown.down.prevent="nudge(i, 1)"
            >
              <Icon name="grip" />
            </button>
          </div>
        </div>
        <div v-else class="songs">
          <SongRow v-for="(s, i) in list" :key="s.id" :song="s" :menu-extra="playlistActions(s)" :position="i + 1" @play="play(i)" />
        </div>
      </template>
      <div v-else class="empty">
        <div class="mark"><Icon name="playlist" :size="34" /></div>
        <h2>No songs yet</h2>
        <p>Open the three-dot menu on any song or album and choose "Add to playlist".</p>
        <RouterLink :to="{ name: 'library', query: { tab: 'songs' } }" class="btn primary">Browse songs</RouterLink>
      </div>
    </template>
    <div v-else class="empty">
      <h2>Playlist not found</h2>
      <p>It may have been deleted.</p>
      <RouterLink :to="{ name: 'library', query: { tab: 'playlists' } }" class="btn">Back to library</RouterLink>
    </div>
  </main>
</template>
