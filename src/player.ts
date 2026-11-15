import { computed, reactive, watch } from 'vue'
import * as store from './db'
import { coverUrls, songsById } from './library'

export type Repeat = 'off' | 'all' | 'one'

export interface QueueItem {
  uid: number
  id: string
  /** Put here with "Play next" / "Add to queue" rather than by the album or list being played. */
  added?: boolean
}

export interface PlayContext {
  kind: string
  label: string
}

interface Saved {
  queue: { id: string; added?: boolean }[]
  index: number
  time: number
  shuffle: boolean
  repeat: Repeat
  context: PlayContext | null
  order: string[]
  volume?: number
  muted?: boolean
}

export const player = reactive({
  queue: [] as QueueItem[],
  index: -1,
  playing: false,
  time: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off' as Repeat,
  context: null as PlayContext | null,
  /** The list being played in its original order, so shuffle can be switched off again. */
  order: [] as string[],
  error: '',
  volume: 1,
  muted: false,
})

export const current = computed(() => {
  const item = player.queue[player.index]
  return item ? songsById.value.get(item.id) : undefined
})
export const upNext = computed(() => player.queue.slice(player.index + 1))

const audio = new Audio()
audio.preload = 'auto'

let uid = 1
const item = (id: string, added = false): QueueItem => ({ uid: uid++, id, added: added || undefined })

function shuffled<T>(list: T[]) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---- audio files -------------------------------------------------------
// Blob URLs for the current and the next song. The next one is prepared ahead of
// time so moving on at the end of a song needs no waiting, which matters when the
// phone is locked and the browser gives the page very little time to act.
const urls = new Map<string, string>()

async function urlFor(id: string) {
  let url = urls.get(id)
  if (!url) {
    const blob = await store.getAudio(id)
    if (!blob) throw new Error('missing audio')
    url = urls.get(id) ?? URL.createObjectURL(blob)
    urls.set(id, url)
  }
  return url
}

function nextIndex(auto: boolean) {
  const i = player.index + 1
  if (i < player.queue.length) return i
  return player.repeat === 'all' || !auto ? 0 : -1
}

function prepareNeighbours() {
  const keep = new Set<string>()
  const cur = player.queue[player.index]
  if (cur) keep.add(cur.id)
  const n = player.queue[nextIndex(true)]
  if (n) {
    keep.add(n.id)
    urlFor(n.id).catch(() => {})
  }
  for (const [id, url] of urls) {
    if (!keep.has(id)) {
      URL.revokeObjectURL(url)
      urls.delete(id)
    }
  }
}

let loadToken = 0
let failures = 0

async function load(index: number, autoplay: boolean, startAt = 0) {
  const token = ++loadToken
  player.index = index
  player.time = startAt
  const q = player.queue[index]
  const song = q && songsById.value.get(q.id)
  if (!song) {
    audio.removeAttribute('src')
    audio.load()
    player.playing = false
    player.duration = 0
    return
  }
  player.duration = song.duration
  updateMetadata()
  try {
    const ready = urls.get(q.id)
    const url = ready ?? (await urlFor(q.id))
    if (token !== loadToken) return
    audio.src = url
    if (startAt) audio.currentTime = startAt
    if (autoplay) await audio.play()
    failures = 0
  } catch (e) {
    if (token !== loadToken || (e as Error).name === 'AbortError') return
    if ((e as Error).name === 'NotAllowedError') {
      player.playing = false
      return
    }
    onLoadFailed(autoplay)
    return
  }
  prepareNeighbours()
  save()
}

function onLoadFailed(autoplay: boolean) {
  const title = current.value?.title ?? 'a song'
  player.error = `Could not play "${title}"`
  failures++
  const n = nextIndex(true)
  if (autoplay && n >= 0 && failures < 3) load(n, true)
  else player.playing = false
}

audio.addEventListener('play', () => (player.playing = true))
audio.addEventListener('pause', () => {
  player.playing = false
  save()
})
audio.addEventListener('timeupdate', () => {
  player.time = audio.currentTime
  if (Date.now() - lastSave > 5000) save()
})
audio.addEventListener('durationchange', () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) player.duration = audio.duration
  updatePosition()
})
audio.addEventListener('seeked', updatePosition)
audio.addEventListener('ended', () => {
  if (player.repeat === 'one') {
    audio.currentTime = 0
    audio.play().catch(() => {})
    return
  }
  const n = nextIndex(true)
  if (n < 0) {
    // End of the list: go back to the first song and wait.
    load(0, false)
    return
  }
  if (n === 0 && player.shuffle) reshuffleAll()
  load(n, true)
})
audio.addEventListener('error', () => {
  if (audio.src && player.queue[player.index]) onLoadFailed(player.playing || !audio.paused)
})

