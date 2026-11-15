<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useSwipeDown } from '../useSwipeDown'

// A bottom drawer on phones (drag the handle or the content down to close) and a centred dialog on wide screens.
const props = defineProps<{ label: string }>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement>()
const { style } = useSwipeDown(panel, () => emit('close'))

let returnFocus: HTMLElement | null = null
onMounted(() => {
  returnFocus = document.activeElement as HTMLElement | null
  document.documentElement.classList.add('locked')
  nextTick(() => {
    // A text field focuses itself; otherwise start on the panel so Tab moves through its buttons.
    if (!panel.value?.contains(document.activeElement)) panel.value?.focus({ preventScroll: true })
  })
})
onBeforeUnmount(() => {
  document.documentElement.classList.remove('locked')
  returnFocus?.focus?.({ preventScroll: true })
})

// Keep Tab inside the drawer while it is open.
function trap(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !panel.value) return
  const items = [...panel.value.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href]')]
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <div class="scrim" @click.self="emit('close')">
    <div ref="panel" class="sheet" role="dialog" aria-modal="true" :aria-label="props.label" tabindex="-1" :style="style()" @keydown="trap">
      <div class="grabber" aria-hidden="true" />
      <slot />
    </div>
  </div>
</template>
