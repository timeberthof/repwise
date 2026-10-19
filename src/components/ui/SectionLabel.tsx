import type { ReactNode } from 'react'
import { Icon } from '../icons/Icon'

interface Props {
  children: ReactNode
  chevron?: boolean
  onClick?: () => void
  onInfo?: () => void
  right?: ReactNode
  className?: string
}

/** Abschnitts-Überschrift: VERSALIEN, 12 pt, grau – z. B. „WILLKOMMEN ZURÜCK“, „RÜCKEN ›“, „GEWICHT ⓘ“. */
export function SectionLabel({ children, chevron, onClick, onInfo, right, className = '' }: Props) {
  return (
    <div className={`flex items-center justify-between px-5 ${className}`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!onClick}
          onClick={onClick}
          className="flex items-center gap-2 text-section font-semibold uppercase tracking-[0.06em] text-fg-2 disabled:cursor-default"
        >
          {children}
          {chevron && <Icon name="chevronRight" size={16} />}
        </button>
        {onInfo && (
          <button type="button" onClick={onInfo} className="text-fg-2" aria-label="Info">
            <Icon name="info" size={20} />
          </button>
        )}
      </div>
      {right}
    </div>
  )
}
