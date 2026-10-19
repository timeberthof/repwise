import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { SubHeader } from '../../components/layout/PageHeader'
import { Segmented } from '../../components/ui/Segmented'
import { ExerciseGlyph } from '../../components/ui/ExerciseGlyph'
import { Icon } from '../../components/icons/Icon'
import { useToast } from '../../components/ui/Toast'
import { getExercise } from '../../data/exercises'
import { muscleLabel } from '../../data/muskeln'
import { exerciseDetail, type SessionMetric } from '../../db/repo/stats'
import { addDays, formatDate, formatLong, today } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { TrendChart } from './charts'
import { STRENGTH_HINT } from './TrainingStats'

type Range = '4w' | '3m' | '6m' | 'all'
type Metric = 'e1rm' | 'weight' | 'reps' | 'volume'

const RANGES: { id: Range; label: string; days: number | null; text: string }[] = [
  { id: '4w', label: '4 Wo.', days: 28, text: 'letzte 4 Wochen' },
  { id: '3m', label: '3 Mon.', days: 91, text: 'letzte 3 Monate' },
  { id: '6m', label: '6 Mon.', days: 182, text: 'letzte 6 Monate' },
  { id: 'all', label: 'Gesamt', days: null, text: 'gesamter Verlauf' },
]

const METRICS: { id: Metric; label: string; unit: string; color: string; digits: number; text: string; pick: (m: SessionMetric) => number | null }[] = [
  { id: 'e1rm', label: 'Maximalkraft', unit: 'kg', color: '#ed774d', digits: 1, text: 'Ø geschätztes 1RM je Einheit', pick: (m) => m.e1rm },
  { id: 'weight', label: 'Gewicht', unit: 'kg', color: '#f3af3d', digits: 1, text: 'Ø Arbeitsgewicht je Einheit', pick: (m) => m.avgWeight },
  { id: 'reps', label: 'Wiederholungen', unit: 'Wdh', color: '#5bbd52', digits: 1, text: 'Ø Wiederholungen pro Satz je Einheit', pick: (m) => m.avgReps },
  { id: 'volume', label: 'Volumen', unit: 'kg', color: '#8a5ad6', digits: 0, text: 'Volumen je Einheit (Gewicht × Wdh, alle Sätze)', pick: (m) => m.volume },
]

function Tile({ label, value, sub, hint }: { label: string; value: string; sub?: string; hint: string }) {
  return (
    <div className="rounded-lg border border-elevated bg-surface px-3 py-3">
      <p className="text-[13px] font-semibold uppercase tracking-[0.05em] text-fg-2">{label}</p>
      <p className="mt-1 text-[22px] font-extrabold leading-tight">{value}</p>
      {sub && <p className="text-[13px] text-fg">{sub}</p>}
      <p className="mt-1 text-[12px] leading-snug text-fg-2">{hint}</p>
    </div>
  )
}

