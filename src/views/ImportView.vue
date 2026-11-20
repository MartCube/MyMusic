<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { ACCEPT, cancelImport, importFiles, importState as st } from '../importer'
import { musicBytes } from '../library'
import { nearlyFull, refreshStorage, storage } from '../storage'
import { goBack } from '../router'
import { fmtBytes, plural } from '../format'
import Icon from '../components/Icon.vue'

// Picking a whole folder works on desktop browsers and most Android ones, not on iPhone.
const canPickFolder = 'webkitdirectory' in document.createElement('input') && !/iPhone|iPad|iPod/.test(navigator.userAgent)

function picked(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  importFiles(files)
}

const pct = computed(() => (st.total ? Math.round((st.done / st.total) * 100) : 0))
const MARK = { reading: '…', added: '✓', duplicate: '=', skipped: '–', failed: '!' } as const
const summary = computed(() => {
  const parts = [`${plural(st.added, 'song')} added`]
  if (st.duplicates) parts.push(`${st.duplicates} already in library`)
  if (st.skipped) parts.push(`${st.skipped} not audio`)
  if (st.failed.length) parts.push(`${st.failed.length} failed`)
  return parts.join(' · ')
})
const usedPct = computed(() => (storage.known ? Math.min((musicBytes.value / (musicBytes.value + storage.free)) * 100, 100) : 0))

onMounted(refreshStorage)
watch(() => [st.done, st.running], () => (st.done % 10 === 0 || !st.running) && refreshStorage())
</script>

<template>
  <main class="page" style="gap: 20px">
    <div class="row">
      <button class="icon-btn" aria-label="Back" @click="goBack"><Icon name="back" :size="22" /></button>
      <h1 class="title-sm">Import music</h1>
    </div>

    <div class="pick">
      <label class="primary" :class="{ off: st.running }">
        <Icon name="note" :size="26" />
        <span>Choose files</span>
        <input type="file" multiple :accept="ACCEPT" :disabled="st.running" @change="picked" />
      </label>
      <label v-if="canPickFolder" :class="{ off: st.running }">
        <Icon name="folder" :size="26" />
        <span>Choose a folder</span>
        <input type="file" webkitdirectory multiple :disabled="st.running" @change="picked" />
      </label>
    </div>
    <RouterLink :to="{ name: 'web' }" class="list-card" :class="{ off: st.running }">
      <span class="row"><Icon name="link" :size="22" /><span class="grow" style="font-weight: 700">Add from web</span><Icon name="right" :size="18" /></span>
    </RouterLink>
    <p class="small muted" style="line-height: 1.5">
      MP3, M4A and AAC work everywhere. FLAC, WAV and OGG work where your browser supports them. Title, artist, album and cover are read from the files. The songs are copied into the app, so they play with no internet.
    </p>

    <div v-if="nearlyFull()" class="notice" role="alert">
      Storage is almost full: only {{ fmtBytes(storage.free) }} left for MyMusic on this device. Free up some space before importing more.
    </div>

    <div v-if="st.running || st.finished" class="card" aria-live="polite">
      <div class="between" style="align-items: baseline">
        <div style="font-size: 16px; font-weight: 700">
          <template v-if="st.running">Importing {{ Math.min(st.done + 1, st.total) }} of {{ st.total }}</template>
          <template v-else>{{ st.cancelled ? 'Import stopped' : 'Import finished' }}</template>
        </div>
        <div class="small muted num">{{ pct }}%</div>
      </div>
      <div class="bar"><span :style="{ width: pct + '%' }" /></div>
      <div v-if="st.finished" class="small">{{ summary }}</div>

      <div v-if="st.finished && st.failed.length" class="stack">
        <div class="label" style="padding: 4px 0 8px">Could not import</div>
        <div v-for="(f, i) in st.failed" :key="i" class="file-row">
          <span class="mark live">!</span>
          <span class="name ellipsis">{{ f.name }}</span>
          <span class="note">{{ f.note }}</span>
        </div>
      </div>
      <div v-else class="stack">
        <div v-for="(f, i) in st.recent.slice(0, 6)" :key="st.done - i" class="file-row">
          <span class="mark" :class="{ live: f.status === 'reading' || f.status === 'failed', dim: f.status === 'duplicate' || f.status === 'skipped' }">{{ MARK[f.status] }}</span>
          <span class="name ellipsis">{{ f.name }}</span>
          <span class="note">{{ f.note }}</span>
        </div>
      </div>

      <button v-if="st.running" class="btn outline" @click="cancelImport">Cancel import</button>
      <RouterLink v-else :to="{ name: 'library' }" class="btn" :class="st.added ? 'primary' : 'outline'">Go to library</RouterLink>
    </div>

    <div v-if="storage.known" class="stack" style="margin-top: auto; gap: 8px">
      <div class="between small">
        <span>Storage used by MyMusic</span>
        <span class="muted">{{ fmtBytes(musicBytes) }} · {{ fmtBytes(storage.free) }} free</span>
      </div>
      <div class="bar"><span class="white" :style="{ width: usedPct + '%' }" /></div>
    </div>
  </main>
</template>
