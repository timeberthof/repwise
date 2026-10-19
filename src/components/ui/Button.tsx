import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'

type Variant = 'primary' | 'secondary' | 'ghost'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: IconName
  /** Text zentriert (Standard) oder links mit Icon rechts */
  align?: 'center' | 'between'
  children: ReactNode
}

const styles: Record<Variant, string> = {
  primary: 'bg-fg text-fg-inverse disabled:bg-disabled disabled:text-[#9a9a9a]',
  secondary: 'bg-elevated text-fg disabled:opacity-50',
  ghost: 'bg-transparent text-fg',
}

/** Großer Button (56 pt) wie „Weiter“, „Starten ▶“, „Hinzufügen +“. */
export function Button({ variant = 'primary', icon, align, className = '', children, ...rest }: Props) {
  const a = align ?? (icon ? 'between' : 'center')
  return (
    <button
      type="button"
      className={`flex h-14 w-full items-center gap-3 rounded-xl px-6 text-card font-bold transition-transform active:scale-[0.98] disabled:active:scale-100 ${
        a === 'between' ? 'justify-between' : 'justify-center'
      } ${styles[variant]} ${className}`}
      {...rest}
    >
      <span className="truncate">{children}</span>
      {icon && <Icon name={icon} size={variant === 'primary' ? 22 : 24} className="shrink-0" />}
    </button>
  )
}

/** Feste Leiste unten (über dem Home-Indikator) für Buttons. */
export function BottomBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`pointer-events-none fixed inset-x-0 bottom-0 z-30 px-5 ${className}`} style={{ paddingBottom: 'max(var(--safe-bottom), 16px)' }}>
      <div className="pointer-events-auto flex gap-3">{children}</div>
    </div>
  )
}
