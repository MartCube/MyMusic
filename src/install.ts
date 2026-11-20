import { reactive } from 'vue'
import { openSheet, toast } from './ui'

// Installing MyMusic as an app. Chrome, Edge and Android hand us a prompt we can show from a button.
// iPhone and iPad have no prompt: the only way is Share, then "Add to Home Screen".

type InstallPrompt = Event & { prompt: () => Promise<unknown>; userChoice?: Promise<{ outcome: string }> }

const standaloneQuery = matchMedia('(display-mode: standalone)')
const isStandalone = () => standaloneQuery.matches || (navigator as { standalone?: boolean }).standalone === true

// iPadOS reports itself as a Mac, so also look for a touch screen.
export const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

const DISMISS_KEY = 'mymusic.installBannerDismissed'
const DISMISS_DAYS = 30

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return !!at && Date.now() - at < DISMISS_DAYS * 864e5
  } catch {
    return false
  }
}

export const install = reactive({
  /** Running as an installed app (home screen icon or desktop app window). */
  standalone: isStandalone(),
  /** The browser's install prompt, when it has offered one. */
  prompt: null as InstallPrompt | null,
  /** The banner was closed recently; Settings still shows the install option. */
  bannerDismissed: dismissedRecently(),
})

/** Whether there is anything to offer: a real prompt, or the iPhone steps. */
export const canInstall = () => !install.standalone && (!!install.prompt || isIos)

addEventListener('beforeinstallprompt', (e) => {
  // Keep the offer for our own button instead of the browser's mini bar.
  e.preventDefault()
  install.prompt = e as InstallPrompt
})
addEventListener('appinstalled', () => {
  install.prompt = null
  install.standalone = true
})
standaloneQuery.addEventListener?.('change', () => (install.standalone = isStandalone()))

export const IOS_STEPS = 'Tap the Share button (the square with an arrow), then "Add to Home Screen". MyMusic then opens like an app, full screen, and the browser is less likely to clear your music.'

/** Shows the browser's install prompt. Resolves to true if the person accepted. */
export async function promptInstall() {
  const p = install.prompt
  if (!p) return false
  // A prompt can only be shown once; the browser fires a new event if it can be offered again.
  install.prompt = null
  await p.prompt()
  const choice = await p.userChoice?.catch(() => null)
  return choice?.outcome === 'accepted'
}

export function dismissBanner() {
  install.bannerDismissed = true
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    // Private mode: the banner simply comes back next time.
  }
}

/** What the Install buttons do: the browser prompt where there is one, otherwise the iPhone steps. */
export async function offerInstall() {
  if (install.prompt) {
    if (await promptInstall()) toast('Installing MyMusic…')
    return
  }
  openSheet({ title: 'Install MyMusic', text: IOS_STEPS, actions: [] })
}
