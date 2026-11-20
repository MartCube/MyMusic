<script setup lang="ts">
// Stroke icons from the Ember design; `fill` ones are the transport glyphs.
const ICONS: Record<string, { d: string; fill?: boolean; w?: number }> = {
  search: { d: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>' },
  plus: { d: '<path d="M12 5v14M5 12h14"/>', w: 2.4 },
  back: { d: '<path d="M15 6l-6 6 6 6"/>', w: 2.2 },
  down: { d: '<path d="M6 9l6 6 6-6"/>', w: 2.2 },
  right: { d: '<path d="M9 6l6 6-6 6"/>', w: 2.2 },
  close: { d: '<path d="M6 6l12 12M18 6L6 18"/>', w: 2.2 },
  sort: { d: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>' },
  note: { d: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', w: 1.8 },
  folder: { d: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', w: 2.2 },
  shuffle: { d: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>' },
  repeat: { d: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>' },
  queue: { d: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>' },
  library: { d: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
  settings: { d: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>' },
  trash: { d: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>' },
  next: { d: '<path d="M4 6h10M4 12h10M4 18h6M17 14l4 3-4 3z"/>' },
  disc: { d: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>' },
  person: { d: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.500 2 8 6"/>' },
  playlist: { d: '<path d="M4 6h12M4 12h12M4 18h7"/><path d="M17 12v8M17 12l4 1.5"/><circle cx="15.500" cy="20" r="1.5"/>' },
  'playlist-add': { d: '<path d="M4 6h12M4 12h8M4 18h8M18 11v8M14 15h8"/>' },
  edit: { d: '<path d="M4 20h4L19 9l-4-4L4 16zM13.500 6.500l4 4"/>' },
  grip: { d: '<path d="M5 9h14M5 15h14"/>', w: 2.2 },
  refresh: { d: '<path d="M20 11a8 8 0 1 0-2.300 6.300M20 4v7h-7"/>' },
  up: { d: '<path d="M6 15l6-6 6 6"/>', w: 2.2 },
  top: { d: '<path d="M5 4h14M7 14l5-5 5 5M12 9v11"/>', w: 2.2 },
  bottom: { d: '<path d="M5 20h14M7 10l5 5 5-5M12 15V4"/>', w: 2.2 },
  link: { d: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>' },
  download: { d: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', w: 2.2 },
  external: { d: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>' },
  check: { d: '<path d="M5 12l5 5 9-10"/>', w: 2.4 },
  play: { d: '<path d="M7 4v16l13-8z"/>', fill: true },
  pause: { d: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>', fill: true },
  prev: { d: '<path d="M18 5v14L8 12zM6 5h2v14H6z"/>', fill: true },
  skip: { d: '<path d="M6 5v14l10-7zM16 5h2v14h-2z"/>', fill: true },
  more: { d: '<circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>', fill: true },
  dots: { d: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>', fill: true },
}
const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    :fill="ICONS[name].fill ? 'currentColor' : 'none'"
    :stroke="ICONS[name].fill ? 'none' : 'currentColor'"
    :stroke-width="ICONS[name].w ?? 2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="ICONS[name].d"
  />
</template>
