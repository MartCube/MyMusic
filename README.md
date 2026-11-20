# MyMusic

A personal, offline music player for music you already own. It is an installable web app (PWA): import your audio files once, then listen with no internet on iPhone, Android or a desktop browser. Nothing is uploaded; everything stays on the device.

The product spec lives in the project's `spec/feature-list.md`; the look is the "Ember" design (graphite, one orange accent, Space Grotesk).

## What works today

- **Import** single files, many files or a whole folder (folder picking on desktop and Android). Tags and embedded covers are read, `cover.jpg` / `folder.jpg` next to the songs is used as a fallback, duplicates are skipped, and unplayable files are listed with the reason.
- **Library**: Albums, Artists and Songs, with sorting and search (case and accent insensitive).
- **Playlists**: create, rename and delete; add songs or whole albums from the ⋮ menu or the player; drag to reorder; remove songs.
- **Playback**: play / pause / next / previous / seek, shuffle, repeat off / all / one, an Up next queue with "Play next" and "Add to queue", a mini player and a full Now playing screen.
- **Background and lock screen**: Media Session controls with cover, title and artist; headphone and Bluetooth buttons.
- **Remembers** the last song, position and queue.
- **Offline**: the app shell is cached by a service worker; music lives in IndexedDB. Storage use, a "nearly full" warning and a "Protect my music" (persistent storage) switch are in Settings.
- **Updates**: an installed app checks for a new version when opened, hourly, and from Settings; it asks before reloading so a song is never cut off.
- **Drawers**: every menu opens as a bottom drawer on phones (swipe down to close) and a dialog on desktop. Now playing and Up next also close with a swipe down.
- **Keyboard shortcuts** (full list in Settings › Keyboard shortcuts, or press `?`): Esc closes or goes back, Space/Enter play or pause, arrows seek and change volume, N/B next/previous, S shuffle, R repeat, P player, Q queue, `/` search. Files can be dropped on the window to import.
- **Themes**: dark (Ember), light or follow the system, with six accent colours.
- **Delete** a song, an album or the whole library.
- **Add from web** (Import › Add from web): paste a link, then download a direct audio link (.mp3, .m4a, Dropbox), open your own converter in a new tab, or pick the file it downloaded. Android can also **share** audio files and links to MyMusic once it is installed. Before a song is saved you check its title, artist, album and cover; missing ones are guessed from the file name or the link's title ("Artist - Title (Official Video)" becomes artist + title).

Not built yet (from the v1 spec): album groups, editing song info and covers, backup export / import, drag-to-reorder in the queue.

## Plugging in your converter

MyMusic ships **no** converter and never downloads from streaming sites itself. It gives your converter three ways in; pick whichever fits how your converter works.

**1. Call the import hook** (`src/webImport.ts`). Anything that ends up with an audio file can hand it over:

```ts
import { importFromBlob } from './webImport'   // or window.MyMusic.importFromBlob outside the bundle

const result = await importFromBlob(fileOrBlob, {
  sourceUrl: link,                 // saved with the song
  title: 'Artist - Title',         // used if the file has no tags; "Artist - Title" is split
  artist, album,                   // optional, used if the file has no tags
  cover: imageBlobOrUrl,           // optional, used if the file has no embedded art
  fileName: 'song.mp3',            // helps detect the format for a Blob without a type
  review: true,                    // default: open "Check song details" before saving
})
// result.status: 'added' | 'duplicate' | 'cancelled' | 'failed' (with result.reason). It never throws.
```

**2. Register a converter** in `src/converters/index.ts` (a commented skeleton is there). The "Add from web" screen then shows a **Convert with &lt;name&gt;** button whenever your `canHandle(link)` returns true, shows your progress (`progress(0.4, 'Converting…')`), has a Cancel button (your `signal` aborts), and shows the message of any `Error` you throw. Return `{ file, fileName?, title?, artist?, album?, cover? }`; the rest of the import is the same as above.

**3. Use a converter web page.** In **Settings › Add from web › Converter address** put its URL. **Open converter** opens it in a new tab; `{url}` in the address is replaced with the pasted link (otherwise the link is copied to the clipboard). When it has downloaded the file, come back and tap **Choose file**, or on Android share the file to MyMusic.

Other pieces, for reference: `importFromUrl(link, hints)` downloads a direct audio link with progress (the site must allow cross-site downloads, CORS; Dropbox does, Google Drive usually does not). `public/share-target.js` runs in the service worker and receives Android shares (`share_target` in `vite.config.ts`); `takeSharedFiles()` imports them. `src/views/ReviewImportView.vue` is the "Check song details" screen.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build (service worker included)
```

`node scripts/make-icons.mjs` regenerates the PNG app icons from `public/favicon.svg`.

## How it is put together

| File | Role |
| --- | --- |
| `src/db.ts` | IndexedDB: `songs` (info), `audio` (the files), `covers`, `kv` (player state) |
| `src/importer.ts` | Reads tags with `music-metadata`, fingerprints files to skip duplicates, shrinks covers |
| `src/webImport.ts` | Add from web: `importFromBlob` hook, direct-link download, converter registry, review queue, shared files |
| `src/converters/` | Where your own converter registers itself (empty) |
| `src/library.ts` | In-memory library; albums and artists are derived from the songs |
| `src/playlists.ts` | Playlists store (IndexedDB `playlists`) |
| `src/shortcuts.ts` | Keyboard shortcuts and the list shown in Settings |
| `src/theme.ts` | Dark/light/system theme and accent colours |
| `src/components/Drawer.vue`, `src/useSwipeDown.ts` | Drawer and swipe-to-close |
| `src/player.ts` | One `<audio>` element, the queue, shuffle / repeat, Media Session, saved state |
| `src/views/`, `src/components/` | Screens and shared pieces (Vue 3) |
| `src/styles.css` | Ember design tokens and all styling |

The build uses a relative base and hash routing, so `dist/` works from any folder on any static host.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages (`.github/workflows/deploy.yml`). In the repository settings, set **Pages → Source** to **GitHub Actions** once. A PWA needs HTTPS, which Pages provides.
