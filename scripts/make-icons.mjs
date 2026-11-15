// Renders the PNG app icons from public/favicon.svg. Run: node scripts/make-icons.mjs
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/favicon.svg')
const square = Buffer.from(String(svg).replace('rx="112"', 'rx="0"'))
await sharp(svg).resize(192).png().toFile('public/icon-192.png')
await sharp(svg).resize(512).png().toFile('public/icon-512.png')
await sharp(square).resize(180).png().toFile('public/apple-touch-icon.png')
// Maskable: full-bleed background with the mark inside the safe zone.
const inner = await sharp(square).resize(384).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#141414' } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile('public/icon-maskable-512.png')
