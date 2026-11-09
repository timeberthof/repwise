import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { useDoneDates } from '../../db/derived'
import { addDays, formatDate, startOfWeek, today } from '../../logic/dates'
import { fmt } from '../../logic/format'

function Tile({ title, sub, children, onClick, dim, className = '' }: { title: string; sub: string; children: ReactNode; onClick?: () => void; dim?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`relative flex min-h-[158px] flex-col justify-start overflow-hidden rounded-xl border border-elevated bg-surface px-4 pb-[13px] pt-[14px] text-left active:opacity-80 ${className}`}>
      <span className={`text-card font-semibold leading-tight ${dim ? 'text-[#262626]' : ''}`}>{title}</span>
      <span className={`mt-[3px] text-body leading-tight ${dim ? 'text-[#1f1f1f]' : 'text-fg-2'}`}>{sub}</span>
      {children}
    </button>
  )
}

/** 30-Tage-Raster: 3 Zeilen × 10 Quadrate (älteste links oben). */
function DayGrid({ filled, color }: { filled: Set<string>; color: string }) {
  const start = addDays(today(), -29)
  const days = Array.from({ length: 30 }, (_, i) => addDays(start, i))
  return (
    <div className="mt-[14px] grid grid-cols-10 gap-x-[4.4px] gap-y-[4.4px]">
      {days.map((d) => (
        <span key={d} className="aspect-square rounded-[2px]" style={{ background: filled.has(d) ? color : '#272727' }} />
      ))}
    </div>
  )
}

function WeekCount({ done, color }: { done: number; color: string }) {
  return (
    <p className="mt-[14px] flex items-baseline gap-[6px] whitespace-nowrap">
      <span className="h-[10px] w-[10px] rounded-[2px]" style={{ background: color }} />
      <span className="text-[18px] font-extrabold">{done}</span>
      <span className="text-[14px] text-fg-2">diese Woche</span>
    </p>
  )
}

/** Gewicht: letzter Wert und Veränderung zum vorherigen Eintrag (ohne Bewertung). */
export function WeightTile() {
  const navigate = useNavigate()
  const weights = useLiveQuery(() => db.body.where('kind').equals('weight').sortBy('date'), [])
  const last = weights?.at(-1)
  const prev = weights?.at(-2)
  const recent = (weights ?? []).slice(-8)
  const min = Math.min(...recent.map((w) => w.value))
  const max = Math.max(...recent.map((w) => w.value))
  const d = last && prev ? Math.round((last.value - prev.value) * 10) / 10 : null
  return (
    <Tile title="Gewicht" sub={last ? `Zuletzt ${formatDate(last.date)}` : 'Noch kein Eintrag'} onClick={() => navigate('/koerper')}>
      {recent.length > 1 && (
        <div className="mt-3 flex h-[44px] items-end gap-[4px]">
          {recent.map((w) => (
            <span key={w.id} className="flex-1 rounded-[2px] bg-[#5bbd52]" style={{ height: `${max === min ? 60 : 25 + ((w.value - min) / (max - min)) * 75}%` }} />
          ))}
        </div>
      )}
      <p className="mt-auto flex items-baseline gap-[6px] whitespace-nowrap pt-3">
        <span className="text-[22px] font-extrabold">{last ? fmt(last.value, 1) : '–'}</span>
        <span className="text-[14px] text-fg-2">kg{d !== null ? ` · ${d > 0 ? '+' : d < 0 ? '−' : '±'}${fmt(Math.abs(d), 1)}` : ''}</span>
      </p>
    </Tile>
  )
}

export function TrainingsTile() {
  const navigate = useNavigate()
  const done = useDoneDates()
  const filled = done ?? new Set<string>()
  const weekStart = startOfWeek(today())
  const thisWeek = [...filled].filter((d) => d >= weekStart && d <= today()).length
  return (
    <Tile title="Trainings" sub="Letzte 30 Tage" onClick={() => navigate('/training')}>
      <DayGrid filled={filled} color="#ed774d" />
      <WeekCount done={thisWeek} color="#ed774d" />
    </Tile>
  )
}
