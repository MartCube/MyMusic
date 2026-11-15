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

// Caches the app itself so it opens with no internet; new versions install on the next launch.
registerSW({ immediate: true })

// Chrome offers "install" once, early; keep the offer for the Settings screen.
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as unknown as { __installPrompt?: Event }).__installPrompt = e
})

createApp(App).use(router).mount('#app')

loadLibrary()
  .then(restorePlayer)
  .catch((e) => console.error('Could not open the library', e))
