import { GRAD_ACCENT, Icon, type IconName } from '../icons/Icon'

export interface TabDef {
  id: string
  path: string
  label: string
  icon: IconName
  /** Farbe des aktiven Icons: weiß oder Verlauf */
  activeGradient?: [string, string]
}

/**
 * Bereiche der App. Ernährung ist bewusst nicht enthalten (DECISIONS.md, Frage 11) –
 * ein späteres Modul wird hier einfach als weiterer Eintrag ergänzt.
 */
export const TABS: TabDef[] = [
  { id: 'home', path: '/home', label: 'Home', icon: 'home' },
  { id: 'training', path: '/training', label: 'Training', icon: 'route', activeGradient: GRAD_ACCENT },
  { id: 'statistik', path: '/statistik', label: 'Statistiken', icon: 'barChart' },
]

/** Schwebende Tab-Leiste: 333 × 70 pt, 30 pt seitlich, direkt über dem Home-Indikator. */
export function TabBar({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  return (
    <nav
      className="fixed z-40 flex h-[70px] items-stretch rounded-[22px]"
      style={{
        left: 30,
        right: 30,
        bottom: 'max(var(--safe-bottom), 12px)',
        background: 'linear-gradient(100deg, rgba(34,34,34,0.92) 0%, rgba(24,24,24,0.92) 45%, rgba(18,18,18,0.92) 100%)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
      aria-label="Hauptnavigation"
    >
      {TABS.map((t, i) => {
        const on = i === active
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={on ? 'page' : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-[3px]"
          >
            <Icon name={t.icon} size={27} gradient={on ? t.activeGradient : undefined} style={{ color: on ? '#f3f3f3' : '#9f9f9f' }} />
            <span className={`text-[11px] font-semibold uppercase tracking-[0.02em] ${on ? 'text-fg' : 'text-fg-2'}`}>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
