import type { CSSProperties, ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'
import { Badge } from './Chip'

interface Props {
  title: string
  description?: string
  /** Beschreibung nur bei Auswahl zeigen (wie im Original) */
  descriptionWhenSelected?: boolean
  selected?: boolean
  recommended?: boolean
  /** Hervorgehobene Empfehlung mit Badge (z. B. „Repwise entscheidet“) */
  badge?: string
  icon?: IconName
  right?: ReactNode
  onClick?: () => void
  compact?: boolean
}

/**
 * Auswahlkarte im Ablauf. Empfohlene Optionen: Titel im Orange-Verlauf.
 * Gewählt: 2-pt-Rahmen – Orange-Verlauf, wenn empfohlen, sonst weiß (DECISIONS.md, Frage 16).
 */
export function OptionCard({ title, description, descriptionWhenSelected = true, selected, recommended, badge, icon, right, onClick, compact }: Props) {
  const showDesc = description && (!descriptionWhenSelected || selected)
  const frame = selected ? (recommended ? 'border-grad-accent' : 'border-2 border-fg') : 'border border-[#262626]'
  const style: CSSProperties = selected && recommended ? ({ '--fill': '#0f0d0b' } as CSSProperties) : { background: 'linear-gradient(90deg, #181818 0%, #0c0c0c 60%)' }
  return (
    <button type="button" onClick={onClick} className={`flex min-h-[54px] w-full flex-col justify-center rounded-lg text-left ${frame} ${compact ? 'px-[17px] py-[13px]' : 'px-[17px] py-[15px]'}`} style={style}>
      <div className="flex w-full items-center gap-3">
        {icon && <Icon name={icon} size={26} gradient={recommended ? ['#f3af3d', '#ed774d'] : undefined} />}
        <span className={`flex-1 text-[19px] font-semibold leading-tight ${recommended ? 'text-grad-accent' : 'text-fg'}`}>{title}</span>
        {badge && <Badge color="#ec602a">{badge}</Badge>}
        {right}
      </div>
      {showDesc && <p className={`mt-[7px] text-body leading-snug ${badge || icon ? 'text-fg-2' : 'text-fg'}`}>{description}</p>}
    </button>
  )
}
