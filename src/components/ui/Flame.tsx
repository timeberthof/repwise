import { useId } from 'react'

/** Eigene Flammen-Grafik für die Serie (Streak). */
export function Flame({ size = 30, muted }: { size?: number; muted?: boolean }) {
  const id = useId()
  return (
    <svg width={size} height={size * 1.18} viewBox="0 0 40 47" aria-hidden style={{ flexShrink: 0, opacity: muted ? 0.4 : 1 }}>
      <defs>
        <linearGradient id={`${id}o`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#f6c956" />
          <stop offset="1" stopColor="#f3a847" />
        </linearGradient>
        <linearGradient id={`${id}i`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#f07a3a" />
          <stop offset="1" stopColor="#e05827" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id}o)`}
        d="M21 1c1 7-3 10-6 14-2 3-4 4-5 2-1-2-1-4 0-6C5 15 2 21 2 28c0 10 8 18 18 18s18-7 18-17c0-11-8-17-12-22-1 3-2 5-4 6 1-4 1-9-1-12Z"
      />
      <path fill={`url(#${id}i)`} d="M21 23c3 4 7 7 7 12 0 5-4 9-8 9s-8-3-8-8c0-4 3-6 5-8 0 2 1 3 2 3 2-2 2-5 2-8Z" />
    </svg>
  )
}

/** Flamme + Zahl im Kopf („🔥 2“). */
export function StreakBadge({ value, onClick }: { value: number; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-[10px]" aria-label={`Serie: ${value}`}>
      <Flame size={19} />
      <span className="text-[22px] font-black leading-none">{value}</span>
    </button>
  )
}
