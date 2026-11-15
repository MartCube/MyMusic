import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base + hash routing so the build works from any folder
// (GitHub Pages project sites, Cloudflare Pages, a local file server).
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC') },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      manifest: {
        name: 'MyMusic',
        short_name: 'MyMusic',
        description: 'Your own music, offline.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#141414',
        theme_color: '#141414',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
