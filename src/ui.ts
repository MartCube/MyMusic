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
  /** Called when the sheet is closed without choosing an action. */
  onDismiss?: () => void
}

export const ui = reactive({
  sheet: null as Sheet | null,
  toast: '',
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

let timer = 0
export function toast(message: string) {
  ui.toast = message
  clearTimeout(timer)
  timer = window.setTimeout(() => (ui.toast = ''), 2400)
}
