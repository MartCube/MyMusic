import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import './styles.css'
import App from './App.vue'
import { router } from './router'
import { loadLibrary } from './library'
import { restorePlayer } from './player'
import { ui } from './ui'
import { initTheme } from './theme'

initTheme()

// The service worker caches the app so it opens with no internet. When a newer version has been
// downloaded we ask before switching to it, because reloading would cut off the song that is playing.
let switching = false
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  // The new version has taken over: reload once so the page runs it too.
  if (switching) location.reload()
  switching = false
})
const applyUpdate = registerSW({
  immediate: true,
  onNeedRefresh() {
    ui.update = () => {
      ui.update = null
      switching = true
      applyUpdate(true)
      // Safety net in case the browser never reports the switch.
      setTimeout(() => location.reload(), 4000)
    }
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return
    // An installed app can stay open for days: look for a new version hourly and whenever it comes back to the front.
    const check = () => navigator.onLine && registration.update().catch(() => {})
    setInterval(check, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => !document.hidden && check())
  },
})

// Chrome offers "install" once, early; keep the offer for the Settings screen.
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as unknown as { __installPrompt?: Event }).__installPrompt = e
})

createApp(App).use(router).mount('#app')

loadLibrary()
  .then(restorePlayer)
  .catch((e) => console.error('Could not open the library', e))