// ---- controls ----------------------------------------------------------

export function playList(ids: string[], start: number, context: PlayContext, opts: { shuffle?: boolean } = {}) {
  if (!ids.length) return
  if (opts.shuffle !== undefined) player.shuffle = opts.shuffle
  player.order = [...ids]
  player.context = context
  if (player.shuffle) {
    const first = opts.shuffle ? Math.floor(Math.random() * ids.length) : start
    const rest = shuffled(ids.filter((_, i) => i !== first))
    player.queue = [ids[first], ...rest].map((id) => item(id))
    load(0, true)
  } else {
    player.queue = ids.map((id) => item(id))
    load(start, true)
  }
}

export function toggle() {
  if (!current.value) return
  if (!audio.paused) {
    audio.pause()
  } else if (audio.src) {
    audio.play().catch(() => {})
  } else {
    load(player.index, true, player.time)
  }
}

export function next() {
  if (!player.queue.length) return
  load(nextIndex(false), true)
}

export function previous() {
  if (!player.queue.length) return
  if (audio.currentTime > 3 || (player.index === 0 && player.repeat !== 'all')) {
    seek(0)
    if (audio.paused && audio.src) audio.play().catch(() => {})
    return
  }
  load(player.index > 0 ? player.index - 1 : player.queue.length - 1, true)
}

export function seek(sec: number) {
  const t = Math.max(0, Math.min(sec, player.duration || sec))
  player.time = t
  if (audio.src) audio.currentTime = t
}

export function jumpTo(index: number) {
  if (player.queue[index]) load(index, true)
}

/** Where "Add to queue" items go: after the songs already added by hand, before the rest of the list. */
function endOfAdded() {
  let i = player.index + 1
  while (player.queue[i]?.added) i++
  return i
}

export function playNext(ids: string[]) {
  enqueue(ids, player.index + 1)
}

export function addToQueue(ids: string[]) {
  enqueue(ids, endOfAdded())
}

function enqueue(ids: string[], at: number) {
  if (!ids.length) return
  if (!player.queue.length) {
    playList(ids, 0, { kind: 'queue', label: 'Queue' })
    return
  }
  player.queue.splice(at, 0, ...ids.map((id) => item(id, true)))
  prepareNeighbours()
  save()
}

export function removeAt(index: number) {
  if (index <= player.index || !player.queue[index]) return
  player.queue.splice(index, 1)
  prepareNeighbours()
  save()
}

export function clearUpNext() {
  player.queue.splice(player.index + 1)
  prepareNeighbours()
  save()
}

function reshuffleAll() {
  player.queue = shuffled(player.queue.map((q) => q.id)).map((id) => item(id))
}

export function toggleShuffle() {
  player.shuffle = !player.shuffle
  const cur = player.queue[player.index]
  if (cur) {
    const after = player.queue.slice(player.index + 1)
    const added = after.filter((q) => q.added)
    if (player.shuffle) {
      const rest = shuffled(after.filter((q) => !q.added))
      player.queue = [...player.queue.slice(0, player.index + 1), ...added, ...rest]
    } else {
      // Back to the original order, continuing from the song that is playing.
      const pos = player.order.indexOf(cur.id)
      const before = pos >= 0 ? player.order.slice(0, pos).map((id) => item(id)) : []
      const rest = player.order.slice(pos + 1).map((id) => item(id))
      player.queue = [...before, cur, ...added, ...rest]
      player.index = before.length
    }
    prepareNeighbours()
  }
  save()
}

export function cycleRepeat() {
  player.repeat = player.repeat === 'off' ? 'all' : player.repeat === 'all' ? 'one' : 'off'
  prepareNeighbours()
  save()
}

