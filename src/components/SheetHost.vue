<script setup lang="ts">
import { ui, closeSheet, type SheetAction } from '../ui'
import Cover from './Cover.vue'
import Icon from './Icon.vue'

function run(a: SheetAction) {
  closeSheet()
  a.run()
}
function dismiss() {
  const s = ui.sheet
  closeSheet()
  s?.onDismiss?.()
}
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.sheet" class="scrim" @click.self="dismiss" @keydown.esc="dismiss">
      <div class="sheet" role="dialog" aria-modal="true" :aria-label="ui.sheet.title">
        <div class="head">
          <Cover v-if="ui.sheet.showCover" class="s48" :cover-id="ui.sheet.coverId" />
          <div class="grow">
            <div class="t" :class="{ ellipsis: ui.sheet.showCover }">{{ ui.sheet.title }}</div>
            <div v-if="ui.sheet.subtitle" class="small muted ellipsis">{{ ui.sheet.subtitle }}</div>
          </div>
        </div>
        <p v-if="ui.sheet.text" class="text">{{ ui.sheet.text }}</p>
        <button v-for="a in ui.sheet.actions" :key="a.label" class="act" :class="{ danger: a.danger }" @click="run(a)">
          <Icon v-if="a.icon" :name="a.icon" />
          <span class="grow">{{ a.label }}</span>
          <Icon v-if="a.primary" name="check" />
        </button>
        <button class="act cancel" @click="dismiss">{{ ui.sheet.cancel ?? 'Close' }}</button>
      </div>
    </div>
  </Transition>
  <Transition name="fade">
    <div v-if="ui.toast" class="toast" role="status">{{ ui.toast }}</div>
  </Transition>
</template>
