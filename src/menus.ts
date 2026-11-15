import type { Song } from './db'
import { albumKeyOf, removeSongs, type Album } from './library'
import { addToQueue, dropSongs, playNext } from './player'
import { confirmSheet, openSheet, toast } from './ui'
import { plural } from './format'
import { router } from './router'

async function deleteSongs(ids: string[], title: string, text: string) {
  if (!(await confirmSheet(title, text, 'Delete from this device'))) return false
  dropSongs(ids)
  await removeSongs(ids)
  toast(ids.length === 1 ? 'Song deleted' : `${ids.length} songs deleted`)
  return true
}

export function songMenu(song: Song) {
  const albumKey = albumKeyOf(song)
  openSheet({
    title: song.title,
    subtitle: song.album ? `${song.artist} · ${song.album}` : song.artist,
    coverId: song.coverId,
    showCover: true,
    actions: [
      { label: 'Play next', icon: 'next', run: () => (playNext([song.id]), toast('Playing next')) },
      { label: 'Add to queue', icon: 'queue', run: () => (addToQueue([song.id]), toast('Added to queue')) },
      ...(albumKey ? [{ label: 'Go to album', icon: 'disc', run: () => router.push({ name: 'album', params: { id: albumKey } }) }] : []),
      { label: 'Go to artist', icon: 'person', run: () => router.push({ name: 'artist', params: { name: song.artist } }) },
      {
        label: 'Delete from this device',
        icon: 'trash',
        danger: true,
        run: () => deleteSongs([song.id], `Delete "${song.title}"?`, 'The song is removed from MyMusic on this device. Your original file is not touched.'),
      },
    ],
  })
}

export function albumMenu(album: Album) {
  const ids = album.songs.map((s) => s.id)
  openSheet({
    title: album.name,
    subtitle: `${album.artist} · ${plural(ids.length, 'song')}`,
    coverId: album.coverId,
    showCover: true,
    actions: [
      { label: 'Play next', icon: 'next', run: () => (playNext(ids), toast('Album plays next')) },
      { label: 'Add to queue', icon: 'queue', run: () => (addToQueue(ids), toast('Album added to queue')) },
      { label: 'Go to artist', icon: 'person', run: () => router.push({ name: 'artist', params: { name: album.artist } }) },
      {
        label: 'Delete album from this device',
        icon: 'trash',
        danger: true,
        run: async () => {
          const done = await deleteSongs(ids, `Delete "${album.name}"?`, `All ${plural(ids.length, 'song')} of this album are removed from MyMusic on this device. Your original files are not touched.`)
          if (done) router.replace({ name: 'library' })
        },
      },
    ],
  })
}