/** Called after songs are deleted from the library. */
export function dropSongs(ids: string[]) {
  const gone = new Set(ids)
  const cur = player.queue[player.index]
  const curGone = !!cur && gone.has(cur.id)
  const wasPlaying = player.playing
  const before = player.queue.slice(0, player.index).filter((q) => !gone.has(q.id)).length
  player.queue = player.queue.filter((q) => !gone.has(q.id))
  player.order = player.order.filter((id) => !gone.has(id))
  if (!player.queue.length) {
    stop()
  } else if (curGone) {
    load(Math.min(before, player.queue.length - 1), wasPlaying)
  } else {
    player.index = before
    prepareNeighbours()
    save()
  }
}

export function stop() {
  loadToken++
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
  Object.assign(player, { queue: [], index: -1, playing: false, time: 0, duration: 0, context: null, order: [] })
  prepareNeighbours()
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = null
  save()
}

/** 0 to 1. Phones usually ignore this and use their own volume buttons. */
export function setVolume(v: number) {
  player.volume = Math.round(Math.min(1, Math.max(0, v)) * 100) / 100
  player.muted = false
  audio.volume = player.volume
  audio.muted = false
  save()
}

export function toggleMute() {
  player.muted = !player.muted
  audio.muted = player.muted
  save()
}

// ---- lock screen / headphone buttons -----------------------------------

function updateMetadata() {
  if (!('mediaSession' in navigator)) return
  const s = current.value
  if (!s) return
  const art = coverUrls.get(s.coverId)
  navigator.mediaSession.metadata = new MediaMetadata({
    title: s.title,
    artist: s.artist,
    album: s.album,
    artwork: art ? [{ src: art, sizes: '512x512', type: 'image/jpeg' }] : [],
  })
}

function updatePosition() {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return
  const d = audio.duration
  if (!Number.isFinite(d) || d <= 0) return
  try {
    navigator.mediaSession.setPositionState({ duration: d, position: Math.min(audio.currentTime, d), playbackRate: 1 })
  } catch {
    /* some browsers reject odd values; the lock screen then just shows no progress */
  }
}

if ('mediaSession' in navigator) {
  const on = (action: MediaSessionAction, fn: MediaSessionActionHandler) => {
    try {
      navigator.mediaSession.setActionHandler(action, fn)
    } catch {
      /* action not supported here */
    }
  }
  on('play', () => toggle())
  on('pause', () => audio.pause())
  on('nexttrack', () => next())
  on('previoustrack', () => previous())
  on('seekto', (d) => d.seekTime != null && seek(d.seekTime))
  watch(
    () => player.playing,
    (p) => (navigator.mediaSession.playbackState = p ? 'playing' : 'paused'),
  )
}

// ---- remember where we were --------------------------------------------

let lastSave = 0
let restored = false

function save() {
  if (!restored) return
  lastSave = Date.now()
  const data: Saved = {
    queue: player.queue.map((q) => ({ id: q.id, added: q.added })),
    index: player.index,
    time: player.time,
    shuffle: player.shuffle,
    repeat: player.repeat,
    context: player.context && { ...player.context },
    order: [...player.order],
    volume: player.volume,
    muted: player.muted,
  }
  store.kvSet('player', data).catch(() => {})
}

/** Brings back the last song, position and queue. Call once the library is loaded. */
export async function restorePlayer() {
  const saved = await store.kvGet<Saved>('player').catch(() => undefined)
  restored = true
  if (saved && typeof saved.volume === 'number') {
    player.volume = audio.volume = saved.volume
    player.muted = audio.muted = !!saved.muted
  }
  if (!saved?.queue?.length) {
    if (saved) Object.assign(player, { shuffle: !!saved.shuffle, repeat: saved.repeat ?? 'off' })
    return
  }
  const have = songsById.value
  const curId = saved.queue[saved.index]?.id
  const queue = saved.queue.filter((q) => have.has(q.id)).map((q) => item(q.id, q.added))
  if (!queue.length) return
  let index = saved.queue.slice(0, saved.index).filter((q) => have.has(q.id)).length
  const same = queue[index]?.id === curId
  if (index >= queue.length) index = 0
  player.queue = queue
  player.index = index
  player.shuffle = !!saved.shuffle
  player.repeat = saved.repeat ?? 'off'
  player.context = saved.context ?? null
  player.order = (saved.order ?? []).filter((id) => have.has(id))
  player.time = same ? saved.time || 0 : 0
  player.duration = current.value?.duration ?? 0
  updateMetadata()
}

addEventListener('pagehide', save)
document.addEventListener('visibilitychange', () => document.hidden && save())
