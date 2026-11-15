import type { Playlist, Song } from './db'
import { albumKeyOf, removeSongs, type Album } from './library'
import { addToQueue, dropSongs, playNext } from './player'
import { addToPlaylist, createPlaylist, playlists, removeFromPlaylist, removePlaylist, renamePlaylist, setPlaylistOrder } from './playlists'
import { confirmSheet, openSheet, promptSheet, toast, type SheetAction } from './ui'
import { plural } from './format'
import { router } from './router'

async function deleteSongs(ids: string[], title: string, text: string) {
  if (!(await confirmSheet(title, text, 'Delete from this device'))) return false
  dropSongs(ids)
  await removeSongs(ids)
  toast(ids.length === 1 ? 'Song deleted' : `${ids.length} songs deleted`)
  return true
}

export async function newPlaylist(songIds: string[] = []) {
  const name = (await promptSheet('New playlist', 'Playlist name', 'Create'))?.trim()
  if (!name) return null
  const p = await createPlaylist(name, songIds)
  toast(songIds.length ? `Added to "${p.name}"` : `"${p.name}" created`)
  return p
}

/**
 * Pick the playlists the songs go into. Playlists that already have them are ticked ("Added");
 * tapping one again takes the songs back out. The drawer stays open so several can be chosen.
 */
export function choosePlaylist(songIds: string[], what: string) {
  const ids = [...new Set(songIds)]
  const reopen = () => choosePlaylist(ids, what)
  openSheet({
    title: 'Add to playlist',
    subtitle: what,
    actions: [
      { label: 'New playlist', icon: 'plus', run: () => newPlaylist(ids) },
      ...playlists.value.map((p) => {
        const have = new Set(p.songIds)
        const n = ids.filter((id) => have.has(id)).length
        const all = n === ids.length
        return {
          label: p.name,
          icon: 'playlist',
          primary: all,
          keepOpen: true,
          note: all ? 'Added' : n ? `${n} of ${ids.length} added` : undefined,
          run: async () => {
            if (all) {
              for (const id of ids) await removeFromPlaylist(p.id, id)
              toast(`Removed from "${p.name}"`)
            } else {
              await addToPlaylist(p.id, ids)
              toast(`Added to "${p.name}"`)
            }
            reopen()
          },
        }
      }),
    ],
    cancel: 'Done',
  })
}

export function songMenu(song: Song, extra: SheetAction[] = []) {
  const albumKey = albumKeyOf(song)
  openSheet({
    title: song.title,
    subtitle: song.album ? `${song.artist} · ${song.album}` : song.artist,
    coverId: song.coverId,
    showCover: true,
    actions: [
      ...extra,
      { label: 'Add to playlist', icon: 'playlist-add', run: () => choosePlaylist([song.id], song.title) },
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
      { label: 'Add album to playlist', icon: 'playlist-add', run: () => choosePlaylist(ids, `${album.name} · ${plural(ids.length, 'song')}`) },
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

export function playlistMenu(p: Playlist, onEdit?: () => void) {
  openSheet({
    title: p.name,
    subtitle: `Playlist · ${plural(p.songIds.length, 'song')}`,
    actions: [
      ...(onEdit && p.songIds.length > 1 ? [{ label: 'Reorder or remove songs', icon: 'grip', run: onEdit }] : []),
      ...(p.songIds.length > 2
        ? [{
            label: 'Shuffle the order',
            icon: 'shuffle',
            run: async () => {
              const ids = [...p.songIds]
              for (let i = ids.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[ids[i], ids[j]] = [ids[j], ids[i]]
              }
              await setPlaylistOrder(p.id, ids)
              toast('New order saved')
            },
          }]
        : []),
      {
        label: 'Rename',
        icon: 'edit',
        run: async () => {
          const name = await promptSheet('Rename playlist', 'Playlist name', 'Save', p.name)
          if (name?.trim()) await renamePlaylist(p.id, name)
        },
      },
      { label: 'Play next', icon: 'next', run: () => (playNext(p.songIds), toast('Playlist plays next')) },
      { label: 'Add to queue', icon: 'queue', run: () => (addToQueue(p.songIds), toast('Playlist added to queue')) },
      {
        label: 'Delete playlist',
        icon: 'trash',
        danger: true,
        run: async () => {
          if (!(await confirmSheet(`Delete "${p.name}"?`, 'Only the playlist is deleted. The songs stay in your library.', 'Delete playlist'))) return
          await removePlaylist(p.id)
          toast('Playlist deleted')
          if (router.currentRoute.value.name === 'playlist') router.replace({ name: 'library', query: { tab: 'playlists' } })
        },
      },
    ],
  })
}
