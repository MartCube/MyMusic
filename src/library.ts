import { computed, reactive, shallowRef } from 'vue'
import * as store from './db'
import type { Song } from './db'
import { loadPlaylists, pruneFromPlaylists } from './playlists'

export interface Album {
  key: string
  name: string
  artist: string
  year: number
  coverId: string
  songs: Song[]
  duration: number
  addedAt: number
}

export interface Artist {
  name: string
  albums: Album[]
  songs: Song[]
}

export const UNKNOWN_ARTIST = 'Unknown Artist'

export const songs = shallowRef<Song[]>([])
export const ready = shallowRef(false)
/** coverId -> object URL, for every cover in the library. */
export const coverUrls = reactive(new Map<string, string>())

const cmp = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare
export { cmp }

export const songsById = computed(() => new Map(songs.value.map((s) => [s.id, s])))

export function albumKeyOf(s: Song) {
  return s.album ? `${(s.albumArtist || s.artist).toLowerCase()}\u0001${s.album.toLowerCase()}` : ''
}

export const albums = computed<Album[]>(() => {
  const map = new Map<string, Album>()
  for (const s of songs.value) {
    const key = albumKeyOf(s)
    if (!key) continue
    let a = map.get(key)
    if (!a) {
      a = { key, name: s.album, artist: s.albumArtist || s.artist, year: 0, coverId: '', songs: [], duration: 0, addedAt: s.addedAt }
      map.set(key, a)
    }
    a.songs.push(s)
    a.duration += s.duration
    a.year ||= s.year
    a.coverId ||= s.coverId
    a.addedAt = Math.max(a.addedAt, s.addedAt)
  }
  for (const a of map.values()) {
    a.songs.sort((x, y) => x.disc - y.disc || x.track - y.track || cmp(x.title, y.title))
  }
  return [...map.values()]
})

export const albumsByKey = computed(() => new Map(albums.value.map((a) => [a.key, a])))

export const artists = computed<Artist[]>(() => {
  const map = new Map<string, Artist>()
  const get = (name: string) => {
    const k = name.toLowerCase()
    let a = map.get(k)
    if (!a) map.set(k, (a = { name, albums: [], songs: [] }))
    return a
  }
  for (const s of songs.value) get(s.artist).songs.push(s)
  for (const al of albums.value) get(al.artist).albums.push(al)
  for (const a of map.values()) {
    a.albums.sort((x, y) => x.year - y.year || cmp(x.name, y.name))
    a.songs.sort((x, y) => cmp(x.title, y.title))
  }
  return [...map.values()].sort((x, y) => cmp(x.name, y.name))
})

export function findArtist(name: string) {
  const k = name.toLowerCase()
  return artists.value.find((a) => a.name.toLowerCase() === k)
}

export const musicBytes = computed(() => songs.value.reduce((n, s) => n + s.size, 0))

export async function loadLibrary() {
  const [list, covers] = await Promise.all([store.allSongs(), store.allCovers(), loadPlaylists()])
  for (const [id, blob] of covers) coverUrls.set(id, URL.createObjectURL(blob))
  songs.value = list
  ready.value = true
}

export function addSongToLibrary(song: Song) {
  songs.value = [...songs.value, song]
}

export function registerCover(id: string, blob: Blob) {
  if (!coverUrls.has(id)) coverUrls.set(id, URL.createObjectURL(blob))
}

/** Removes songs from the device, plus any cover no remaining song uses. */
export async function removeSongs(ids: string[]) {
  const gone = new Set(ids)
  const kept = songs.value.filter((s) => !gone.has(s.id))
  const used = new Set(kept.map((s) => s.coverId))
  const orphans = [...coverUrls.keys()].filter((c) => !used.has(c))
  await store.deleteSongs(ids)
  await pruneFromPlaylists(gone)
  await store.deleteCovers(orphans)
  for (const c of orphans) {
    URL.revokeObjectURL(coverUrls.get(c)!)
    coverUrls.delete(c)
  }
  songs.value = kept
}

export async function removeEverything() {
  await store.clearLibrary()
  await pruneFromPlaylists(new Set(songs.value.map((s) => s.id)))
  for (const url of coverUrls.values()) URL.revokeObjectURL(url)
  coverUrls.clear()
  songs.value = []
}
