<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { albums, coverUrls, musicBytes, removeEverything, songs } from '../library'
import { stop } from '../player'
import { nearlyFull, refreshStorage, requestProtection, storage } from '../storage'
import { confirmSheet, toast } from '../ui'
import { fmtBytes, plural } from '../format'
import Icon from '../components/Icon.vue'

const total = computed(() => storage.used + storage.free)
const musicPct = computed(() => (total.value ? (musicBytes.value / total.value) * 100 : 0))
const otherPct = computed(() => (total.value ? (Math.max(storage.used - musicBytes.value, 0) / total.value) * 100 : 0))

async function protect() {
  if (storage.protected) return toast('Already protected')
  if (await requestProtection()) toast('Your music is protected')
  else toast('The browser said no. Install the app to the home screen, then try again.')
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
            {{ storage.protected ? 'The browser will not clear the library on its own' : 'Ask the browser not to clear the library' }}
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

    <p class="muted" style="font-size: 12px; line-height: 1.45">MyMusic keeps everything on this device. Nothing is uploaded or shared.</p>
  </main>
</template>
