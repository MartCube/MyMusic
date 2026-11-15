import type { Router } from 'vue-router'
import { current, cycleRepeat, next, player, previous, seek, setVolume, toggle, toggleMute, toggleShuffle } from './player'
import { dismissSheet, toast, ui } from './ui'
import { goBack } from './router'

export interface Shortcut {
  /** How the keys are shown, e.g. ['Shift', '→']. Alternatives are separate entries in `keys`. */
  keys: string[][]
  label: string
  group: 'Playback' | 'Go to' | 'Anywhere'
}

/** The list shown on Settings › Keyboard shortcuts. Keep it in step with `handle` below. */
export const SHORTCUTS: Shortcut[] = [
  { group: 'Playback', keys: [['Space'], ['Enter']], label: 'Play or pause' },
  { group: 'Playback', keys: [['→']], label: 'Forward 5 seconds' },
  { group: 'Playback', keys: [['←']], label: 'Back 5 seconds' },
  { group: 'Playback', keys: [['Shift', '→'], ['N']], label: 'Next song' },
  { group: 'Playback', keys: [['Shift', '←'], ['B']], label: 'Previous song' },
  { group: 'Playback', keys: [['↑']], label: 'Volume up' },
  { group: 'Playback', keys: [['↓']], label: 'Volume down' },
  { group: 'Playback', keys: [['M']], label: 'Mute or unmute' },
  { group: 'Playback', keys: [['S']], label: 'Shuffle on or off' },
  { group: 'Playback', keys: [['R']], label: 'Repeat: off, all, one' },
  { group: 'Go to', keys: [['P']], label: 'Open or close Now playing' },
  { group: 'Go to', keys: [['Q']], label: 'Up next queue' },
  { group: 'Go to', keys: [['1']], label: 'Library' },
  { group: 'Go to', keys: [['/'], ['2']], label: 'Search' },
  { group: 'Go to', keys: [['3']], label: 'Settings' },
  { group: 'Go to', keys: [['I']], label: 'Import music' },
  { group: 'Anywhere', keys: [['Esc']], label: 'Close a menu, close the player, or go back' },
  { group: 'Anywhere', keys: [['?']], label: 'This list of shortcuts' },
]

const ROOTS = new Set(['library', 'search', 'settings', 'import'])
const typing = (el: HTMLElement) => /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable
// Buttons and links act on Enter themselves; Enter only plays or pauses when nothing like that has focus.
const activatable = (el: HTMLElement) => !!el.closest('button, a, [role=tab], summary')

export function installShortcuts(router: Router) {
  const route = () => router.currentRoute.value
  const playerOpen = () => !!route().query.np && !!current.value
  const openPlayer = (view: '1' | 'queue') => router.push({ query: { ...route().query, np: view } })
  const closePlayer = () => (window.history.state?.back ? router.back() : router.replace({ query: {} }))
  const go = (name: string) => {
    if (route().name === name && !playerOpen()) return
    router.push({ name })
  }

  function escape(el: HTMLElement) {
    if (ui.sheet) return dismissSheet()
    if (typing(el)) return el.blur()
    if (playerOpen()) return closePlayer()
    if (!ROOTS.has(String(route().name)) || route().name === 'import') return goBack()
  }

  addEventListener('keydown', (e) => {
    const el = (e.target as HTMLElement) ?? document.body
    if (e.key === 'Escape') {
      e.preventDefault()
      return escape(el)
    }
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || typing(el)) return
    // A menu is open: let it handle its own keys (Tab, Enter on its buttons).
    if (ui.sheet) return

    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
    const has = !!current.value
    const act = (fn: () => void, needsSong = true) => {
      if (needsSong && !has) return
      e.preventDefault()
      fn()
    }

    switch (key) {
      case ' ':
        return act(toggle)
      case 'Enter':
        if (!activatable(el)) act(toggle)
        return
      case 'ArrowRight':
        return act(() => (e.shiftKey ? next() : seek(player.time + 5)))
      case 'ArrowLeft':
        return act(() => (e.shiftKey ? previous() : seek(player.time - 5)))
      case 'ArrowUp':
        return act(() => (setVolume(player.volume + 0.1), toast(`Volume ${Math.round(player.volume * 100)}%`)), false)
      case 'ArrowDown':
        return act(() => (setVolume(player.volume - 0.1), toast(`Volume ${Math.round(player.volume * 100)}%`)), false)
      case 'n':
        return act(next)
      case 'b':
        return act(previous)
      case 'm':
        return act(() => (toggleMute(), toast(player.muted ? 'Muted' : 'Sound on')), false)
      case 's':
        return act(() => (toggleShuffle(), toast(player.shuffle ? 'Shuffle on' : 'Shuffle off')), false)
      case 'r':
        return act(() => (cycleRepeat(), toast({ off: 'Repeat off', all: 'Repeat all', one: 'Repeat one song' }[player.repeat])), false)
      case 'p':
        return act(() => (playerOpen() ? closePlayer() : openPlayer('1')))
      case 'q':
        return act(() => (route().query.np === 'queue' ? closePlayer() : openPlayer('queue')))
      case '/':
      case '2':
        return act(() => go('search'), false)
      case '1':
        return act(() => go('library'), false)
      case '3':
        return act(() => go('settings'), false)
      case 'i':
        return act(() => go('import'), false)
      case '?':
        return act(() => go('shortcuts'), false)
    }
  })
}
