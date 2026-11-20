/**
 * Your converters go here.
 *
 * MyMusic ships no converter. A converter turns a link (for example a page on some site) into an
 * audio file. Register it below and the "Add from web" screen shows a "Convert with <name>" button
 * whenever `canHandle` says yes for the pasted link. The audio you return goes through the normal
 * import: tags and cover are read, missing details are filled in, and the person reviews them
 * before the song is saved.
 *
 * The full contract is the `Converter` interface in ../webImport.ts. A skeleton:
 *
 *   import { registerConverter } from '../webImport'
 *
 *   registerConverter({
 *     name: 'My converter',
 *     canHandle: (link) => link.startsWith('https://example.com/'),
 *     async convert(link, { signal, progress }) {
 *       progress(null, 'Converting…')
 *       const file: Blob = await myOwnCode(link, signal)   // <- your code
 *       return { file, fileName: 'song.mp3', title: 'Artist - Title' }
 *     },
 *   })
 *
 * If your converter lives somewhere else (another script, a bookmarklet, a backend that hands back
 * a file), you can skip this and call `importFromBlob(file, { sourceUrl, title })` directly; it is
 * also available as `window.MyMusic.importFromBlob`.
 */
export {}
