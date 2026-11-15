import { shallowRef } from 'vue'
import * as store from './db'
import type { Playlist } from './db'

export const playlists = shallowRef<Playlist[]>([])

export async function loadPlaylists() {
  playlists.value = (await store.allPlaylists()).sort((a, b) => a.createdAt - b.createdAt)
}

export const findPlaylist = (id: string) => playlists.value.find((p) => p.id === id)

async function save(p: Playlist) {
  // Plain copy: IndexedDB cannot store Vue's reactive wrappers.
  const plain: Playlist = { ...p, songIds: [...p.songIds] }
  await store.putPlaylist(plain)
  const i = playlists.value.findIndex((x) => x.id === p.id)
  playlists.value = i < 0 ? [...playlists.value, plain] : playlists.value.map((x) => (x.id === p.id ? plain : x))
  return plain
}

export function createPlaylist(name: string, songIds: string[] = []) {
  return save({ id: crypto.randomUUID(), name: name.trim(), songIds: [...new Set(songIds)], createdAt: Date.now() })
}

export async function renamePlaylist(id: string, name: string) {
  const p = findPlaylist(id)
  if (p && name.trim()) await save({ ...p, name: name.trim() })
}

export async function removePlaylist(id: string) {
  await store.deletePlaylist(id)
  playlists.value = playlists.value.filter((p) => p.id !== id)
}

/** Returns how many songs were new to the playlist. */
export async function addToPlaylist(id: string, songIds: string[]) {
  const p = findPlaylist(id)
  if (!p) return 0
  const have = new Set(p.songIds)
  const fresh = [...new Set(songIds)].filter((s) => !have.has(s))
  if (fresh.length) await save({ ...p, songIds: [...p.songIds, ...fresh] })
  return fresh.length
}

export async function removeFromPlaylist(id: string, songId: string) {
  const p = findPlaylist(id)
  if (p) await save({ ...p, songIds: p.songIds.filter((s) => s !== songId) })
}

export async function setPlaylistOrder(id: string, songIds: string[]) {
  const p = findPlaylist(id)
  if (p) await save({ ...p, songIds })
}

/** Songs deleted from the device disappear from every playlist. */
export async function pruneFromPlaylists(gone: Set<string>) {
  for (const p of playlists.value) {
    if (p.songIds.some((s) => gone.has(s))) await save({ ...p, songIds: p.songIds.filter((s) => !gone.has(s)) })
  }
}
