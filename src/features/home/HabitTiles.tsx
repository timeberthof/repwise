import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { useCalories, useDoneDates } from '../../db/derived'
import { useProfile } from '../../db/hooks'
import { addDays, startOfWeek, today, weekDates } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { Icon } from '../../components/icons/Icon'

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

function WeekProgress({ done, goal, color, unit = 'diese Woche' }: { done: number; goal: number; color: string; unit?: string }) {
  return (
    <>
      <div className="mt-[13px] h-[4px] rounded-full bg-elevated">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (done / Math.max(goal, 1)) * 100)}%`, background: color }} />
      </div>
      <p className="mt-[12px] flex items-baseline gap-[6px] whitespace-nowrap">
        <span className="text-[18px] font-extrabold">
          {done}/{goal}
        </span>
        <span className="text-[14px] text-fg-2">{unit}</span>
      </p>
    </>
  )
}

export function StepsTile({ onOpen }: { onOpen: () => void }) {
  const data = useLiveQuery(async () => {
    const from = addDays(today(), -7)
    const list = await db.steps.where('date').between(from, today(), true, true).toArray()
    return list
  }, [])
  const yesterday = addDays(today(), -1)
  const entries = (data ?? []).filter((e) => e.steps)
  const latest = entries.sort((a, b) => a.date.localeCompare(b.date)).pop()
  const hasData = !!latest
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), -7 + i))
  const max = Math.max(1, ...days.map((d) => (data ?? []).find((e) => e.date === d)?.steps ?? 0))
  return (
    <Tile title="Schritte" sub={latest?.date === yesterday ? 'Gestern' : 'Letzte 7 Tage'} onClick={onOpen} dim={!hasData}>
      {hasData ? (
        <>
          <div className="mt-3 flex h-[52px] items-end gap-[5px] px-1">
            {days.map((d) => {
              const v = (data ?? []).find((e) => e.date === d)?.steps ?? 0
              return <span key={d} className="flex-1 rounded-[3px]" style={{ height: `${Math.max(6, (v / max) * 100)}%`, background: '#613cb0' }} />
            })}
          </div>
          <p className="mt-[10px] flex items-center justify-between whitespace-nowrap">
            <span>
              <span className="text-[18px] font-extrabold">{fmt(latest.steps ?? 0)}</span> <span className="text-[14px] text-fg-2">Schritte</span>
            </span>
            <Icon name="chevronRight" size={22} className="text-fg" />
          </p>
        </>
      ) : (
        <>
          {/* Illustration wie im Original: drei violette Balken über einer Grundlinie */}
          <div className="absolute left-1/2 top-[34px] flex h-[60px] -translate-x-1/2 items-end gap-[3px] border-b border-[#3a3a3a] px-1">
            <span className="h-[40%] w-[13px] bg-purple" />
            <span className="h-full w-[13px] bg-purple" />
            <span className="h-[68%] w-[13px] bg-purple" />
          </div>
          <span className="absolute inset-x-0 top-[104px] px-2 text-center text-card font-bold leading-[1.15]">Noch keine Schritte eingetragen.</span>
        </>
      )}
    </Tile>
  )
}

export function CaloriesTile() {
  const navigate = useNavigate()
  const cal = useCalories()
  const ratio = cal ? cal.target / cal.tdee : 0
  const r = 41
  const c = 2 * Math.PI * r
  return (
    <Tile title="Kalorien" sub="Ziel pro Tag" onClick={() => navigate('/einstellungen/ziele')}>
      <div className="relative mx-auto mt-[10px] h-[92px] w-[92px]">
        <svg viewBox="0 0 92 92" className="absolute inset-0 -rotate-90">
          <circle cx="46" cy="46" r={r} fill="none" stroke="#272727" strokeWidth="8" />
          {cal && <circle cx="46" cy="46" r={r} fill="none" stroke="#5bbd52" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${c * Math.min(ratio, 1)} ${c}`} />}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[19px] font-extrabold leading-none">{cal ? fmt(cal.target) : '–'}</span>
          <span className="mt-1 text-[13px] text-fg-2">kcal</span>
        </div>
      </div>
      <Icon name="chevronRight" size={24} className="absolute bottom-4 right-4" />
    </Tile>
  )
}

export function WeighInTile({ onOpen }: { onOpen: () => void }) {
  const weights = useLiveQuery(() => db.body.where('kind').equals('weight').filter((b) => b.date >= addDays(today(), -29)).toArray(), [])
  const filled = new Set((weights ?? []).map((w) => w.date))
  const week = weekDates(today())
  const thisWeek = week.filter((d) => filled.has(d)).length
  return (
    <Tile title="Weigh-In" sub="Letzte 30 Tage" onClick={onOpen}>
      <DayGrid filled={filled} color="#5bbd52" />
      <WeekProgress done={thisWeek} goal={7} color="#5bbd52" />
    </Tile>
  )
}

export function TrainingsTile() {
  const navigate = useNavigate()
  const profile = useProfile()
  const done = useDoneDates()
  const filled = done ?? new Set<string>()
  const weekStart = startOfWeek(today())
  const thisWeek = [...filled].filter((d) => d >= weekStart && d <= today()).length
  return (
    <Tile title="Trainings" sub="Letzte 30 Tage" onClick={() => navigate('/training')}>
      <DayGrid filled={filled} color="#ed774d" />
      <WeekProgress done={thisWeek} goal={profile?.daysPerWeek ?? 0} color="#ed774d" />
    </Tile>
  )
}
