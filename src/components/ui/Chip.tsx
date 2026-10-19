import type { CSSProperties, ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'

interface ChipProps {
  icon?: IconName
  iconColor?: string
  children: ReactNode
  onClick?: () => void
  /** Statusfarbe → 2-pt-Rahmen und Text in dieser Farbe (z. B. Deload) */
  tone?: string
  selected?: boolean
  className?: string
  style?: CSSProperties
}

/** Chip 40 pt hoch: „🕓 32 Minuten“, „📍 Im Gym“, Status-Chip „Deload“. */
export function Chip({ icon, iconColor, children, onClick, tone, selected, className = '', style }: ChipProps) {
  const toneStyle: CSSProperties = tone ? { borderColor: tone, color: tone, background: 'rgba(13,15,13,0.9)' } : {}
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-4 text-body ${
        tone ? 'border-2' : selected ? 'border-2 border-fg bg-surface' : 'border-2 border-transparent bg-surface-3'
      } ${className}`}
      style={{ ...toneStyle, ...style }}
    >
      {icon && <Icon name={icon} size={22} style={{ color: iconColor ?? (tone ? tone : undefined) }} />}
      <span>{children}</span>
    </button>
  )
}

/** Badge 18 pt: „DELOAD“, „EMPFOHLEN“, „ABNEHMEN“. */
export function Badge({ color, children, className = '' }: { color: string; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-[19px] items-center rounded-xs border px-1.5 text-section font-semibold uppercase tracking-[0.04em] ${className}`} style={{ borderColor: color, color }}>
      {children}
    </span>
  )
}

/** Kleiner Chip in Übungs-Sheets: „📊 2 Sätze“, „↻ 5-8 Wdh“, „🏋 50 kg“. */
export function MiniChip({ icon, children, onClick, active }: { icon: IconName; children: ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[38px] flex-1 items-center justify-center gap-2 rounded-md text-label ${active ? 'border-grad-accent text-amber' : 'border-2 border-transparent bg-surface-3 text-fg'}`}
      style={active ? ({ '--fill': '#13110f' } as CSSProperties) : undefined}
    >
      <Icon name={icon} size={20} gradient={['#f3af3d', '#ed774d']} />
      <span className={active ? 'text-grad-accent font-medium' : ''}>{children}</span>
    </button>
  )
}
