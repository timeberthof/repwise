/** Nur in der Entwicklung: Hilfsfunktionen für automatisierte Tests und Screenshots. */
import { db } from '../db/db'
import { loadBundledStartwerte, profileDefaults, type Startwerte } from '../db/repo/startwerte'

declare global {
  interface Window {
    __repwiseDev?: {
      seed: (opts?: { checkin?: boolean }) => Promise<void>
      reset: () => Promise<void>
    }
  }
}

export function installDevTools() {
  window.__repwiseDev = {
    /** Onboarding mit den Startwerten durchlaufen (wie „Weiter, Weiter, …“). */
    async seed(opts: { checkin?: boolean } = {}) {
      // Eigene Startwerte (privat/), sonst die Beispieldaten
      const s = (await loadBundledStartwerte()) ?? ((await import('../data/startwerte.beispiel.json')).default as unknown as Startwerte)
      const { emptyDraft, finishOnboarding } = await import('../features/onboarding/draft')
      await finishOnboarding(emptyDraft(profileDefaults(s)), s)
      // Ohne erledigten Check-in würde das Pflicht-Sheet beim Start alles verdecken
      if (opts.checkin !== false) {
        const { saveCheckin, attachCheckinPhoto } = await import('../db/repo/checkin')
        const id = await saveCheckin(s.koerper.gewicht.at(-1)!.wert)
        const c = document.createElement('canvas')
        c.width = 300
        c.height = 400
        const ctx = c.getContext('2d')!
        ctx.fillStyle = '#3a3a3a'
        ctx.fillRect(0, 0, 300, 400)
        ctx.fillStyle = '#6a6a6a'
        ctx.beginPath()
        ctx.arc(150, 110, 50, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillRect(90, 180, 120, 200)
        const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.8))
        const { preparePhoto } = await import('./image')
        await attachCheckinPhoto(id, await preparePhoto(blob))
      }
    },
    async reset() {
      await db.delete()
      location.reload()
    },
  }
}
