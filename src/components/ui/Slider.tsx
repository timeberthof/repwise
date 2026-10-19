import { useRef, type PointerEvent } from 'react'

interface Props {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  /** Orange Daumen (Verlauf) statt weiß */
  accent?: boolean
  /** Empfohlener/geschätzter Bereich (schraffiert, gestrichelte Ränder) */
  range?: [number, number]
  className?: string
  ariaLabel?: string
}

/** Schieberegler wie im Original: Track 6 pt, Füllung weiß, Daumen 28 pt. */
export function Slider({ value, min, max, step = 1, onChange, accent, range, className = '', ariaLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const pct = ((value - min) / (max - min)) * 100

  const setFromEvent = (e: PointerEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width)
    const raw = min + (x / rect.width) * (max - min)
    const v = Math.round(raw / step) * step
    onChange(Math.min(max, Math.max(min, Number(v.toFixed(4)))))
  }

  const r0 = range ? ((range[0] - min) / (max - min)) * 100 : 0
  const r1 = range ? ((range[1] - min) / (max - min)) * 100 : 0

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      className={`relative h-10 touch-none select-none ${className}`}
      onPointerDown={(e) => {
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        setFromEvent(e)
      }}
      onPointerMove={(e) => e.buttons && setFromEvent(e)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onChange(Math.min(max, value + step))
        if (e.key === 'ArrowLeft') onChange(Math.max(min, value - step))
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-[7px] -translate-y-1/2 rounded-full bg-elevated" />
      {range && (
        <div
          className="absolute top-1/2 h-[26px] -translate-y-1/2 border-x-2 border-dashed border-orange"
          style={{ left: `${r0}%`, width: `${r1 - r0}%`, background: 'rgba(237,119,77,0.16)' }}
        />
      )}
      <div className="absolute left-0 top-1/2 h-[7px] -translate-y-1/2 rounded-full bg-fg" style={{ width: `${pct}%` }} />
      <div
        className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${pct}%`,
          background: accent ? 'radial-gradient(circle at 50% 50%, #f19c3c 0 45%, #fff 46%)' : '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}

/** Skala 0–10 mit Strichen und Zahlen (Muskelkater). Aktiver Wert orange. */
export function ScaleSlider({ value, onChange, left, right }: { value: number; onChange: (v: number) => void; left: string; right: string }) {
  return (
    <div>
      <Slider value={value} min={0} max={10} onChange={onChange} className="mx-1" ariaLabel={`${left} bis ${right}`} />
      <div className="mt-2 flex justify-between px-1">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} type="button" onClick={() => onChange(i)} className="flex w-5 flex-col items-center gap-2">
            <span className={`h-3 w-[2px] ${i === value ? 'bg-action' : 'bg-fg'}`} />
            <span className={`text-body ${i === value ? 'font-semibold text-action' : 'text-fg-2'}`}>{i}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-body text-fg">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  )
}
