<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { albums, coverUrls, musicBytes, removeEverything, songs } from '../library'
import { stop } from '../player'
import { nearlyFull, refreshStorage, requestProtection, storage } from '../storage'
import { confirmSheet, openSheet, toast, ui } from '../ui'
import { fmtBytes, plural } from '../format'
import { ACCENTS, theme, type Mode } from '../theme'
import Icon from '../components/Icon.vue'

const total = computed(() => storage.used + storage.free)
const musicPct = computed(() => (total.value ? (musicBytes.value / total.value) * 100 : 0))
const otherPct = computed(() => (total.value ? (Math.max(storage.used - musicBytes.value, 0) / total.value) * 100 : 0))

// The browser decides this on its own and gives no reason when it says no. Chromium browsers
// (Chrome, Brave, Edge) usually only agree once the app is installed or the site is bookmarked.
const protectDenied = ref(false)
async function protect() {
  if (storage.protected) {
    openSheet({
      title: 'Your music is protected',
      text: 'The browser has agreed not to clear the library on its own. This cannot be switched off from here; it ends only if you clear this site\'s data in the browser.',
      actions: [],
    })
    return
  }
  if (!navigator.storage?.persist) {
    protectDenied.value = true
    openSheet({
      title: 'Not supported in this browser',
      text: 'This browser has no way to protect stored data. Your music is still saved and plays offline. The browser would only remove it if the device runs very low on space.',
      actions: [],
    })
    return
  }
  if (await requestProtection()) {
    protectDenied.value = false
    toast('Your music is protected')
    return
  }
  protectDenied.value = true
  const steps = standalone
    ? 'Open MyMusic a few more times and try again; browsers allow this for apps you use regularly.'
    : isIos
      ? 'In Safari, tap Share, then "Add to Home Screen", open MyMusic from the home screen, and try again.'
      : 'Install MyMusic as an app (the install icon in the address bar, or the browser menu) or bookmark this page, then try again.'
  openSheet({
    title: 'The browser did not allow this yet',
    text: `Your music is still saved and plays offline. Without protection, the browser may remove it only if the device runs very low on space. ${steps}`,
    actions: installEvent.value ? [{ label: 'Install MyMusic now', run: install }] : [],
  })
}

async function deleteAll() {
  const ok = await confirmSheet(
    'Delete all music?',
    `All ${plural(songs.value.length, 'song')} are removed from MyMusic on this device. Your original files are not touched, but you would need to import them again.`,
    'Delete all music',
  )
  if (!ok) return
  stop()
  await removeEverything()
  await refreshStorage()
  toast('Library deleted')
}

// Install: Android and desktop Chrome offer a prompt; on iPhone it is done from the Share menu.
const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent)
const installEvent = ref<(Event & { prompt: () => Promise<unknown> }) | null>((window as any).__installPrompt ?? null)
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  installEvent.value = e as any
})
async function install() {
  await installEvent.value?.prompt()
  installEvent.value = null
}

const build = __BUILD__
const checking = ref(false)
async function checkForUpdate() {
  if (!navigator.onLine) return toast('You are offline. Updates need internet.')
  checking.value = true
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    await reg?.update()
    // A found update shows the "new version is ready" bar once it has finished downloading.
    if (!reg?.installing && !reg?.waiting && !ui.update) toast('You have the latest version')
    else if (!ui.update) toast('Downloading the new version…')
  } catch {
    toast('Could not check for updates')
  }
  checking.value = false
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'system', label: 'System' },
]
const swatch = (a: (typeof ACCENTS)[number]) => (theme.effective === 'light' ? a.light : a.dark)
const hasKeyboard = matchMedia('(pointer: fine)').matches

onMounted(refreshStorage)
</script>

