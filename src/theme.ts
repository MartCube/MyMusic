import { reactive, watch } from 'vue'

export type Mode = 'dark' | 'light' | 'system'

/** Each accent has a bright shade for the dark theme and a deeper one that stays readable on the light theme. */
export const ACCENTS = [
  { id: 'ember', name: 'Ember', dark: '#FF5B1F', light: '#C2410C' },
  { id: 'amber', name: 'Amber', dark: '#FFC21A', light: '#8F6500' },
  { id: 'mint', name: 'Mint', dark: '#2EE6A6', light: '#0B7A57' },
  { id: 'rose', name: 'Rose', dark: '#FF3D6E', light: '#C8103F' },
  { id: 'sky', name: 'Sky', dark: '#4DA3FF', light: '#1A5FC2' },
  { id: 'violet', name: 'Violet', dark: '#B18CFF', light: '#6B3FD1' },
] as const

const read = (key: string, ok: readonly string[], fallback: string) => {
  try {
    const v = localStorage.getItem(key)
    return v && ok.includes(v) ? v : fallback
  } catch {
    return fallback
  }
}

export const theme = reactive({
  mode: read('theme.mode', ['dark', 'light', 'system'], 'dark') as Mode,
  accent: read('theme.accent', ACCENTS.map((a) => a.id), 'ember'),
  /** What is on screen right now once "system" is resolved. */
  effective: 'dark' as 'dark' | 'light',
})

const prefersLight = matchMedia('(prefers-color-scheme: light)')

function apply() {
  theme.effective = theme.mode === 'system' ? (prefersLight.matches ? 'light' : 'dark') : theme.mode
  const a = ACCENTS.find((x) => x.id === theme.accent) ?? ACCENTS[0]
  const root = document.documentElement
  root.dataset.theme = theme.effective
  root.style.setProperty('--accent', theme.effective === 'light' ? a.light : a.dark)
  root.style.setProperty('--on-accent', theme.effective === 'light' ? '#FFFFFF' : '#141414')
  const bg = theme.effective === 'light' ? '#F5F5F3' : '#141414'
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', bg)
  try {
    localStorage.setItem('theme.mode', theme.mode)
    localStorage.setItem('theme.accent', theme.accent)
  } catch {
    /* private mode: the choice just lasts for this visit */
  }
}

export function initTheme() {
  apply()
  prefersLight.addEventListener('change', apply)
  watch(() => [theme.mode, theme.accent], apply)
}
