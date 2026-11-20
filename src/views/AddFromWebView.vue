<script setup lang="ts">
import { computed, onMounted, toRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  cancelWebJob,
  converterFor,
  converterPageFor,
  convertAndImport,
  importFromBlob,
  importFromUrl,
  isDirectAudioLink,
  linkFromText,
  reviewQueue,
  takeSharedFiles,
  webJob,
  webSettings,
  type ImportResult,
} from '../webImport'
import { ACCEPT } from '../importer'
import { goBack } from '../router'
import { fmtBytes, plural } from '../format'
import { toast } from '../ui'
import Icon from '../components/Icon.vue'

const route = useRoute()
const router = useRouter()

const link = toRef(webJob, 'link')
/** A title that came with a shared link; used when the file has no title tag. */
const sharedTitle = toRef(webJob, 'sharedTitle')
const last = toRef(webJob, 'last')

const trimmed = computed(() => link.value.trim())
const isUrl = computed(() => /^https?:\/\/\S+$/i.test(trimmed.value))
const converter = computed(() => (isUrl.value ? converterFor(trimmed.value) : undefined))
const direct = computed(() => isUrl.value && isDirectAudioLink(trimmed.value))
const hasConverterPage = computed(() => !!webSettings.converterUrl.trim())
const canPaste = !!navigator.clipboard?.readText

async function paste() {
  try {
    const text = await navigator.clipboard.readText()
    const found = linkFromText(text)
    link.value = found.link || text.trim()
  } catch {
    toast('Paste is not allowed here. Long-press the field and paste.')
  }
}

function report(r: ImportResult) {
  last.value = r
  if (r.status === 'added') toast(`Added "${r.song.title}"`)
  else if (r.status === 'duplicate') toast('Already in your library')
}

async function download() {
  report(await importFromUrl(trimmed.value, { title: sharedTitle.value || undefined }))
}

async function convert() {
  if (converter.value) report(await convertAndImport(converter.value, trimmed.value))
}

async function openConverter() {
  const page = converterPageFor(trimmed.value)
  if (!page) return router.push({ name: 'settings', hash: '#web' })
  // Without {url} in the converter address the link travels by clipboard.
  if (trimmed.value && !webSettings.converterUrl.includes('{url}')) {
    try {
      await navigator.clipboard.writeText(trimmed.value)
      toast('Link copied. Paste it in the converter.')
    } catch {}
  }
  window.open(page, '_blank', 'noopener')
}

async function pickedFile(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  for (const f of files) {
    report(await importFromBlob(f, { sourceUrl: isUrl.value ? trimmed.value : undefined, title: files.length === 1 ? sharedTitle.value || undefined : undefined }))
  }
}

const pct = computed(() => (webJob.progress == null ? null : Math.round(webJob.progress * 100)))

// Arriving from the share menu: ?link=…&title=… for a shared link, ?shared=1 for shared files.
async function fromQuery() {
  const q = route.query
  if (typeof q.link === 'string' || typeof q.text === 'string') {
    const found = linkFromText(String(q.link || q.text || ''))
    link.value = found.link || String(q.link || '')
    const title = String(q.title || '') || (found.link ? found.rest : '')
    sharedTitle.value = title
  }
  if (q.shared) {
    router.replace({ name: 'web' })
    const n = await takeSharedFiles()
    if (!n) toast('The shared file could not be opened. Try sharing it again.')
    return
  }
  if (q.link || q.text || q.title) router.replace({ name: 'web' })
}
onMounted(fromQuery)
watch(() => route.query, (q) => Object.keys(q).length && fromQuery())
watch(link, (v) => {
  if (!v) sharedTitle.value = ''
  last.value = null
  webJob.error = ''
})
</script>