<template>
  <main class="page" style="gap: 20px">
    <h1 class="title">Settings</h1>

    <div class="card">
      <div class="between" style="align-items: baseline">
        <div style="font-size: 16px; font-weight: 700">Storage on this device</div>
        <div v-if="storage.known" class="small muted">{{ fmtBytes(storage.free) }} free</div>
      </div>
      <div v-if="storage.known" class="bar" style="height: 10px; border-radius: 5px">
        <span :style="{ width: musicPct + '%', borderRadius: 0 }" /><span class="white" :style="{ width: otherPct + '%', borderRadius: 0 }" />
      </div>
      <div class="legend">
        <span><i />Music {{ fmtBytes(musicBytes) }}</span>
        <span v-if="storage.known"><i class="white" />Covers and app {{ fmtBytes(Math.max(storage.used - musicBytes, 0)) }}</span>
      </div>
      <div class="small muted">{{ plural(songs.length, 'song') }} · {{ plural(albums.length, 'album') }} · {{ plural(coverUrls.size, 'cover') }}</div>
      <div v-if="nearlyFull()" class="notice" role="alert">Storage is almost full. Free up space on this device before importing more music.</div>
      <div class="row" style="padding-top: 12px; border-top: 1px solid var(--track)">
        <div class="grow">
          <div style="font-weight: 500">Protect my music</div>
          <div class="muted" style="font-size: 12px; margin-top: 2px">
            {{ storage.protected ? 'The browser will not clear the library on its own' : protectDenied ? 'Not allowed by the browser yet. Tap to see what to do.' : 'Ask the browser not to clear the library' }}
          </div>
        </div>
        <button class="toggle" aria-label="Protect my music" :aria-pressed="storage.protected" @click="protect"><span /></button>
      </div>
    </div>

    <section v-if="!standalone && (installEvent || isIos)" class="section" style="gap: 8px">
      <h2 class="label">Install</h2>
      <div class="list-card">
        <button v-if="installEvent" @click="install"><span class="grow">Install MyMusic as an app</span><Icon name="right" :size="18" /></button>
        <div v-else style="font-size: 14px; line-height: 1.45; padding: 14px 16px">In Safari, tap Share, then "Add to Home Screen". MyMusic then opens like an app and keeps your music safer.</div>
      </div>
    </section>

    <section class="section" style="gap: 8px">
      <h2 class="label">Library</h2>
      <div class="list-card">
        <RouterLink :to="{ name: 'import' }"><span class="grow">Import music</span><Icon name="right" :size="18" /></RouterLink>
        <button class="danger" :disabled="!songs.length" @click="deleteAll">Delete all music from this device</button>
      </div>
    </section>

    <section class="section" style="gap: 8px">
      <h2 class="label">Appearance</h2>
      <div class="card">
        <div class="segmented" role="radiogroup" aria-label="Theme">
          <button v-for="m in MODES" :key="m.id" role="radio" :aria-checked="theme.mode === m.id" :aria-selected="theme.mode === m.id" @click="theme.mode = m.id">{{ m.label }}</button>
        </div>
        <div class="small muted">{{ theme.mode === 'system' ? `Follows your device, now ${theme.effective}.` : 'Accent colour' }}</div>
        <div class="swatches" role="radiogroup" aria-label="Accent colour">
          <button
            v-for="a in ACCENTS"
            :key="a.id"
            class="swatch"
            role="radio"
            :aria-checked="theme.accent === a.id"
            :aria-pressed="theme.accent === a.id"
            :aria-label="a.name"
            :title="a.name"
            :style="{ background: swatch(a) }"
            @click="theme.accent = a.id"
          >
            <Icon v-if="theme.accent === a.id" name="check" :size="18" />
          </button>
        </div>
      </div>
    </section>

    <section class="section" style="gap: 8px">
      <h2 class="label">App</h2>
      <div class="list-card">
        <RouterLink :to="{ name: 'shortcuts' }"><span class="grow">Keyboard shortcuts</span><span v-if="hasKeyboard" class="small muted">Press ?</span><Icon name="right" :size="18" /></RouterLink>
        <button v-if="ui.update" style="color: var(--accent); font-weight: 700" @click="ui.update()"><span class="grow">Update is ready. Reload now</span><Icon name="refresh" :size="18" /></button>
        <button v-else :disabled="checking" @click="checkForUpdate"><span class="grow">Check for updates</span><span class="small muted">{{ checking ? 'Checking…' : 'Version ' + build }}</span></button>
      </div>
      <div class="muted" style="font-size: 12px; line-height: 1.45">The app updates itself when you open it with internet. Updating never touches your music or playlists.</div>
    </section>

    <p class="muted" style="font-size: 12px; line-height: 1.45">MyMusic keeps everything on this device. Nothing is uploaded or shared.</p>
  </main>
</template>
