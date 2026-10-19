// Erzeugt die App-Icons (PNG) aus dem Repwise-Symbol (public/favicon.svg) mit Playwright/WebKit.
// Aufruf: node scripts/app-icons.mjs
import { mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { webkit } from '@playwright/test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public/icons')
mkdirSync(out, { recursive: true })

// Inhalt des Symbols (ohne Hintergrund) aus favicon.svg übernehmen
const svg = readFileSync(join(root, 'public/favicon.svg'), 'utf8')
const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)[0]
const glyph = svg
  .replace(/<svg[^>]*>|<\/svg>/g, '')
  .replace(defs, '')
  .replace(/<rect[^>]*\/>/, '')
  .trim()

/**
 * rounded: Ecken transparent (Manifest „any“)
 * square: volle Fläche – iOS und Android schneiden selbst zu
 * scale: Inhalt verkleinern (maskable: innerhalb der sicheren Zone von 80 %)
 */
function icon({ rounded, scale }) {
  const bg = rounded ? '<rect width="512" height="512" rx="112" fill="#0f0f0f"/>' : '<rect width="512" height="512" fill="#0f0f0f"/>'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}${bg}<g transform="translate(256 256) scale(${scale}) translate(-262 -246)">${glyph}</g></svg>`
}

const targets = [
  { file: 'apple-touch-icon.png', size: 180, rounded: false, scale: 0.92 },
  { file: 'icon-192.png', size: 192, rounded: true, scale: 0.92 },
  { file: 'icon-512.png', size: 512, rounded: true, scale: 0.92 },
  { file: 'icon-512-maskable.png', size: 512, rounded: false, scale: 0.74 },
  { file: 'favicon-32.png', size: 32, rounded: true, scale: 1 },
]

const browser = await webkit.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size })
  const markup = icon(t).replace('<svg ', `<svg width="${t.size}" height="${t.size}" `)
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${markup}</body></html>`)
  await page.screenshot({ path: join(out, t.file), omitBackground: t.rounded, clip: { x: 0, y: 0, width: t.size, height: t.size } })
  console.log(`${t.file} (${t.size}×${t.size})`)
}
await browser.close()
