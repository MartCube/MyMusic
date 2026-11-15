<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { songsById, albumKeyOf } from '../library'
import { clearUpNext, current, cycleRepeat, jumpTo, next, player, previous, removeAt, seek, toggle, toggleShuffle } from '../player'
import { fmtTime } from '../format'
import { choosePlaylist } from '../menus'
import Cover from './Cover.vue'
import Icon from './Icon.vue'

const route = useRoute()
const router = useRouter()
const showQueue = computed(() => route.query.np === 'queue')
const close = () => {
  if (window.history.state?.back) router.back()
  else router.replace({ query: {} })
}
const openQueue = () => router.push({ query: { ...route.query, np: 'queue' } })

// While the thumb is being dragged the bar follows the finger, not the audio.
const dragging = ref<number | null>(null)
const shown = computed(() => dragging.value ?? player.time)
const pct = computed(() => (player.duration ? Math.min(shown.value / player.duration, 1) * 100 : 0) + '%')
function commitSeek() {
  if (dragging.value != null) seek(dragging.value)
  dragging.value = null
}

const repeatLabel = computed(() => ({ off: 'Repeat is off', all: 'Repeat all', one: 'Repeat one song' })[player.repeat])
const upcoming = computed(() =>
  player.queue
    .map((q, index) => ({ q, index, song: songsById.value.get(q.id) }))
    .slice(player.index + 1)
    .filter((x) => x.song),
)
const added = computed(() => upcoming.value.filter((x) => x.q.added))
const rest = computed(() => upcoming.value.filter((x) => !x.q.added))
const nextSong = computed(() => upcoming.value[0]?.song)
const contextLine = computed(() => {
  const c = player.context
  return c ? { top: c.kind === 'queue' ? 'Playing' : `Playing from ${c.kind}`, name: c.label } : null
})

// Swipe down on the cover to close, like putting the player away.
let touchY = 0
const swipeStart = (e: TouchEvent) => (touchY = e.touches[0].clientY)
const swipeEnd = (e: TouchEvent) => e.changedTouches[0].clientY - touchY > 80 && close()

function goAlbum() {
  const s = current.value
  if (!s?.album) return
  router.replace({ name: 'album', params: { id: albumKeyOf(s) } })
}

</script>

