import type { ReactNode } from 'react'
import { Icon } from '../../components/icons/Icon'

/**
 * Statistik-Karte wie im Original: Titel, Untertitel (was die Zahl bedeutet), rechts Wert/Differenz und ›,
 * darunter das Diagramm.
 */
export function StatCard({ title, sub, right, onClick, children }: { title: ReactNode; sub: ReactNode; right?: ReactNode; onClick?: () => void; children?: ReactNode }) {
  return (
    <div role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} className={`rounded-xl border border-elevated bg-surface pb-1 pt-[14px] ${onClick ? 'active:opacity-80' : ''}`}>
      <div className="flex items-start gap-3 px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[20px] font-semibold leading-tight">{title}</p>
          <p className="mt-[5px] text-[15px] font-light leading-snug text-fg-2">{sub}</p>
        </div>
        {right && <div className="flex shrink-0 items-center gap-1 pt-[2px]">{right}</div>}
        {onClick && <Icon name="chevronRight" size={24} className="-mr-1 mt-[2px] shrink-0" />}
      </div>
      {children && <div className="mt-1">{children}</div>}
    </div>
  )
}

/** Differenz in Grün/Rot wie „+7,6 kg“. */
export function Delta({ value, unit = 'kg', digits = 1, invert }: { value: number; unit?: string; digits?: number; invert?: boolean }) {
  const r = Math.round(value * 10 ** digits) / 10 ** digits
  const good = invert ? r < 0 : r > 0
  const color = r === 0 ? '#9f9f9f' : good ? '#5bbd52' : '#d2463b'
  const text = `${r > 0 ? '+' : r < 0 ? '−' : '±'} ${new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(Math.abs(r))}${unit ? ' ' + unit : ''}`
  return (
    <span className="whitespace-nowrap text-[16px] font-semibold" style={{ color }}>
      {text}
    </span>
  )
}

/** Kleine Kennzahl mit Erklärung. */
export function Kpi({ value, label, hint }: { value: ReactNode; label: string; hint: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-elevated bg-surface px-3 py-3">
      <p className="truncate text-[21px] font-extrabold leading-tight">{value}</p>
      <p className="mt-1 text-[14px] font-semibold">{label}</p>
      <p className="mt-[2px] text-[12.5px] leading-snug text-fg-2">{hint}</p>
    </div>
  )
}
