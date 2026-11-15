import { reactive } from 'vue'
import type { ICommonTagsResult } from 'music-metadata'
import * as store from './db'
import type { Song } from './db'
import { addSongToLibrary, registerCover, songsById, UNKNOWN_ARTIST } from './library'

export type ItemStatus = 'reading' | 'added' | 'duplicate' | 'skipped' | 'failed'

export interface ImportItem {
  name: string
  status: ItemStatus
  note: string
}

export const importState = reactive({
  running: false,
  cancelled: false,
  total: 0,
  done: 0,
  added: 0,
  duplicates: 0,
  skipped: 0,
  failed: [] as ImportItem[],
  /** Most recent files first. */
  recent: [] as ImportItem[],
  /** True once a run has finished, until the next one starts. */
  finished: false,
})

const MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  m4b: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg; codecs=opus',
  weba: 'audio/webm',
}
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp'])
const FOLDER_COVER = /^(cover|folder|front|album|albumart(small)?)$/i

export const ACCEPT = 'audio/*,' + Object.keys(MIME).map((e) => '.' + e).join(',')

const extOf = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase()
const dirOf = (f: File) => {
  const p = f.webkitRelativePath || ''
  return p.slice(0, Math.max(p.lastIndexOf('/'), 0))
}
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

/** Fingerprint from the file size plus its first and last 256 KB: fast even for big files. */
async function fingerprint(blob: Blob) {
  const CHUNK = 256 * 1024
  const head = await blob.slice(0, CHUNK).arrayBuffer()
  const tail = blob.size > CHUNK * 2 ? await blob.slice(-CHUNK).arrayBuffer() : new ArrayBuffer(0)
  const all = new Uint8Array(head.byteLength + tail.byteLength + 8)
  all.set(new Uint8Array(head), 0)
  all.set(new Uint8Array(tail), head.byteLength)
  new DataView(all.buffer).setFloat64(head.byteLength + tail.byteLength, blob.size)
  return hex(await crypto.subtle.digest('SHA-256', all)).slice(0, 32)
}

/** Scales a cover down to at most 600px so 50 albums of art stays small. */
async function shrinkCover(blob: Blob): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(blob)
    const scale = Math.min(1, 600 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close()
    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.86))
    return out ?? blob
  } catch {
    return blob
  }
}

async function saveCover(image: Blob, seen: Map<string, string>) {
  const id = await fingerprint(image)
  if (!seen.has(id)) {
    if (!(await store.hasCover(id))) {
      const small = await shrinkCover(image)
      await store.putCover(id, small)
      registerCover(id, small)
    }
    seen.set(id, id)
  }
  return id
}

function probeDuration(blob: Blob) {
  return new Promise<number>((resolve) => {
    const a = new Audio()
    const url = URL.createObjectURL(blob)
    const finish = (d: number) => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(d) ? d : 0)
    }
    a.preload = 'metadata'
    a.onloadedmetadata = () => finish(a.duration)
    a.onerror = () => finish(0)
    setTimeout(() => finish(0), 4000)
    a.src = url
  })
}

/** "03 - Song name.mp3" -> { track: 3, title: "Song name" } */
function fromFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, '')
  const m = base.match(/^(\d{1,3})[\s._-]+(.+)$/)
  return m ? { track: Number(m[1]), title: m[2].trim() } : { track: 0, title: base.trim() }
}

function canPlay(mime: string) {
  return new Audio().canPlayType(mime) !== ''
}

export function cancelImport() {
  importState.cancelled = true
}

