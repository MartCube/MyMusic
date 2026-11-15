<script setup lang="ts">
import { SHORTCUTS } from '../shortcuts'
import { goBack } from '../router'
import Icon from '../components/Icon.vue'

const groups = ['Playback', 'Go to', 'Anywhere'] as const
</script>

<template>
  <main class="page" style="gap: 20px">
    <div class="row">
      <button class="icon-btn" aria-label="Back" @click="goBack"><Icon name="back" :size="22" /></button>
      <h1 class="title-sm">Keyboard shortcuts</h1>
    </div>
    <p class="small muted" style="line-height: 1.5">For a computer or a tablet with a keyboard. They work anywhere in the app, except while you are typing in a text field.</p>
    <section v-for="g in groups" :key="g" class="section" style="gap: 8px">
      <h2 class="label">{{ g }}</h2>
      <div class="list-card">
        <div v-for="s in SHORTCUTS.filter((x) => x.group === g)" :key="s.label" class="shortcut">
          <span class="grow">{{ s.label }}</span>
          <span class="keys">
            <template v-for="(combo, i) in s.keys" :key="i">
              <span v-if="i" class="muted small">or</span>
              <span class="combo"><kbd v-for="k in combo" :key="k">{{ k }}</kbd></span>
            </template>
          </span>
        </div>
      </div>
    </section>
  </main>
</template>
