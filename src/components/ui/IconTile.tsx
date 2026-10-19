import { Icon, type IconName } from '../icons/Icon'

interface Props {
  icon: IconName
  /** Icon-Farbe; die Kachel ist dieselbe Farbe mit 25 % Deckkraft auf Schwarz. */
  color: string
  size?: 22 | 28 | 36
  bg?: string
  className?: string
}

/** Farbige Icon-Kachel (Einstellungen, Einheiten-Karten, Trainingstypen). */
export function IconTile({ icon, color, size = 28, bg, className = '' }: Props) {
  const iconSize = size === 36 ? 26 : size === 28 ? 20 : 16
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${size === 36 ? 'rounded-sm' : 'rounded-[7px]'} ${className}`}
      style={{ width: size, height: size, background: bg ?? tint(color), color }}
    >
      <Icon name={icon} size={iconSize} />
    </span>
  )
}

/** Farbe mit 25 % Deckkraft auf Schwarz (gemessene Regel aus dem Original). */
export function tint(hex: string, alpha = 0.25): string {
  const h = hex.replace('#', '')
  const r = Math.round(parseInt(h.slice(0, 2), 16) * alpha)
  const g = Math.round(parseInt(h.slice(2, 4), 16) * alpha)
  const b = Math.round(parseInt(h.slice(4, 6), 16) * alpha)
  return `rgb(${r}, ${g}, ${b})`
}