export async function importFiles(input: File[]) {
  if (importState.running || !input.length) return
  const st = importState
  Object.assign(st, { running: true, cancelled: false, finished: false, total: input.length, done: 0, added: 0, duplicates: 0, skipped: 0 })
  st.failed = []
  st.recent = []

  // Ask the browser to keep the library; without this it may clear storage when space runs low.
  navigator.storage?.persist?.().catch(() => {})

  // cover.jpg / folder.jpg next to the songs, used when a file has no embedded art.
  const folderCovers = new Map<string, File>()
  for (const f of input) {
    const name = f.name.replace(/\.[^.]+$/, '')
    if (IMAGE_EXT.has(extOf(f.name)) && FOLDER_COVER.test(name) && !folderCovers.has(dirOf(f))) folderCovers.set(dirOf(f), f)
  }
  const coverSeen = new Map<string, string>()

  const files = [...input].sort((a, b) =>
    (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, { numeric: true }),
  )

  for (const file of files) {
    if (st.cancelled) break
    const item = reactive<ImportItem>({ name: file.name, status: 'reading', note: 'Reading tags' })
    st.recent.unshift(item)
    if (st.recent.length > 40) st.recent.pop()
    try {
      await importOne(file, item, folderCovers, coverSeen)
    } catch (e) {
      item.status = 'failed'
      item.note = (e as Error)?.name === 'QuotaExceededError' ? 'Not enough storage space' : 'Could not read this file'
      console.error('Import failed', file.name, e)
    }
    if (item.status === 'added') st.added++
    else if (item.status === 'duplicate') st.duplicates++
    else if (item.status === 'skipped') st.skipped++
    else st.failed.push(item)
    st.done++
    if (item.note === 'Not enough storage space') break
  }
  st.running = false
  st.finished = true
}

async function importOne(file: File, item: ImportItem, folderCovers: Map<string, File>, coverSeen: Map<string, string>) {
  const ext = extOf(file.name)
  const mime = MIME[ext] ?? (file.type.startsWith('audio/') ? file.type : '')
  if (!mime) {
    item.status = 'skipped'
    item.note = 'Not audio, skipped'
    return
  }
  if (!canPlay(mime)) {
    item.status = 'failed'
    item.note = `This browser can't play ${ext.toUpperCase()} files`
    return
  }
  const id = await fingerprint(file)
  if (songsById.value.has(id)) {
    item.status = 'duplicate'
    item.note = 'Already in library'
    return
  }

  const audio = file.slice(0, file.size, mime)
  // Loaded on first use so the tag reader does not slow down opening the app.
  const { parseBlob, selectCover } = await import('music-metadata')
  let common: ICommonTagsResult | undefined
  let duration = 0
  try {
    const meta = await parseBlob(audio)
    common = meta.common
    duration = meta.format.duration ?? 0
  } catch (e) {
    console.warn('No readable tags in', file.name, e)
  }
  if (!duration) duration = await probeDuration(audio)
  if (!duration) {
    // Neither the tags nor the browser can make sense of it: damaged, or not really audio.
    item.status = 'failed'
    item.note = 'Not a playable audio file'
    return
  }

  let coverId = ''
  const pic = selectCover(common?.picture)
  const folderCover = folderCovers.get(dirOf(file))
  if (pic) coverId = await saveCover(new Blob([pic.data as BlobPart], { type: pic.format || 'image/jpeg' }), coverSeen)
  else if (folderCover && file.webkitRelativePath) coverId = await saveCover(folderCover, coverSeen)

  const guess = fromFileName(file.name)
  const artist = common?.artist?.trim() || common?.albumartist?.trim() || UNKNOWN_ARTIST
  const song: Song = {
    id,
    title: common?.title?.trim() || guess.title,
    artist,
    album: common?.album?.trim() || '',
    albumArtist: common?.albumartist?.trim() || artist,
    track: common?.track?.no ?? guess.track,
    disc: common?.disk?.no ?? 1,
    year: common?.year ?? 0,
    genre: common?.genre?.[0] ?? '',
    duration,
    coverId,
    addedAt: Date.now(),
    fileName: file.name,
    size: file.size,
    mime,
  }
  await store.putSong(song, audio)
  addSongToLibrary(song)
  item.status = 'added'
  item.note = 'Added'
}
