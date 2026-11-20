/**
 * Adding music from the web.
 *
 * This module is the import pipeline that everything web-related goes through:
 *   - `importFromBlob(file, hints)`: THE hook. Hand it an audio file (a File or Blob) from anywhere,
 *     for example your own converter, and it ends up in the library after the person has checked
 *     title, artist, album and cover.
 *   - `importFromUrl(link, hints)`: downloads a direct link to an audio file (.mp3, .m4a, ...), with
 *     progress, then calls importFromBlob.
 *   - `registerConverter(converter)`: plugs a converter into the "Add from web" screen. MyMusic itself
 *     ships no converter; see src/converters/index.ts and the README.
 *   - `takeSharedFiles()`: picks up audio files shared to the app from Android's share menu.
 *
 * Everything here is also on `window.MyMusic`, which is handy from the browser console.
 */
import { markRaw, reactive, ref, watch } from 'vue'
import type { Song } from './db'
import * as store from './db'
import { addSongToLibrary, songsById, UNKNOWN_ARTIST } from './library'
import { router } from './router'
import { extOf, fromFileName, ImportError, makeSong, MIME, readAudio, storeCover, type AudioRead } from './importer'

// ---------------------------------------------------------------------------
// Settings

const CONVERTER_KEY = 'web.converterUrl'
const readSetting = (key: string) => {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

export const webSettings = reactive({
  /**
   * The page "Open converter" opens in a new tab. Empty by default. If it contains `{url}`, that is
   * replaced with the link from the link field (URL-encoded); otherwise the link is copied to the clipboard.
   */
  converterUrl: readSetting(CONVERTER_KEY),
})
watch(
  () => webSettings.converterUrl,
  (v) => {
    try {
      localStorage.setItem(CONVERTER_KEY, v.trim())
    } catch {}
  },
)

/** The converter page for a link, or '' if none is set. */
export function converterPageFor(link: string) {
  const tpl = webSettings.converterUrl.trim()
  if (!tpl) return ''
  return tpl.includes('{url}') ? tpl.replaceAll('{url}', encodeURIComponent(link.trim())) : tpl
}

// ---------------------------------------------------------------------------
// The hook

export interface ImportHints {
  /** Where the song came from (the page or link). Saved with the song. */
  sourceUrl?: string
  /** Used when the file has no title tag, e.g. the web page's title. "Artist - Title" is split up. */
  title?: string
  /** Used when the file has no artist tag. */
  artist?: string
  /** Used when the file has no album tag. */
  album?: string
  /** Cover used when the file has no embedded art: an image Blob, or an image URL (fetched; needs CORS). */
  cover?: Blob | string
  /** File name to use when `file` is a Blob without one, e.g. "song.mp3". Helps detect the format. */
  fileName?: string
  /** Show the review screen before saving (default true). With false the song is saved right away. */
  review?: boolean
}

export type ImportResult =
  | { status: 'added'; song: Song }
  | { status: 'duplicate'; song: Song }
  | { status: 'cancelled' }
  | { status: 'failed'; reason: string }

/** A song read from a file, waiting for the person to confirm its details. */
export interface Draft {
  key: number
  read: AudioRead
  fileName: string
  sourceUrl: string
  /** Editable on the review screen. */
  title: string
  artist: string
  album: string
  track: number
  /** The cover that will be saved; null for none. */
  cover: Blob | null
  coverUrl: string
  /** Which details were read from the file itself (the rest are guesses). */
  fromTags: { title: boolean; artist: boolean; album: boolean; cover: boolean }
  resolve: (r: ImportResult) => void
}

/** Songs waiting on the review screen, oldest first. */
export const reviewQueue = reactive<Draft[]>([])
let nextKey = 1

/**
 * Adds one audio file to the library.
 *
 * Reads its tags and cover, fills anything missing from `hints` and the file name, then (by default)
 * opens the review screen so the person can fix title, artist, album and cover before it is saved.
 * Resolves once the song is saved, turned out to be a duplicate, was discarded, or could not be read.
 * It never throws.
 *
 * @example
 *   const blob = await myConverter(link)          // your code
 *   const result = await importFromBlob(blob, { sourceUrl: link, title: pageTitle, fileName: 'song.mp3' })
 *   if (result.status === 'failed') alert(result.reason)
 */
export async function importFromBlob(file: Blob, hints: ImportHints = {}): Promise<ImportResult> {
  try {
    const named = asFile(file, hints.fileName || (file instanceof File ? '' : tidyTitle(hints.title?.trim() || '').replace(/[\\/:*?"<>|]/g, '')))
    navigator.storage?.persist?.().catch(() => {})
    const read = await readAudio(named)
    const draft = await makeDraft(read, named.name, hints)
    if (hints.review === false) return await saveDraft(draft)
    return await new Promise<ImportResult>((resolve) => {
      reviewQueue.push({ ...draft, resolve })
      openReview()
    })
  } catch (e) {
    if (e instanceof ImportError) {
      if (e.reason === 'duplicate' && e.existing) return { status: 'duplicate', song: e.existing }
      return { status: 'failed', reason: e.message }
    }
    console.error('Import failed', e)
    return { status: 'failed', reason: (e as Error)?.name === 'QuotaExceededError' ? 'Not enough storage space' : 'Could not read this file' }
  }
}

function openReview() {
  if (router.currentRoute.value.name !== 'review') router.push({ name: 'review' })
}

/** Gives a Blob a usable name and type so the format can be detected. */
function asFile(blob: Blob, fileName?: string): File {
  let name = fileName || (blob instanceof File ? blob.name : '') || 'Untitled'
  const type = blob.type.split(';')[0].trim().toLowerCase()
  if (!MIME[extOf(name)] || !name.includes('.')) {
    const ext = EXT_FOR_TYPE[type]
    if (ext) name = `${name.replace(/\.[^./]{1,5}$/, '')}.${ext}`
  }
  if (blob instanceof File && blob.name === name) return blob
  return new File([blob], name, { type: blob.type, lastModified: Date.now() })
}

const EXT_FOR_TYPE: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/webm': 'weba',
}

async function makeDraft(read: AudioRead, fileName: string, hints: ImportHints) {
  const c = read.common
  const tagTitle = c?.title?.trim() || ''
  const tagArtist = c?.artist?.trim() || c?.albumartist?.trim() || ''
  const tagAlbum = c?.album?.trim() || ''

  // Best guess for what is missing: the hints first, then the file name. Both often look like
  // "Artist - Title (Official Video)", so tidy them and split off the artist.
  const fromName = fromFileName(fileName)
  const guess = splitArtist(tidyTitle(hints.title?.trim() || ''))
  const nameGuess = splitArtist(tidyTitle(fromName.title))
  const usableName = !/^(untitled|download|audio|file|videoplayback)$/i.test(nameGuess.title)

  const title = tagTitle || guess.title || (usableName ? nameGuess.title : '') || 'Untitled'
  const artist = tagArtist || hints.artist?.trim() || guess.artist || (usableName ? nameGuess.artist : '') || UNKNOWN_ARTIST
  const album = tagAlbum || hints.album?.trim() || ''

  let cover = read.picture
  if (!cover && hints.cover) cover = await loadImage(hints.cover)

  return {
    key: nextKey++,
    read: markRaw(read),
    fileName,
    sourceUrl: hints.sourceUrl?.trim() || '',
    title,
    artist,
    album,
    track: c?.track?.no ?? fromName.track,
    cover,
    coverUrl: cover ? URL.createObjectURL(cover) : '',
    fromTags: { title: !!tagTitle, artist: !!tagArtist, album: !!tagAlbum, cover: !!read.picture },
    resolve: () => {},
  } satisfies Draft
}

/** Removes video-site clutter: "(Official Video)", "[Lyrics]", "HD", "320kbps", a trailing file extension. */
export function tidyTitle(s: string) {
  const junk = /\s*[([]\s*(official\s*)?(music\s*)?(video|audio|lyrics?|lyric\s*video|visuali[sz]er|hd|hq|4k|full\s*hd|1080p|720p|explicit|clean|\d{2,3}\s*kbps|audio\s*only|mp3|m4a)(\s*version)?\s*[)\]]/gi
  return s
    .replace(/\.(mp3|m4a|aac|flac|wav|ogg|opus|webm|mp4)$/i, '')
    .replace(junk, '')
    .replace(/\s*\|\s*.*$/, '') // "Song | Channel name"
    .replace(/_/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** "Artist - Title" -> { artist, title }. */
export function splitArtist(s: string) {
  const m = s.match(/^(.+?)\s+[-–—]\s+(.+)$/)
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '', title: s }
}

async function loadImage(src: Blob | string): Promise<Blob | null> {
  try {
    const blob = typeof src === 'string' ? await (await fetch(src)).blob() : src
    return blob.type.startsWith('image/') ? blob : null
  } catch {
    return null
  }
}

async function saveDraft(d: Omit<Draft, 'resolve'>): Promise<ImportResult> {
  // The same file may have been added meanwhile, e.g. shared twice.
  const existing = songsById.value.get(d.read.id)
  if (existing) return { status: 'duplicate', song: existing }
  const coverId = d.cover ? await storeCover(d.cover) : ''
  const artist = d.artist.trim() || UNKNOWN_ARTIST
  const song = makeSong(d.read, d.fileName, {
    title: d.title.trim() || 'Untitled',
    artist,
    album: d.album.trim(),
    track: d.track,
    coverId,
    sourceUrl: d.sourceUrl,
  })
  // An album artist tag that was only a copy of the artist follows an edited artist.
  if (!d.read.common?.albumartist?.trim()) song.albumArtist = artist
  await store.putSong(song, d.read.audio)
  addSongToLibrary(song)
  if (d.coverUrl) URL.revokeObjectURL(d.coverUrl)
  return { status: 'added', song }
}

/** Saves the first song on the review screen with its edited details. */
export async function confirmDraft(d: Draft) {
  let result: ImportResult
  try {
    result = await saveDraft(d)
  } catch (e) {
    const full = (e as Error)?.name === 'QuotaExceededError'
    result = { status: 'failed', reason: full ? 'Not enough storage space' : 'Could not save this song' }
    console.error('Saving failed', e)
  }
  removeDraft(d)
  d.resolve(result)
  return result
}

export function discardDraft(d: Draft) {
  if (d.coverUrl) URL.revokeObjectURL(d.coverUrl)
  removeDraft(d)
  d.resolve({ status: 'cancelled' })
}

function removeDraft(d: Draft) {
  const i = reviewQueue.findIndex((x) => x.key === d.key)
  if (i >= 0) reviewQueue.splice(i, 1)
}

export function setDraftCover(d: Draft, image: Blob | null) {
  if (d.coverUrl) URL.revokeObjectURL(d.coverUrl)
  d.cover = image
  d.coverUrl = image ? URL.createObjectURL(image) : ''
}

// ---------------------------------------------------------------------------
// Direct links to audio files

/** Progress of the download or conversion shown on the "Add from web" screen. */
export const webJob = reactive({
  running: false,
  label: '',
  /** 0..1, or null when the size is unknown. */
  progress: null as number | null,
  loaded: 0,
  total: 0,
  error: '',
  /** What the "Add from web" screen shows; kept here so it survives a trip to the review screen. */
  link: '',
  sharedTitle: '',
  last: null as ImportResult | null,
})
let jobAbort: AbortController | null = null

export function cancelWebJob() {
  jobAbort?.abort()
}

/** True if the link looks like it points straight at an audio file (or a cloud share link we can turn into one). */
export function isDirectAudioLink(link: string) {
  try {
    const u = new URL(directDownloadUrl(link.trim()))
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    if (MIME[extOf(u.pathname)] && u.pathname.includes('.')) return true
    return /(^|\.)dropboxusercontent\.com$/.test(u.hostname) || u.hostname === 'drive.usercontent.google.com'
  } catch {
    return false
  }
}

/** Turns cloud share links into direct download links where the service allows it. */
export function directDownloadUrl(link: string) {
  let u: URL
  try {
    u = new URL(link)
  } catch {
    return link
  }
  // Dropbox: www.dropbox.com/...?dl=0 -> dl.dropboxusercontent.com/... (which also allows other sites to download).
  if (/(^|\.)dropbox\.com$/.test(u.hostname) && u.hostname !== 'dl.dropboxusercontent.com') {
    u.hostname = 'dl.dropboxusercontent.com'
    u.searchParams.delete('dl')
    return u.toString()
  }
  // Google Drive: drive.google.com/file/d/ID/view or open?id=ID -> the direct download address.
  if (u.hostname === 'drive.google.com') {
    const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? u.searchParams.get('id')
    if (id) return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`
  }
  return link
}

/**
 * Downloads a direct link to an audio file and imports it (with the review screen).
 * Shows progress in `webJob`. Never throws.
 */
export async function importFromUrl(link: string, hints: ImportHints = {}): Promise<ImportResult> {
  const blob = await runJob('Downloading', (signal) => downloadAudio(link, signal))
  if (!blob) return webJob.error ? { status: 'failed', reason: webJob.error } : { status: 'cancelled' }
  return importFromBlob(blob.file, { sourceUrl: link, ...hints, fileName: hints.fileName ?? blob.file.name })
}

/** Runs one download or conversion with progress; returns null on error (in webJob.error) or cancel. */
export async function runJob<T>(label: string, work: (signal: AbortSignal, progress: ProgressFn) => Promise<T>): Promise<T | null> {
  if (webJob.running) return null
  jobAbort = new AbortController()
  Object.assign(webJob, { running: true, label, progress: null, loaded: 0, total: 0, error: '' })
  const progress: ProgressFn = (fraction, text) => {
    webJob.progress = fraction == null ? null : Math.max(0, Math.min(1, fraction))
    if (text) webJob.label = text
  }
  try {
    return await work(jobAbort.signal, progress)
  } catch (e) {
    if (!jobAbort.signal.aborted) webJob.error = (e as Error)?.message || 'Something went wrong'
    return null
  } finally {
    webJob.running = false
    jobAbort = null
  }
}

export type ProgressFn = (fraction: number | null, label?: string) => void

async function downloadAudio(link: string, signal: AbortSignal): Promise<{ file: File }> {
  let url: URL
  try {
    url = new URL(directDownloadUrl(link.trim()))
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error()
  } catch {
    throw new Error('That is not a web link. It should start with https://')
  }
  if (!navigator.onLine) throw new Error('You are offline. Downloading needs internet.')

  let res: Response
  try {
    res = await fetch(url, { signal, credentials: 'omit', redirect: 'follow' })
  } catch (e) {
    if (signal.aborted) throw e
    // fetch only says "failed": almost always the site not allowing other sites to download (CORS).
    throw new Error("That site doesn't allow downloads from other apps. Download the file in your browser, then use \"Choose file\".")
  }
  if (!res.ok) throw new Error(res.status === 404 ? 'Nothing found at that link (404).' : res.status === 403 || res.status === 401 ? 'That link needs a sign-in or is private.' : `The site answered with an error (${res.status}).`)

  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (type.startsWith('text/html')) throw new Error('That link opens a web page, not an audio file. Use a direct link to the file, or open it in the converter.')
  if (type && !type.startsWith('audio/') && !type.startsWith('video/') && type !== 'application/octet-stream' && type !== 'binary/octet-stream')
    throw new Error(`That link is not an audio file (${type}).`)

  const total = Number(res.headers.get('content-length')) || 0
  webJob.total = total
  const chunks: Uint8Array[] = []
  if (res.body) {
    const reader = res.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      webJob.loaded += value.byteLength
      webJob.progress = total ? Math.min(webJob.loaded / total, 1) : null
    }
  } else {
    const buf = new Uint8Array(await res.arrayBuffer())
    chunks.push(buf)
    webJob.loaded = buf.byteLength
  }
  if (!webJob.loaded) throw new Error('The file at that link is empty.')

  const name = fileNameFrom(res, url)
  return { file: new File(chunks as BlobPart[], name, { type: type.startsWith('audio/') ? type : '' }) }
}

function fileNameFrom(res: Response, url: URL) {
  const cd = res.headers.get('content-disposition') || ''
  const star = cd.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)?.[1]
  const plain = cd.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1]
  try {
    if (star) return decodeURIComponent(star.trim().replace(/^"|"$/g, ''))
  } catch {}
  if (plain) return plain.trim()
  const last = new URL(res.url || url.href).pathname.split('/').filter(Boolean).pop() || 'download'
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}

// ---------------------------------------------------------------------------
// Converters (none built in)

export interface ConvertResult {
  /** The audio file. */
  file: Blob
  /** E.g. "Artist - Title.mp3". Helps detect the format when `file` is a Blob without a type. */
  fileName?: string
  title?: string
  artist?: string
  album?: string
  /** Cover image Blob, or an image URL (fetched; needs CORS). */
  cover?: Blob | string
}

export interface Converter {
  /** Shown on the button: "Convert with <name>". */
  name: string
  /** Return true for links this converter can turn into audio. */
  canHandle(link: string): boolean
  /**
   * Turns the link into an audio file. Call `progress(0..1 or null, "label")` as it goes, and stop
   * when `signal` aborts (the person pressed Cancel). Throw an Error with a readable message to fail.
   */
  convert(link: string, ctx: { signal: AbortSignal; progress: ProgressFn }): Promise<ConvertResult>
}

export const converters = ref<Converter[]>([])

export function registerConverter(c: Converter) {
  converters.value = [...converters.value.filter((x) => x.name !== c.name), c]
}

export function converterFor(link: string) {
  const l = link.trim()
  if (!l) return undefined
  return converters.value.find((c) => {
    try {
      return c.canHandle(l)
    } catch {
      return false
    }
  })
}

/** Runs a registered converter on a link and imports the result. Never throws. */
export async function convertAndImport(c: Converter, link: string): Promise<ImportResult> {
  const out = await runJob(`Converting with ${c.name}`, (signal, progress) => c.convert(link.trim(), { signal, progress }))
  if (!out) return webJob.error ? { status: 'failed', reason: webJob.error } : { status: 'cancelled' }
  return importFromBlob(out.file, { sourceUrl: link.trim(), title: out.title, artist: out.artist, album: out.album, cover: out.cover, fileName: out.fileName })
}

// ---------------------------------------------------------------------------
// Files shared from other apps (Android share menu; see public/share-target.js)

export const SHARE_CACHE = 'mymusic-shared'

/** Takes the files the service worker parked from a share and imports them one after another. */
export async function takeSharedFiles(): Promise<number> {
  if (!('caches' in window)) return 0
  const cache = await caches.open(SHARE_CACHE)
  const keys = await cache.keys()
  const files: { file: File; title: string }[] = []
  for (const req of keys) {
    const res = await cache.match(req)
    await cache.delete(req)
    if (!res) continue
    const name = decodeURIComponent(res.headers.get('x-file-name') || '') || 'Shared file'
    const title = decodeURIComponent(res.headers.get('x-share-title') || '')
    const blob = await res.blob()
    files.push({ file: new File([blob], name, { type: res.headers.get('content-type') || blob.type }), title })
  }
  // One review at a time, in the order they were shared. A title only helps when one file was shared.
  void (async () => {
    for (const f of files) await importFromBlob(f.file, { title: files.length === 1 ? f.title : undefined })
  })()
  return files.length
}

/** Pulls the first link out of shared text: "Great song https://example.com/x" -> link + the rest. */
export function linkFromText(text: string) {
  const m = text.match(/https?:\/\/[^\s<>"']+/i)
  if (!m) return { link: '', rest: text.trim() }
  return { link: m[0].replace(/[).,]+$/, ''), rest: text.replace(m[0], '').trim() }
}
