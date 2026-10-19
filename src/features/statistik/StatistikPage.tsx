import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { TrainingStats } from './TrainingStats'
import { BodyStats } from './BodyStats'
import { CardioStats } from './CardioStats'

type Tab = 'training' | 'koerper' | 'cardio'

const TABS: { id: Tab; label: string; colors: [string, string, string, string]; line: string }[] = [
  { id: 'training', label: 'Training', colors: ['#ea744c', '#cd6643', '#a15134', '#5c2e1d'], line: '#ed774d' },
  { id: 'koerper', label: 'Körper', colors: ['#6bc95f', '#5bbc51', '#479540', '#224a1f'], line: '#5bbd52' },
  { id: 'cardio', label: 'Cardio', colors: ['#8a5ad6', '#673ab7', '#4d2b8a', '#24143f'], line: '#8a5ad6' },
]

/**
 * STATISTIKEN (S07–S16): Kopf mit Farbverlauf je Bereich, Unter-Tabs Training · Körper · Cardio
 * (Ernährung entfällt, DECISIONS.md). Wischen wechselt die Unter-Tabs.
 */
export function StatistikPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('training')
  const [scrolled, setScrolled] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const idx = TABS.findIndex((t) => t.id === tab)
  const cur = TABS[idx]

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const swipe = (dx: number) => {
    if (dx < 0 && idx < TABS.length - 1) setTab(TABS[idx + 1].id)
    if (dx > 0 && idx > 0) setTab(TABS[idx - 1].id)
    if (dx > 0 && idx === 0) navigate('/training')
  }

  const [c0, c1, c2, c3] = cur.colors
  return (
    <div className="relative min-h-full bg-bg">
      {/* Farbverlauf hinter Kopf und erstem Inhalt */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[430px] transition-[background] duration-300"
        style={{ background: `radial-gradient(120% 70% at 0% 0%, ${c0} 0%, transparent 60%), linear-gradient(180deg, ${c1} 0%, ${c2} 28%, ${c3} 55%, #000 100%)` }}
      />
      <div ref={sentinel} className="absolute top-[60px] h-px w-px" />
      <header
        className="sticky top-0 z-20 rounded-b-sheet transition-colors"
        style={{
          paddingTop: 'var(--safe-top)',
          background: scrolled ? `color-mix(in srgb, ${c3} 55%, rgba(0,0,0,0.85))` : 'transparent',
          backdropFilter: scrolled ? 'blur(22px)' : undefined,
          WebkitBackdropFilter: scrolled ? 'blur(22px)' : undefined,
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        }}
      >
        <div className="flex h-14 items-center pl-5">
          <h1 className="text-screen font-black uppercase">Statistiken</h1>
        </div>
        <nav className="flex justify-around px-2 pt-[8px]" aria-label="Statistik-Bereiche">
          {TABS.map((t) => {
            const on = t.id === tab
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} className="relative flex flex-col items-center px-3 pb-[13px]" aria-current={on ? 'page' : undefined}>
                <span className={`text-[20px] font-semibold ${on ? 'text-fg' : 'text-fg-2'}`}>{t.label}</span>
                {on && <span className="absolute bottom-0 h-[3px] w-[60px] rounded-full" style={{ background: t.line }} />}
              </button>
            )
          })}
        </nav>
      </header>

      <div
        className="relative min-h-[60vh] pt-[30px]"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (!touch.current) return
          const dx = e.changedTouches[0].clientX - touch.current.x
          const dy = e.changedTouches[0].clientY - touch.current.y
          touch.current = null
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) swipe(dx)
        }}
      >
        {tab === 'training' && <TrainingStats />}
        {tab === 'koerper' && <BodyStats />}
        {tab === 'cardio' && <CardioStats />}
      </div>
    </div>
  )
}