/** Detailseite einer Übung in der Statistik (Phase 4). */
export default function ExerciseStatScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const ex = getExercise(id)
  const [range, setRange] = useState<Range>('3m')
  const [metric, setMetric] = useState<Metric>('e1rm')
  const all = useLiveQuery(() => exerciseDetail(id), [id])

  const r = RANGES.find((x) => x.id === range)!
  const m = METRICS.find((x) => x.id === metric)!
  const inRange = useMemo(() => {
    if (!all) return []
    if (!r.days) return all
    const from = addDays(today(), -r.days)
    return all.filter((x) => x.date >= from)
  }, [all, r.days])

  if (!ex) return null
  const points = inRange.map((x) => ({ date: x.date, value: m.pick(x) })).filter((p): p is { date: string; value: number } => p.value !== null)
  const own = inRange.filter((x) => x.source === 'app')
  const avgOf = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const e1rmAvg = avgOf(inRange.map((x) => x.e1rm))
  const volAvg = avgOf(own.map((x) => x.volume))
  const repsAvg = avgOf(own.map((x) => x.avgReps))

  // Persönliche Bestwerte über den gesamten Verlauf
  const best = (pick: (x: SessionMetric) => number | null) => {
    let top: SessionMetric | null = null
    for (const x of all ?? []) {
      const v = pick(x)
      if (v !== null && (top === null || v > (pick(top) ?? 0))) top = x
    }
    return top
  }
  const bE = best((x) => x.e1rm)
  const bW = best((x) => x.maxWeight)
  const bR = best((x) => x.maxReps)
  const bV = best((x) => x.volume)
  const last = [...inRange].reverse()

  return (
    <div className="min-h-dvh bg-bg pb-16">
      <SubHeader title={ex.name} onBack={() => navigate(-1)} />
      <div className="flex items-center gap-4 px-5 pt-5">
        <ExerciseGlyph exercise={ex} size={56} />
        <div className="min-w-0">
          <p className="text-[15px] text-fg-2">{muscleLabel(ex.primaer)}</p>
          <p className="text-[19px] font-semibold leading-tight">{ex.name}</p>
        </div>
      </div>

      <Segmented
        small
        className="mx-5 mt-5"
        value={range}
        onChange={setRange}
        options={RANGES.map((x) => ({ id: x.id, label: x.label }))}
      />

      <div className="mx-4 mt-4 rounded-xl border border-elevated bg-surface pb-2 pt-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3">
          {METRICS.map((x) => (
            <button key={x.id} type="button" onClick={() => setMetric(x.id)} className={`h-[34px] shrink-0 rounded-md px-3 text-[14.5px] ${metric === x.id ? 'bg-fg font-semibold text-fg-inverse' : 'bg-surface-3 text-fg'}`}>
              {x.label}
            </button>
          ))}
        </div>
        <p className="mt-3 px-4 text-[14px] text-fg-2">
          {m.text} · {r.text}
        </p>
        <TrendChart points={points} color={m.color} unit={m.unit} digits={m.digits} />
        {metric !== 'e1rm' && inRange.some((x) => x.source === 'mci' && m.pick(x) === null) && (
          <p className="px-4 pb-1 text-[12px] text-fg-3">Aus der bisherigen App gibt es nur Maximalkraft-Werte.</p>
        )}
      </div>

      <p className="mx-5 mt-[22px] text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Im Zeitraum</p>
      <div className="mx-4 mt-2 grid grid-cols-3 gap-2">
        <Tile label="Ø 1RM" value={e1rmAvg !== null ? `${fmt(e1rmAvg, 1)} kg` : '–'} hint="Ø geschätzte Maximalkraft pro Einheit" />
        <Tile label="Ø Volumen" value={volAvg !== null ? `${fmt(volAvg, 0)} kg` : '–'} hint="Ø Volumen pro Einheit" />
        <Tile label="Ø Wdh" value={repsAvg !== null ? fmt(repsAvg, 1) : '–'} hint={`Ø pro Satz · ${inRange.length} ${inRange.length === 1 ? 'Einheit' : 'Einheiten'}`} />
      </div>

      <p className="mx-5 mt-[22px] flex items-center gap-2 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">
        Persönliche Bestwerte
        <button type="button" aria-label="Info" onClick={() => toast('Maximalkraft', STRENGTH_HINT)}>
          <Icon name="info" size={16} />
        </button>
      </p>
      <div className="mx-4 mt-2 grid grid-cols-2 gap-2">
        <Tile label="Bestes 1RM" value={bE?.e1rm ? `${fmt(bE.e1rm, 1)} kg` : '–'} sub={bE ? formatDate(bE.date) : undefined} hint="höchste Ø-Maximalkraft einer Einheit" />
        <Tile label="Schwerstes Gewicht" value={bW?.maxWeight ? `${fmt(bW.maxWeight)} kg` : '–'} sub={bW ? formatDate(bW.date) : undefined} hint="schwerster erledigter Satz" />
        <Tile label="Meiste Wdh" value={bR?.maxReps ? `${bR.maxReps}` : '–'} sub={bR ? `${bR.maxRepsWeight ? `bei ${fmt(bR.maxRepsWeight)} kg · ` : ''}${formatDate(bR.date)}` : undefined} hint="in einem Satz" />
        <Tile label="Höchstes Volumen" value={bV?.volume ? `${fmt(bV.volume)} kg` : '–'} sub={bV ? formatDate(bV.date) : undefined} hint="Gewicht × Wdh einer Einheit" />
      </div>

      <p className="mx-5 mt-[22px] text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Einheiten</p>
      <div className="mx-4 mt-2 flex flex-col gap-2">
        {last.map((x, i) => (
          <button
            key={`${x.date}-${i}`}
            type="button"
            disabled={!x.sessionId}
            onClick={() => x.sessionId && navigate(`/verlauf/${x.sessionId}`)}
            className="rounded-lg border border-elevated bg-surface px-4 py-3 text-left disabled:opacity-90"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[16px] font-semibold">{formatLong(x.date)}</span>
              <span className="text-[13px] text-fg-2">{x.source === 'mci' ? 'aus bisheriger App' : x.sessionName}</span>
            </div>
            {x.sets.length > 0 ? (
              <div className="mt-2 grid grid-cols-[28px_1fr_1fr_1fr] gap-y-[2px] text-[14.5px]">
                {x.sets.map((s, j) => (
                  <span key={j} className="contents">
                    <span className="text-fg-2">{j + 1}</span>
                    <span>{s.reps} Wdh</span>
                    <span>{s.weight ? `${fmt(s.weight)} kg` : 'KG'}</span>
                    <span className="text-fg-2">RIR {s.rir ?? '–'}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[14px] text-fg-2">
                {x.avgWeight ? `Arbeitsgewicht ${fmt(x.avgWeight)} kg${x.avgReps ? ` × ${x.avgReps} Wdh` : ''} · ` : ''}Satzdetails nicht verfügbar
              </p>
            )}
            <p className="mt-2 text-[13px] text-fg-2">
              {x.e1rm ? `Ø 1RM ${fmt(x.e1rm, 1)} kg` : ''}
              {x.volume ? ` · Volumen ${fmt(x.volume)} kg` : ''}
            </p>
            {x.notes.filter((n) => n.kind !== 'wochentyp').slice(0, 2).map((n, j) => (
              <p key={j} className="mt-1 flex items-start gap-1 text-[13px] text-amber">
                <Icon name="wand" size={14} gradient={['#f3af3d', '#ed774d']} className="mt-[2px]" />
                {n.reason}
              </p>
            ))}
          </button>
        ))}
        {all && !last.length && <p className="py-6 text-center text-body text-fg-2">Keine Einheiten im Zeitraum.</p>}
      </div>
    </div>
  )
}
