import { reactive } from 'vue'

export const storage = reactive({
  /** Bytes this app uses in the browser (music, covers, the app itself). */
  used: 0,
  /** Bytes the browser will still let the app store. */
  free: 0,
  known: false,
  /** The browser has promised not to clear the library on its own. */
  protected: false,
})

export async function refreshStorage() {
  try {
    const est = await navigator.storage?.estimate?.()
    if (est?.quota) {
      storage.used = est.usage ?? 0
      storage.free = Math.max(est.quota - storage.used, 0)
      storage.known = true
    }
    storage.protected = (await navigator.storage?.persisted?.()) ?? false
  } catch {
    storage.known = false
  }
}

export async function requestProtection() {
  try {
    storage.protected = (await navigator.storage?.persist?.()) ?? false
  } catch {
    storage.protected = false
  }
  return storage.protected
}

/** Less than about 40 songs' worth of room left. */
export const nearlyFull = () => storage.known && storage.free < 300e6
