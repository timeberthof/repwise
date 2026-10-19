import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Icon } from '../icons/Icon'

interface Props {
  title: ReactNode
  right?: ReactNode
  children?: ReactNode
  /** Dashboard: schwarz; Training: #0F0F0F */
  tone?: 'black' | 'surface'
  className?: string
}

/**
 * Kopf der Tab-Seiten: Titel 20/900 VERSALIEN, 56 pt hoch unter der Statusleiste,
 * unten 1-pt-Rand und Radius 24, beim Scrollen halbtransparent mit Unschärfe.
 */
export function PageHeader({ title, right, children, tone = 'black', className = '' }: Props) {
  return (
    <header
      className={`sticky top-0 z-20 rounded-b-sheet border-b border-elevated ${className}`}
      style={{
        paddingTop: 'var(--safe-top)',
        background: tone === 'black' ? 'rgba(0,0,0,0.78)' : 'rgba(15,15,15,0.82)',
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      }}
    >
      <div className="flex h-14 items-center justify-between gap-3 pl-4 pr-[10px]">
        <h1 className="truncate text-screen font-black uppercase">{title}</h1>
        <div className="flex shrink-0 items-center gap-[18px]">{right}</div>
      </div>
      {children}
    </header>
  )
}

/** Kopf von Unterseiten: ‹ TITEL … Aktionen */
export function SubHeader({ title, right, onBack, children, transparent }: { title: ReactNode; right?: ReactNode; onBack?: () => void; children?: ReactNode; transparent?: boolean }) {
  const navigate = useNavigate()
  return (
    <header
      className={`sticky top-0 z-20 rounded-b-sheet ${transparent ? '' : 'border-b border-elevated'}`}
      style={{
        paddingTop: 'var(--safe-top)',
        background: transparent ? 'transparent' : 'rgba(0,0,0,0.8)',
        backdropFilter: transparent ? undefined : 'blur(22px)',
        WebkitBackdropFilter: transparent ? undefined : 'blur(22px)',
      }}
    >
      <div className="flex h-14 items-center gap-3 pl-3 pr-4">
        <button type="button" aria-label="Zurück" onClick={onBack ?? (() => navigate(-1))} className="flex h-11 w-11 items-center justify-center text-fg">
          <Icon name="chevronLeft" size={26} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-screen font-black uppercase">{title}</h1>
        <div className="flex shrink-0 items-center gap-4">{right}</div>
      </div>
      {children}
    </header>
  )
}

export function HeaderIconButton({ icon, onClick, label }: { icon: Parameters<typeof Icon>[0]['name']; onClick?: () => void; label: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex h-10 w-10 items-center justify-center text-fg">
      <Icon name={icon} size={28} />
    </button>
  )
}
