import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface Song {
  /** Content fingerprint of the audio file; also the duplicate check. */
  id: string
  title: string
  artist: string
  album: string
  albumArtist: string
  track: number
  disc: number
  year: number
  genre: string
  duration: number
  coverId: string
  addedAt: number
  fileName: string
  size: number
  mime: string
}

interface Schema extends DBSchema {
  songs: { key: string; value: Song }
  audio: { key: string; value: Blob }
  covers: { key: string; value: Blob }
  kv: { key: string; value: unknown }
}

let dbp: Promise<IDBPDatabase<Schema>> | undefined

/** Song info, audio files and covers live in separate stores so listing the library never touches the audio. */
export function db() {
  dbp ??= openDB<Schema>('mymusic', 1, {
    upgrade(d) {
      d.createObjectStore('songs', { keyPath: 'id' })
      d.createObjectStore('audio')
      d.createObjectStore('covers')
      d.createObjectStore('kv')
    },
  })
  return dbp
}

export async function allSongs() {
  return (await db()).getAll('songs')
}

export async function putSong(song: Song, audio: Blob) {
  const tx = (await db()).transaction(['songs', 'audio'], 'readwrite')
  tx.objectStore('audio').put(audio, song.id)
  tx.objectStore('songs').put(song)
  await tx.done
}

export async function getAudio(id: string) {
  return (await db()).get('audio', id)
}

export async function deleteSongs(ids: string[]) {
  const tx = (await db()).transaction(['songs', 'audio'], 'readwrite')
  for (const id of ids) {
    tx.objectStore('songs').delete(id)
    tx.objectStore('audio').delete(id)
  }
  await tx.done
}

export async function allCovers() {
  const d = await db()
  const [keys, blobs] = await Promise.all([d.getAllKeys('covers'), d.getAll('covers')])
  return keys.map((k, i) => [k, blobs[i]] as const)
}

export async function hasCover(id: string) {
  return (await (await db()).getKey('covers', id)) !== undefined
}

export async function putCover(id: string, blob: Blob) {
  await (await db()).put('covers', blob, id)
}

export async function deleteCovers(ids: string[]) {
  const tx = (await db()).transaction('covers', 'readwrite')
  for (const id of ids) tx.store.delete(id)
  await tx.done
}

export async function clearLibrary() {
  const tx = (await db()).transaction(['songs', 'audio', 'covers'], 'readwrite')
  tx.objectStore('songs').clear()
  tx.objectStore('audio').clear()
  tx.objectStore('covers').clear()
  await tx.done
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('kv', key)) as T | undefined
}

export async function kvSet(key: string, value: unknown) {
  await (await db()).put('kv', value, key)
}
