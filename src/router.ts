import { createRouter, createWebHashHistory } from 'vue-router'
import LibraryView from './views/LibraryView.vue'
import AlbumView from './views/AlbumView.vue'
import ArtistView from './views/ArtistView.vue'
import SearchView from './views/SearchView.vue'
import ImportView from './views/ImportView.vue'
import SettingsView from './views/SettingsView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'library', component: LibraryView },
    { path: '/album/:id', name: 'album', component: AlbumView, props: true },
    { path: '/artist/:name', name: 'artist', component: ArtistView, props: true },
    { path: '/search', name: 'search', component: SearchView },
    { path: '/import', name: 'import', component: ImportView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, from, saved) {
    // The player opens as a layer over the page (?np=...), so the page keeps its place.
    if (to.path === from.path) return false
    return saved ?? { top: 0 }
  },
})

/** Goes back if there is somewhere to go back to, otherwise to the library. */
export function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace({ name: 'library' })
}
