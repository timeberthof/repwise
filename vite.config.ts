import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

/**
 * GitHub Pages: Die App liegt unter https://<name>.github.io/repwise/ → base „/repwise/“.
 * Anderer Repository-Name: VITE_BASE=/anderer-name/ setzen. Lokal (npm run dev) läuft sie unter „/“.
 * Routing per Hash (#/training), darum braucht GitHub Pages keine 404-Weiterleitung (DECISIONS.md).
 */
export default defineConfig(({ command, isPreview }) => {
  const base = process.env.VITE_BASE ?? (command === 'build' || isPreview ? '/repwise/' : '/')
  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'icons/*.png'],
        manifest: {
          id: base,
          name: 'Repwise',
          short_name: 'Repwise',
          description: 'Persönliches Krafttraining mit automatischer Anpassung',
          lang: 'de',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#000000',
          theme_color: '#000000',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,json}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        },
      }),
    ],
    // Die App wird beim ersten Öffnen komplett für offline gespeichert – ein großer Haupt-Chunk ist hier unkritisch.
    build: { chunkSizeWarningLimit: 1000 },
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
  }
})
