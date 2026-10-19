import { useId, type CSSProperties } from 'react'
import { ICON_PATHS, type IconName } from './paths'

export type { IconName }

interface Props {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
  /** Füllung mit Farbverlauf, z. B. aktives Training-Icon */
  gradient?: [string, string]
  title?: string
}

export function Icon({ name, size = 24, className, style, gradient, title }: Props) {
  const id = useId()
  return (
    <svg
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      className={className}
      style={{ flexShrink: 0, ...style }}
      fill={gradient ? `url(#${id})` : 'currentColor'}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {gradient && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradient[0]} />
            <stop offset="100%" stopColor={gradient[1]} />
          </linearGradient>
        </defs>
      )}
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

export const GRAD_ACCENT: [string, string] = ['#f3af3d', '#ed774d']
export const GRAD_GREEN: [string, string] = ['#1ebf3e', '#8bc54c']