<template>
  <section v-if="current" class="np" aria-label="Now playing">
    <!-- Up next -->
    <div v-if="showQueue" class="np-inner" style="gap: 20px">
      <div class="between">
        <button class="icon-btn" aria-label="Back to player" @click="close"><Icon name="down" :size="22" /></button>
        <h1 style="font-size: 20px; font-weight: 700">Up next</h1>
        <button class="text-btn muted" style="height: 44px; font-size: 14px" :disabled="!upcoming.length" @click="clearUpNext">Clear</button>
      </div>
      <div class="now-card">
        <Cover class="s48" :cover-id="current.coverId" />
        <div class="grow">
          <div class="label" style="font-size: 11px; color: var(--accent)">Now playing</div>
          <div class="ellipsis" style="font-weight: 700; margin-top: 2px">{{ current.title }}</div>
          <div class="small muted ellipsis">{{ current.artist }}</div>
        </div>
        <div class="eq" aria-hidden="true"><span style="height: 10px" /><span style="height: 18px" /><span style="height: 13px" /></div>
      </div>
      <div v-if="added.length" class="stack" style="gap: 4px">
        <div class="label" style="font-size: 13px; letter-spacing: 0.08em; padding-bottom: 4px">Added by you</div>
        <div v-for="x in added" :key="x.q.uid" class="song">
          <button class="main" @click="jumpTo(x.index)">
            <Cover class="s40" :cover-id="x.song!.coverId" />
            <span class="grow"><span class="t ellipsis" style="display: block">{{ x.song!.title }}</span><span class="s ellipsis" style="display: block">{{ x.song!.artist }}</span></span>
          </button>
          <button class="act plain" :aria-label="`Remove ${x.song!.title} from queue`" @click="removeAt(x.index)"><Icon name="close" :size="18" /></button>
        </div>
      </div>
      <div v-if="rest.length" class="stack" style="gap: 4px">
        <div class="between" style="padding-bottom: 4px">
          <div class="label ellipsis" style="font-size: 13px; letter-spacing: 0.08em">Next{{ player.context && player.context.kind !== 'queue' ? ` from ${player.context.kind} · ${player.context.label}` : '' }}</div>
          <div v-if="player.shuffle" class="badge"><Icon name="shuffle" :size="12" />Shuffled</div>
        </div>
        <div v-for="x in rest" :key="x.q.uid" class="song">
          <button class="main" @click="jumpTo(x.index)">
            <Cover class="s40" :cover-id="x.song!.coverId" />
            <span class="grow"><span class="t ellipsis" style="display: block">{{ x.song!.title }}</span><span class="s ellipsis" style="display: block">{{ x.song!.artist }}</span></span>
          </button>
          <button class="act plain" :aria-label="`Remove ${x.song!.title} from queue`" @click="removeAt(x.index)"><Icon name="close" :size="18" /></button>
        </div>
      </div>
      <p v-if="!upcoming.length" class="muted" style="text-align: center; padding: 32px 0; font-size: 14px">Nothing else is queued. This is the last song.</p>
    </div>

    <!-- Player -->
    <div v-else class="np-inner">
      <div class="between">
        <button class="icon-btn" aria-label="Close player" @click="close"><Icon name="down" :size="22" /></button>
        <div v-if="contextLine" class="grow" style="text-align: center">
          <div class="label" style="font-size: 11px">{{ contextLine.top }}</div>
          <div class="ellipsis" style="font-size: 14px; font-weight: 700; margin-top: 2px">{{ contextLine.name }}</div>
        </div>
        <button class="icon-btn" aria-label="Up next" @click="openQueue"><Icon name="queue" /></button>
      </div>
      <Cover class="art" :cover-id="current.coverId" :icon="72" @touchstart.passive="swipeStart" @touchend.passive="swipeEnd" />
      <div class="between" style="align-items: flex-end">
       <div class="grow">
        <div class="song-title">{{ current.title }}</div>
        <div class="muted ellipsis" style="margin-top: 4px">
          {{ current.artist }}<template v-if="current.album"> · <button style="text-decoration: underline" @click="goAlbum">{{ current.album }}</button></template>
        </div>
       </div>
       <button class="ring" aria-label="Add to playlist" @click="choosePlaylist([current.id], current.title)"><Icon name="plus" /></button>
      </div>
      <div class="seek">
        <input
          type="range"
          min="0"
          :max="player.duration || 0"
          step="0.5"
          :value="shown"
          :style="{ '--p': pct }"
          aria-label="Position in song"
          :aria-valuetext="`${fmtTime(shown)} of ${fmtTime(player.duration)}`"
          @input="dragging = Number(($event.target as HTMLInputElement).value)"
          @change="commitSeek"
        />
        <div class="times num"><span>{{ fmtTime(shown) }}</span><span>{{ fmtTime(player.duration) }}</span></div>
      </div>
      <div class="transport">
        <button class="mode" :class="{ on: player.shuffle }" aria-label="Shuffle" :aria-pressed="player.shuffle" @click="toggleShuffle"><Icon name="shuffle" :size="22" /></button>
        <button class="skip" aria-label="Previous" @click="previous"><Icon name="prev" :size="30" /></button>
        <button class="play" :aria-label="player.playing ? 'Pause' : 'Play'" @click="toggle"><Icon :name="player.playing ? 'pause' : 'play'" :size="30" /></button>
        <button class="skip" aria-label="Next" @click="next"><Icon name="skip" :size="30" /></button>
        <button class="mode" :class="{ on: player.repeat !== 'off' }" :aria-label="repeatLabel" @click="cycleRepeat">
          <Icon name="repeat" :size="22" /><span v-if="player.repeat === 'one'" class="one">1</span>
        </button>
      </div>
      <button class="upnext" @click="openQueue">
        <span class="label" style="letter-spacing: 0.08em">Up next</span>
        <span class="what grow ellipsis">{{ nextSong ? `${nextSong.title} · ${nextSong.artist}` : 'End of the list' }}</span>
        <Icon name="right" :size="18" />
      </button>
    </div>
  </section>
</template>
