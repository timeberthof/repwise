import type { HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  bordered?: boolean
  padded?: boolean
  children: ReactNode
  as?: 'div' | 'button'
}

/** Inhaltskarte: #0F0F0F, 1-pt-Rand #272727, Radius 20. */
export function Card({ bordered = true, padded = true, className = '', children, onClick, ...rest }: Props) {
  const cls = `block w-full rounded-xl bg-surface text-left ${bordered ? 'border border-elevated' : ''} ${padded ? 'p-4' : ''} ${onClick ? 'active:opacity-80' : ''} ${className}`
  if (onClick) {
    return (
      <div role="button" tabIndex={0} className={cls} onClick={onClick} {...rest}>
        {children}
      </div>
    )
  }
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  )
}
