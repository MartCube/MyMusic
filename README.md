# MyMusic

A personal, offline music player for music you already own. It is an installable web app (PWA): import your audio files once, then listen with no internet on iPhone, Android or a desktop browser. Nothing is uploaded; everything stays on the device.

The product spec lives in the project's `spec/feature-list.md`; the look is the "Ember" design (graphite, one orange accent, Space Grotesk).

## What works today

- **Import** single files, many files or a whole folder (folder picking on desktop and Android). Tags and embedded covers are read, `cover.jpg` / `folder.jpg` next to the songs is used as a fallback, duplicates are skipped, and unplayable files are listed with the reason.
- **Library**: Albums, Artists and Songs, with sorting and search (case and accent insensitive).
- **Playback**: play / pause / next / previous / seek, shuffle, repeat off / all / one, an Up next queue with "Play next" and "Add to queue", a mini player and a full Now playing screen.
- **Background and lock screen**: Media Session controls with cover, title and artist; headphone and Bluetooth buttons.
- **Remembers** the last song, position and queue.
- **Offline**: the app shell is cached by a service worker; music lives in IndexedDB. Storage use, a "nearly full" warning and a "Protect my music" (persistent storage) switch are in Settings.
- **Delete** a song, an album or the whole library.

Not built yet (from the v1 spec): playlists, album groups, editing song info and covers, backup export / import, drag-to-reorder in the queue.

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
| `src/library.ts` | In-memory library; albums and artists are derived from the songs |
| `src/player.ts` | One `<audio>` element, the queue, shuffle / repeat, Media Session, saved state |
| `src/views/`, `src/components/` | Screens and shared pieces (Vue 3) |
| `src/styles.css` | Ember design tokens and all styling |

The build uses a relative base and hash routing, so `dist/` works from any folder on any static host.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages (`.github/workflows/deploy.yml`). In the repository settings, set **Pages → Source** to **GitHub Actions** once. A PWA needs HTTPS, which Pages provides.
