import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { useProfile } from '../../db/hooks'
import { cardioWeeks } from '../../db/repo/stats'
import { addDays, ageOn, formatLong, today } from '../../logic/dates'
import { hrMax, zoneRange, ZONES, type ZoneNumber } from '../../logic/heartRate'
import { fmt } from '../../logic/format'
import { Button } from '../../components/ui/Button'
import { IconTile } from '../../components/ui/IconTile'
import { CARDIO_ACTIVITIES } from '../cardio/activities'
import { DayBarChart } from './charts'
import { Kpi, StatCard } from './StatCard'

/** Statistik › Cardio: Dauer pro Woche, Ø-Puls, Verteilung nach Aktivität, Pulszonen, letzte Einheiten. */
export function CardioStats() {
  const navigate = useNavigate()
  const profile = useProfile()
  const weeks = useLiveQuery(() => cardioWeeks(6), [])
  const recent = useLiveQuery(() => db.cardio.orderBy('date').reverse().limit(8).toArray(), [])
  const last90 = useLiveQuery(() => db.cardio.where('date').aboveOrEqual(addDays(today(), -89)).toArray(), [])
  const max = profile ? hrMax(ageOn(profile.birthDate), profile.hrMaxOverride) : null
  const last4 = (weeks ?? []).slice(-4)
  const minutes4 = last4.reduce((s, w) => s + w.value, 0)
  const count4 = last4.reduce((s, w) => s + w.count, 0)
  const withHr = (recent ?? []).filter((c) => c.avgHr)
  const avgHr = withHr.length ? Math.round(withHr.reduce((s, c) => s + (c.avgHr ?? 0), 0) / withHr.length) : null

  // Verteilung nach Aktivität (Minuten, letzte 90 Tage)
  const dist = CARDIO_ACTIVITIES.map((a) => {
    const list = (last90 ?? []).filter((c) => c.activity === a.id)
    return { ...a, minutes: list.reduce((s, c) => s + c.durationMin, 0), count: list.length }
  })
    .filter((d) => d.count > 0)
    .sort((a, b) => b.minutes - a.minutes)
  const distTotal = dist.reduce((s, d) => s + d.minutes, 0)

  return (
    <div className="flex flex-col gap-[14px] px-4 pb-4">
      <div className="flex gap-2">
        <Kpi value={count4} label="Einheiten" hint="letzte 4 Wochen" />
        <Kpi value={fmt(minutes4)} label="Minuten" hint="Summe, letzte 4 Wochen" />
        <Kpi value={avgHr ?? '–'} label="Ø Puls" hint="bpm, letzte 8 Einheiten mit Puls" />
      </div>
      <StatCard title="Cardio pro Woche" sub="Minuten je Kalenderwoche · letzte 6 Wochen">
        <DayBarChart data={(weeks ?? []).map((w) => ({ date: w.date, label: ['', ''], value: w.value }))} color="#8a5ad6" unit="Min" weekLabels />
      </StatCard>

      {dist.length > 0 && (
        <StatCard title="Nach Aktivität" sub={`Anteil an der Cardio-Zeit · letzte 90 Tage · ${fmt(distTotal)} Min gesamt`}>
          <div className="flex flex-col gap-3 px-4 pb-4 pt-2">
            {dist.map((d) => (
              <div key={d.id}>
                <div className="flex items-center justify-between text-[15px]">
                  <span className="flex items-center gap-2">
                    <IconTile icon={d.icon} color="#8a5ad6" bg="#1a0f2e" size={22} />
                    {d.label}
                  </span>
                  <span className="text-fg-2">
                    {fmt(d.minutes)} Min · {d.count}×
                  </span>
                </div>
                <div className="mt-[6px] h-[6px] rounded-full bg-elevated">
                  <div className="h-full rounded-full bg-[#8a5ad6]" style={{ width: `${Math.max(3, (d.minutes / Math.max(1, distTotal)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </StatCard>
      )}

      {max && profile && (
        <StatCard
          title="Deine Pulszonen"
          sub={`HFmax ${max} bpm ${profile.hrMaxOverride ? '(eigener Wert)' : '(208 − 0,7 × Alter)'}${profile.hrZones ? ' · eigene Grenzen' : ''} · Ziel: ${ZONES[profile.cardioZone - 1].label}`}
          onClick={() => navigate('/einstellungen/cardio')}
        >
          <div className="flex flex-col gap-1 px-4 pb-4 pt-2">
            {ZONES.map((z) => {
              const r = zoneRange(z.zone as ZoneNumber, max, profile.hrZones)
              return (
                <div key={z.zone} className={`flex justify-between text-[15px] ${z.zone === profile.cardioZone ? 'font-semibold text-fg' : 'text-fg-2'}`}>
                  <span>
                    {z.label} · {z.name}
                  </span>
                  <span>
                    {r.min}–{r.max} bpm
                  </span>
                </div>
              )
            })}
          </div>
        </StatCard>
      )}
      {(recent ?? []).length > 0 && (
        <div className="overflow-hidden rounded-xl bg-surface">
          {recent!.map((c, i) => {
            const a = CARDIO_ACTIVITIES.find((x) => x.id === c.activity)!
            return (
              <button key={c.id} type="button" onClick={() => navigate(`/cardio/${c.id}`)} className={`flex w-full items-center gap-3 px-4 py-3 text-left ${i < recent!.length - 1 ? 'border-b border-elevated' : ''}`}>
                <IconTile icon={a.icon} color="#673ab7" bg="#1a0f2e" size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">{c.activityText || a.label}</span>
                  <span className="block text-[13px] text-fg-2">{formatLong(c.date)}</span>
                </span>
                <span className="text-right text-[14px]">
                  {c.durationMin} Min
                  <span className="block text-fg-2">{c.avgHr ? `Ø ${c.avgHr} bpm` : `Zone ${c.zone}`}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
      <Button variant="secondary" icon="add" onClick={() => navigate('/cardio/neu')}>
        Cardio eintragen
      </Button>
    </div>
  )
}
