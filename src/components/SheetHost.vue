<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { ui, closeSheet, dismissSheet, type SheetAction } from '../ui'
import Cover from './Cover.vue'
import Drawer from './Drawer.vue'
import Icon from './Icon.vue'

function run(a: SheetAction) {
  if (!a.keepOpen) closeSheet()
  a.run()
}
const text = ref('')
const field = ref<HTMLInputElement>()
watch(
  () => ui.sheet?.input,
  (input) => {
    if (!input) return
    text.value = input.value
    nextTick(() => {
      field.value?.focus()
      field.value?.select()
    })
  },
)
function submit() {
  const input = ui.sheet?.input
  if (!input || !text.value.trim()) return
  closeSheet()
  input.onSubmit(text.value)
}
</script>

<template>
  <Transition name="fade">
    <Drawer v-if="ui.sheet" :key="ui.sheet.title + (ui.sheet.subtitle ?? '')" :label="ui.sheet.title" @close="dismissSheet">
      <div class="head">
        <Cover v-if="ui.sheet.showCover" class="s48" :cover-id="ui.sheet.coverId" />
        <div class="grow">
          <div class="t" :class="{ ellipsis: ui.sheet.showCover }">{{ ui.sheet.title }}</div>
          <div v-if="ui.sheet.subtitle" class="small muted ellipsis">{{ ui.sheet.subtitle }}</div>
        </div>
      </div>
      <p v-if="ui.sheet.text" class="text">{{ ui.sheet.text }}</p>
      <form v-if="ui.sheet.input" class="stack" style="gap: 12px" @submit.prevent="submit">
        <input ref="field" v-model="text" class="field" type="text" maxlength="80" enterkeyhint="done" autocomplete="off" :placeholder="ui.sheet.input.placeholder" :aria-label="ui.sheet.input.placeholder" />
        <button type="submit" class="btn primary" :disabled="!text.trim()">{{ ui.sheet.input.submit }}</button>
      </form>
      <button v-for="a in ui.sheet.actions" :key="a.label" class="act" :class="{ danger: a.danger, picked: a.primary }" :aria-pressed="a.keepOpen ? !!a.primary : undefined" @click="run(a)">
        <Icon v-if="a.icon" :name="a.icon" />
        <span class="grow">{{ a.label }}</span>
        <span v-if="a.note" class="note">{{ a.note }}</span>
        <Icon v-if="a.primary" name="check" />
      </button>
      <button class="act cancel" @click="dismissSheet">{{ ui.sheet.cancel ?? 'Close' }}</button>
    </Drawer>
  </Transition>
  <Transition name="fade">
    <div v-if="ui.update" class="update" role="status">
      <span class="grow">A new version of MyMusic is ready.</span>
      <button class="btn primary" @click="ui.update()"><Icon name="refresh" :size="16" />Reload</button>
      <button class="icon-btn plain" aria-label="Later" @click="ui.update = null"><Icon name="close" :size="16" /></button>
    </div>
  </Transition>
  <Transition name="fade">
    <div v-if="ui.toast" class="toast" role="status">{{ ui.toast }}</div>
  </Transition>
</template>
