import { reactive } from 'vue'

export interface SheetAction {
  label: string
  icon?: string
  danger?: boolean
  primary?: boolean
  run: () => void
}

export interface Sheet {
  title: string
  subtitle?: string
  coverId?: string
  showCover?: boolean
  text?: string
  actions: SheetAction[]
  cancel?: string
  /** Shows a text field; the value is handed to `onSubmit`. */
  input?: { value: string; placeholder: string; submit: string; onSubmit: (text: string) => void }
  /** Called when the sheet is closed without choosing an action. */
  onDismiss?: () => void
}

export const ui = reactive({
  sheet: null as Sheet | null,
  toast: '',
  /** Set when a new version of the app has been downloaded; calling it reloads into that version. */
  update: null as (() => void) | null,
})

export function openSheet(sheet: Sheet) {
  ui.sheet = sheet
}

export function closeSheet() {
  ui.sheet = null
}

export function confirmSheet(title: string, text: string, confirmLabel: string) {
  return new Promise<boolean>((resolve) => {
    ui.sheet = {
      title,
      text,
      cancel: 'Cancel',
      onDismiss: () => resolve(false),
      actions: [{ label: confirmLabel, danger: true, run: () => resolve(true) }],
    }
  })
}

/** Asks for a short piece of text, e.g. a playlist name. Resolves to null if closed. */
export function promptSheet(title: string, placeholder: string, submit: string, value = '') {
  return new Promise<string | null>((resolve) => {
    ui.sheet = {
      title,
      actions: [],
      cancel: 'Cancel',
      input: { value, placeholder, submit, onSubmit: (text) => resolve(text) },
      onDismiss: () => resolve(null),
    }
  })
}

let timer = 0
export function toast(message: string) {
  ui.toast = message
  clearTimeout(timer)
  timer = window.setTimeout(() => (ui.toast = ''), 2400)
}
