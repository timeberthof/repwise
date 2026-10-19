import { useRef, useState } from 'react'
import type { Hint } from './useHints'

/** Dunkle Hintergrundgrafik der Hinweiskarte (eigene Zeichnung, ersetzt den Trend-Pfeil des Originals). */
function Graphic({ kind }: { kind?: Hint['graphic'] }) {
  const stroke = '#272727'
  if (kind === 'steps')
    return (
      <svg viewBox="0 0 120 100" className="absolute -right-2 top-4 h-[110px] w-[130px]" aria-hidden>
        <path d="M30 70c-6-14 2-30 12-30s14 14 8 30-14 10-20 0Z M76 50c-6-14 2-30 12-30s14 14 8 30-14 10-20 0Z" fill={stroke} />
      </svg>
    )
  if (kind === 'backup')
    return (
      <svg viewBox="0 0 120 100" className="absolute -right-2 top-4 h-[110px] w-[130px]" aria-hidden>
        <path d="M60 18v50M38 46l22 22 22-22M24 80h72" fill="none" stroke={stroke} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  if (kind === 'scale')
    return (
      <svg viewBox="0 0 120 100" className="absolute -right-2 top-4 h-[110px] w-[130px]" aria-hidden>
        <rect x="20" y="20" width="80" height="70" rx="16" fill="none" stroke={stroke} strokeWidth="12" />
        <path d="M60 42l10-10" stroke={stroke} strokeWidth="10" strokeLinecap="round" />
      </svg>
    )
  return (
    <svg viewBox="0 0 160 110" className="absolute right-2 top-6 h-[112px] w-[170px]" aria-hidden>
      <path d="M12 100 64 48l30 30 52-52" fill="none" stroke={stroke} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M112 14h40v40" fill="none" stroke={stroke} strokeWidth="18" strokeLinecap="square" />
    </svg>
  )
}

export function HintCarousel({ hints, onAction }: { hints: Hint[]; onAction: (h: Hint) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  if (!hints.length) return null
  return (
    <div>
      <div
        ref={ref}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5"
        onScroll={(e) => {
          const el = e.currentTarget
          setIndex(Math.round(el.scrollLeft / (el.clientWidth - 28)))
        }}
      >
        {hints.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onAction(h)}
            className="relative flex h-[150px] w-[calc(100vw-40px)] shrink-0 snap-center flex-col items-start justify-start overflow-hidden rounded-xl border border-elevated bg-surface px-4 text-left active:opacity-80"
          >
            <Graphic kind={h.graphic} />
            <span className="relative block pt-[20px] text-card font-semibold leading-tight">{h.title}</span>
            <span className="relative mt-[5px] block text-body leading-[1.3] text-fg-2">{h.text}</span>
          </button>
        ))}
      </div>
      {hints.length > 1 && (
        <div className="mt-[7px] flex justify-center gap-[4px]">
          {hints.map((h, i) => (
            <span key={h.id} className={`h-[6px] w-[6px] rounded-full ${i === index ? 'bg-fg' : 'bg-elevated'}`} />
          ))}
        </div>
      )}
    </div>
  )
}
