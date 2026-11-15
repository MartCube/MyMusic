<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { albums, artists, songs } from '../library'
import { playList } from '../player'
import { plural } from '../format'
import Cover from '../components/Cover.vue'
import Icon from '../components/Icon.vue'
import SongRow from '../components/SongRow.vue'

const route = useRoute()
const router = useRouter()
const input = ref<HTMLInputElement>()
// The text lives in the URL so coming back from an album keeps the results.
const q = computed({
  get: () => String(route.query.q ?? ''),
  set: (v) => router.replace({ query: { ...route.query, q: v || undefined } }),
})
// Ignore case and accents: "beyonce" finds "Beyoncé".
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const words = computed(() => fold(q.value).split(/\s+/).filter(Boolean))
const hit = (...fields: string[]) => {
  const hay = fold(fields.join(' '))
  return words.value.every((w) => hay.includes(w))
}
const active = computed(() => words.value.length > 0)
const foundArtists = computed(() => (active.value ? artists.value.filter((a) => hit(a.name)).slice(0, 6) : []))
const foundAlbums = computed(() => (active.value ? albums.value.filter((a) => hit(a.name, a.artist)).slice(0, 8) : []))
const foundSongs = computed(() => (active.value ? songs.value.filter((s) => hit(s.title, s.artist, s.album)).slice(0, 100) : []))
const nothing = computed(() => active.value && !foundArtists.value.length && !foundAlbums.value.length && !foundSongs.value.length)

const play = (i: number) => playList(foundSongs.value.map((s) => s.id), i, { kind: 'search', label: `"${q.value.trim()}"` })
onMounted(() => !q.value && input.value?.focus())
</script>

<template>
  <main class="page" style="gap: 20px">
    <h1 class="title">Search</h1>
    <label class="search-box">
      <Icon name="search" />
      <input ref="input" v-model="q" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search songs, artists and albums" placeholder="Songs, artists, albums" />
      <button v-if="q" class="clear" aria-label="Clear search" @click="((q = ''), input?.focus())"><Icon name="close" :size="14" /></button>
    </label>

    <p v-if="!songs.length" class="muted" style="font-size: 14px">Your library is empty. Import some music first.</p>
    <p v-else-if="!active" class="muted" style="font-size: 14px">Find anything in your {{ plural(songs.length, 'song') }} by title, artist or album.</p>
    <p v-else-if="nothing" class="muted" style="font-size: 14px">Nothing matches "{{ q.trim() }}".</p>

    <section v-if="foundArtists.length" class="section">
      <h2 class="label">{{ foundArtists.length === 1 ? 'Artist' : 'Artists' }}</h2>
      <RouterLink v-for="a in foundArtists" :key="a.name" :to="{ name: 'artist', params: { name: a.name } }" class="artist-row" style="min-height: 56px">
        <span class="cover round">{{ a.name.charAt(0).toUpperCase() }}</span>
        <span class="grow">
          <span class="t ellipsis" style="display: block">{{ a.name }}</span>
          <span class="small muted">{{ a.albums.length ? plural(a.albums.length, 'album') + ' · ' : '' }}{{ plural(a.songs.length, 'song') }}</span>
        </span>
      </RouterLink>
    </section>
    <section v-if="foundAlbums.length" class="section">
      <h2 class="label">Albums</h2>
      <div class="chips">
        <RouterLink v-for="al in foundAlbums" :key="al.key" :to="{ name: 'album', params: { id: al.key } }" class="chip">
          <Cover class="s44" :cover-id="al.coverId" />
          <span class="grow"><span class="t ellipsis" style="display: block">{{ al.name }}</span><span class="small muted ellipsis" style="display: block">{{ al.artist }}</span></span>
        </RouterLink>
      </div>
    </section>
    <section v-if="foundSongs.length" class="section" style="gap: 2px">
      <h2 class="label" style="margin-bottom: 8px">Songs</h2>
      <div class="songs">
        <SongRow v-for="(s, i) in foundSongs" :key="s.id" :song="s" @play="play(i)" />
      </div>
    </section>
  </main>
</template>
