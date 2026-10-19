import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'
import { IconTile } from './IconTile'

/** Gruppe wie in den Einstellungen: #0F0F0F, ohne Rand, Radius 20, eingerückte Trenner. */
export function ListGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-xl bg-surface [&>*:last-child_.row-divider]:hidden ${className}`}>{children}</div>
}

interface RowProps {
  icon?: IconName
  color?: string
  title: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  onClick?: () => void
  chevron?: boolean
  right?: ReactNode
  divider?: boolean
}

export function ListRow({ icon, color = '#f3f3f3', title, subtitle, value, onClick, chevron = true, right, divider = true }: RowProps) {
  return (
    <div className="relative">
      <button type="button" onClick={onClick} disabled={!onClick} className="flex min-h-[68px] w-full items-center gap-4 px-[13px] py-3 text-left active:bg-white/5 disabled:active:bg-transparent">
        {icon && <IconTile icon={icon} color={color} bg={color === '#f3f3f3' ? '#404040' : undefined} />}
        <span className="min-w-0 flex-1">
          <span className="block text-card font-semibold">{title}</span>
          {subtitle && <span className="mt-0.5 block text-label text-fg-2">{subtitle}</span>}
        </span>
        {value !== undefined && <span className="shrink-0 text-body font-semibold text-fg">{value}</span>}
        {right}
        {chevron && onClick && <Icon name="chevronRight" size={24} className="text-fg-2" />}
      </button>
      {divider && <span className="row-divider absolute bottom-0 left-[10px] right-[10px] h-px bg-elevated" />}
    </div>
  )
}
