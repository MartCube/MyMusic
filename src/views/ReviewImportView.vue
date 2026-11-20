<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { confirmDraft, discardDraft, reviewQueue, setDraftCover } from '../webImport'
import { albums, artists } from '../library'
import { goBack } from '../router'
import { fmtBytes, fmtTime } from '../format'
import { toast } from '../ui'
import Icon from '../components/Icon.vue'

const draft = computed(() => reviewQueue[0])
const saving = ref(false)
const titleField = ref<HTMLInputElement>()

watch(
  () => draft.value?.key,
  () => setTimeout(() => titleField.value?.focus({ preventScroll: true }), 50),
  { immediate: true },
)

const guessed = computed(() => {
  const d = draft.value
  if (!d) return []
  const g: string[] = []
  if (!d.fromTags.title) g.push('title')
  if (!d.fromTags.artist) g.push('artist')
  return g
})

function pickedCover(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (f && draft.value) setDraftCover(draft.value, f)
}

async function save() {
  const d = draft.value
  if (!d || saving.value) return
  saving.value = true
  const r = await confirmDraft(d)
  saving.value = false
  if (r.status === 'added') toast(`Added "${r.song.title}"`)
  else if (r.status === 'duplicate') toast('Already in your library')
  else if (r.status === 'failed') toast(r.reason)
  if (!reviewQueue.length) goBack()
}

function discard() {
  const d = draft.value
  if (!d) return
  discardDraft(d)
  toast('Not added')
  if (!reviewQueue.length) goBack()
}

const sourceHost = computed(() => {
  try {
    return draft.value?.sourceUrl ? new URL(draft.value.sourceUrl).hostname.replace(/^www\./, '') : ''
  } catch {
    return ''
  }
})
</script>

<template>
  <main class="page" style="gap: 20px">
    <div class="row">
      <button class="icon-btn" aria-label="Back" @click="goBack"><Icon name="back" :size="22" /></button>
      <h1 class="title-sm grow">Check song details</h1>
      <span v-if="reviewQueue.length > 1" class="small muted num">1 of {{ reviewQueue.length }}</span>
    </div>

    <div v-if="!draft" class="empty">
      <div class="mark"><Icon name="check" :size="32" /></div>
      <h2>Nothing to check</h2>
      <p>Songs you add from the web or share to MyMusic show up here so you can fix their details before they are saved.</p>
      <RouterLink :to="{ name: 'library' }" class="btn primary" style="padding: 0 24px">Go to library</RouterLink>
    </div>

    <form v-else class="stack" style="gap: 18px" @submit.prevent="save">
      <div class="review-head">
        <span class="cover review-cover">
          <img v-if="draft.coverUrl" :src="draft.coverUrl" alt="Cover" />
          <Icon v-else name="note" :size="40" />
        </span>
        <div class="stack" style="gap: 8px; min-width: 0">
          <label class="btn outline" style="cursor: pointer; padding: 0 14px">
            <Icon name="edit" :size="18" />{{ draft.coverUrl ? 'Change cover' : 'Add cover' }}
            <input type="file" accept="image/*" class="hidden-input" @change="pickedCover" />
          </label>
          <button v-if="draft.coverUrl" type="button" class="btn outline" style="padding: 0 14px" @click="setDraftCover(draft, null)">
            <Icon name="trash" :size="18" />Remove cover
          </button>
          <div class="small muted" style="line-height: 1.4">
            {{ fmtTime(draft.read.duration) }} · {{ fmtBytes(draft.read.size) }}<br />
            <span class="ellipsis" style="display: block">{{ draft.fileName }}</span>
          </div>
        </div>
      </div>

      <div v-if="guessed.length" class="notice">
        The file has no {{ guessed.join(' or ') }} inside it, so {{ guessed.length > 1 ? 'they were' : 'it was' }} guessed from the file name or the link’s title. Check before saving.
      </div>

      <label class="form-row">
        <span class="label">Title <em v-if="!draft.fromTags.title">guessed</em></span>
        <input ref="titleField" v-model="draft.title" class="field" autocomplete="off" required />
      </label>
      <label class="form-row">
        <span class="label">Artist <em v-if="!draft.fromTags.artist">guessed</em></span>
        <input v-model="draft.artist" class="field" list="review-artists" autocomplete="off" />
      </label>
      <label class="form-row">
        <span class="label">Album</span>
        <input v-model="draft.album" class="field" list="review-albums" autocomplete="off" placeholder="No album (shows under Songs)" />
      </label>
      <datalist id="review-artists"><option v-for="a in artists" :key="a.name" :value="a.name" /></datalist>
      <datalist id="review-albums"><option v-for="a in albums" :key="a.key" :value="a.name" /></datalist>

      <div v-if="sourceHost" class="small muted ellipsis">From {{ sourceHost }}</div>

      <div class="btn-row">
        <button type="button" class="btn outline" :disabled="saving" @click="discard">Don’t add</button>
        <button type="submit" class="btn primary" :disabled="saving || !draft.title.trim()">Save to library</button>
      </div>
    </form>
  </main>
</template>
