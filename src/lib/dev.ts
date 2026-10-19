/** Nur in der Entwicklung: Hilfsfunktionen für automatisierte Tests und Screenshots. */
import { db } from '../db/db'
import { loadBundledStartwerte, profileDefaults, type Startwerte } from '../db/repo/startwerte'

declare global {
  interface Window {
    __repwiseDev?: {
      seed: () => Promise<void>
      reset: () => Promise<void>
    }
  }
}

export function installDevTools() {
  window.__repwiseDev = {
    /** Onboarding mit den Startwerten durchlaufen (wie „Weiter, Weiter, …“). */
    async seed() {
      // Eigene Startwerte (privat/), sonst die Beispieldaten
      const s = (await loadBundledStartwerte()) ?? ((await import('../data/startwerte.beispiel.json')).default as unknown as Startwerte)
      const { emptyDraft, finishOnboarding } = await import('../features/onboarding/draft')
      const d = emptyDraft({ ...profileDefaults(s), onboardingDone: false, createdAt: Date.now() }, s.koerper.gewicht.at(-1)!.wert, s.koerper.koerperfett.at(-1)?.wert ?? null, true)
      await finishOnboarding(d, s)
    },
    async reset() {
      await db.delete()
      location.reload()
    },
  }
}
