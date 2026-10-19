import { useRegisterSW } from 'virtual:pwa-register/react'
import { Icon } from '../icons/Icon'

/**
 * Service Worker registrieren und bei einer neuen Version einen Hinweis zeigen.
 * „Neu laden“ aktiviert die neue Version sofort; Daten bleiben erhalten (IndexedDB).
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Nach Updates schauen: stündlich und beim Zurückkehren in die App (iOS setzt Apps meist nur fort)
      const check = () => navigator.onLine && registration.update().catch(() => {})
      setInterval(check, 60 * 60 * 1000)
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
    },
  })
  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[80] px-3" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
      <div role="status" className="flex items-center gap-3 rounded-sheet border border-elevated bg-toast px-4 py-3 shadow-2xl">
        <Icon name="update" size={24} className="text-amber" />
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">Neue Version verfügbar</span>
          <span className="block text-[13px] text-fg-2">Deine Daten bleiben erhalten.</span>
        </span>
        <button type="button" onClick={() => setNeedRefresh(false)} className="px-2 text-[14px] text-fg-2">
          Später
        </button>
        <button type="button" onClick={() => updateServiceWorker(true)} className="h-[36px] rounded-md bg-fg px-3 text-[14px] font-bold text-fg-inverse">
          Neu laden
        </button>
      </div>
    </div>
  )
}