<template>
  <main class="page" style="gap: 20px">
    <div class="row">
      <button class="icon-btn" aria-label="Back" @click="goBack"><Icon name="back" :size="22" /></button>
      <h1 class="title-sm">Add from web</h1>
    </div>

    <div class="stack" style="gap: 10px">
      <label class="label" for="web-link">Link</label>
      <div class="search-box">
        <Icon name="link" :size="20" />
        <input
          id="web-link"
          v-model="link"
          type="url"
          inputmode="url"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder="Paste a link"
          enterkeyhint="go"
          @keydown.enter="direct ? download() : converter ? convert() : null"
        />
        <button v-if="link" class="clear" aria-label="Clear link" @click="link = ''"><Icon name="close" :size="16" /></button>
        <button v-else-if="canPaste" class="text-btn" style="color: var(--text)" @click="paste">Paste</button>
      </div>
      <div v-if="sharedTitle" class="small muted ellipsis">Shared as “{{ sharedTitle }}”</div>
    </div>

    <div class="stack" style="gap: 10px">
      <button v-if="converter" class="btn primary" :disabled="webJob.running" @click="convert">
        <Icon name="refresh" :size="20" />Convert with {{ converter.name }}
      </button>
      <button
        v-if="isUrl"
        class="btn"
        :class="direct && !converter ? 'primary' : 'outline'"
        :disabled="webJob.running"
        @click="download"
      >
        <Icon name="download" :size="20" />Download audio file
      </button>
      <div class="btn-row wrap">
        <button class="btn outline" @click="openConverter"><Icon name="external" :size="18" />Open converter</button>
        <label class="btn outline" :class="{ off: webJob.running }" style="cursor: pointer">
          <Icon name="note" :size="18" />Choose file
          <input type="file" :accept="ACCEPT" multiple class="hidden-input" @change="pickedFile" />
        </label>
      </div>
      <p class="small muted" style="line-height: 1.5">
        <template v-if="!hasConverterPage">
          “Open converter” needs your converter’s address. <RouterLink :to="{ name: 'settings', hash: '#web' }" style="color: var(--accent); font-weight: 500">Set it in Settings</RouterLink>.
        </template>
        <template v-else>“Open converter” opens your converter in a new tab. When the file is downloaded, come back and tap “Choose file”, or share it to MyMusic.</template>
        “Download audio file” works for direct links to .mp3 or .m4a files, and for Dropbox links. You check the title, artist, album and cover before a song is saved.
      </p>
    </div>

    <RouterLink v-if="reviewQueue.length" :to="{ name: 'review' }" class="notice between" style="font-size: 14px; font-weight: 500">
      <span>{{ plural(reviewQueue.length, 'song') }} waiting for you to check</span><Icon name="right" :size="18" />
    </RouterLink>

    <div v-if="webJob.running || webJob.error" class="card" aria-live="polite">
      <template v-if="webJob.running">
        <div class="between" style="align-items: baseline">
          <div style="font-size: 16px; font-weight: 700">{{ webJob.label }}…</div>
          <div class="small muted num">
            <template v-if="webJob.loaded">{{ fmtBytes(webJob.loaded) }}<template v-if="webJob.total"> of {{ fmtBytes(webJob.total) }}</template></template>
            <template v-else-if="pct != null">{{ pct }}%</template>
          </div>
        </div>
        <div class="bar" :class="{ busy: pct == null }"><span :style="{ width: (pct ?? 30) + '%' }" /></div>
        <button class="btn outline" @click="cancelWebJob">Cancel</button>
      </template>
      <template v-else>
        <div style="font-size: 16px; font-weight: 700">Could not add this</div>
        <div class="small" style="line-height: 1.5">{{ webJob.error }}</div>
      </template>
    </div>

    <div v-else-if="last && last.status !== 'cancelled'" class="card" aria-live="polite">
      <template v-if="last.status === 'added' || last.status === 'duplicate'">
        <div style="font-size: 16px; font-weight: 700">{{ last.status === 'added' ? 'Added to your library' : 'Already in your library' }}</div>
        <div class="small muted ellipsis">{{ last.song.title }} · {{ last.song.artist }}</div>
      </template>
      <template v-else>
        <div style="font-size: 16px; font-weight: 700">Could not add this</div>
        <div class="small" style="line-height: 1.5">{{ last.reason }}</div>
      </template>
    </div>
  </main>
</template>
