import { useEffect, useState } from 'react'
import type { Exercise, WeekType, WeightRow } from '../../db/types'
import { manualSetRange } from '../../db/repo/sessions'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { StepperField } from '../../components/ui/Stepper'
import { Toggle } from '../../components/ui/Toggle'
import { Icon } from '../../components/icons/Icon'
import { RecommendedLegend } from '../flow/FlowLayout'
import { AdjustmentBox } from './AdjustmentBox'
import type { WorkoutExercise } from './useWorkout'
import { REP_RANGES, isRecommendedRange, recommendedRepRanges } from '../../logic/roles'
import { expandRows, getWeightConfig, resetWeightConfig, saveWeightConfig, stepFor } from '../../db/repo/weights'
import { fmt } from '../../logic/format'
import { db } from '../../db/db'

function CancelConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="flex gap-[22px]">
      <Button variant="secondary" icon="close" onClick={onCancel}>
        Abbrechen
      </Button>
      <Button icon="check" onClick={onConfirm}>
        Bestätigen
      </Button>
    </div>
  )
}

/** SÄTZE (S35): Stepper; zeigt die automatische Anpassung der Satzzahl mit Grund. */
export function SetsSheet({ open, onClose, item, onSave, weekType = 'normal' }: { open: boolean; onClose: () => void; item: WorkoutExercise | null; onSave: (n: number) => void; weekType?: WeekType }) {
  const [lo, hi] = manualSetRange(weekType, item?.doneCount ?? 0)
  const [n, setN] = useState(3)
  useEffect(() => {
    if (open && item) setN(item.sets)
  }, [open, item])
  const note = item?.adjustments.find((a) => a.field === 'sets' && a.kind !== 'manuell')
  return (
    <BottomSheet open={open} onClose={onClose} label="Sätze" footer={<CancelConfirm onCancel={onClose} onConfirm={() => (onSave(n), onClose())} />}>
      <SheetTitle>Sätze</SheetTitle>
      <div className="px-6 pb-4">
        {note && <AdjustmentBox note={note} className="mb-[22px]" />}
        <StepperField value={n} onChange={setN} min={lo} max={hi} digits={0} />
        <p className="mt-3 text-center text-label text-fg-2">
          {lo}–{hi} Arbeitssätze pro Übung{weekType === 'deload' ? ' (Deload-Woche)' : ''}. Aufwärmsätze zählen nicht mit.
        </p>
      </div>
    </BottomSheet>
  )
}

/** WIEDERHOLUNGEN (S33): 5–8 / 6–10 / 8–12 / 10–15 / 12–20, Empfehlung nach Rolle hervorgehoben. */
export function RepsSheet({ open, onClose, item, onSave }: { open: boolean; onClose: () => void; item: WorkoutExercise | null; onSave: (min: number, max: number) => void }) {
  const [sel, setSel] = useState<[number, number]>([8, 12])
  useEffect(() => {
    if (open && item) setSel([item.repMin, item.repMax])
  }, [open, item])
  if (!item) return null
  const seconds = item.exercise.einheit === 'sekunden'
  const ranges: [number, number][] = seconds
    ? [
        [20, 30],
        [30, 45],
        [45, 60],
      ]
    : REP_RANGES
  const best = recommendedRepRanges(item.exercise)[0]
  return (
    <BottomSheet open={open} onClose={onClose} label="Wiederholungen" footer={<CancelConfirm onCancel={onClose} onConfirm={() => (onSave(sel[0], sel[1]), onClose())} />}>
      <SheetTitle>{seconds ? 'Sekunden' : 'Wiederholungen'}</SheetTitle>
      <div className="grid grid-cols-3 gap-[12px] px-6">
        {ranges.map(([a, b]) => {
          const on = sel[0] === a && sel[1] === b
          const rec = !seconds && isRecommendedRange(item.exercise, a, b)
          return (
            <button
              key={`${a}-${b}`}
              type="button"
              onClick={() => setSel([a, b])}
              className={`flex h-[60px] items-center justify-center rounded-lg text-[20px] font-bold ${on ? (rec ? 'border-grad-accent' : 'border-2 border-fg bg-surface') : 'border-2 border-transparent bg-elevated'}`}
            >
              <span className={rec ? 'text-grad-accent' : 'text-fg'}>
                {a} - {b}
              </span>
            </button>
          )
        })}
      </div>
      {!seconds && (
        <>
          <RecommendedLegend className="mt-[18px]" />
          <p className="mt-3 px-6 pb-4 text-center text-label text-fg-2">
            Am besten für diese Übung: {best[0]}–{best[1]} Wdh. Die Änderung gilt auch für Deinen Plan.
          </p>
        </>
      )}
    </BottomSheet>
  )
}

/** VERFÜGBARE GEWICHTE (S34) – je Übung, als Reihen (von/bis/Schritte) oder einzeln. */
export function WeightsSheet({ open, onClose, exercise }: { open: boolean; onClose: () => void; exercise: Exercise | null }) {
  const [rows, setRows] = useState<WeightRow[]>([])
  const [individual, setIndividual] = useState(false)
  const [custom, setCustom] = useState<number[]>([])
  const [newW, setNewW] = useState('')
  const [own, setOwn] = useState(false)

  useEffect(() => {
    if (!open || !exercise) return
    getWeightConfig(exercise.id).then((c) => {
      // Ohne eigene Einstellung: Reihe aus dem Gewichtssprung des Gerätetyps vorschlagen
      const step = stepFor(exercise) || 2.5
      const r = c.own ? c.rows : [{ from: step, to: 300, step }]
      setOwn(c.own)
      setRows(r)
      setIndividual(!!c.custom)
      setCustom(c.custom ?? expandRows(r))
    })
  }, [open, exercise])

  if (!exercise) return null
  const list = individual ? [...custom].sort((a, b) => a - b) : expandRows(rows)
  const save = async () => {
    await saveWeightConfig(exercise.id, rows, individual ? custom : null)
    onClose()
  }
  const reset = async () => {
    await resetWeightConfig(exercise.id)
    onClose()
  }
  const setRow = (i: number, patch: Partial<WeightRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const num = (v: string) => Number(v.replace(',', '.')) || 0

  return (
    <BottomSheet open={open} onClose={onClose} full label="Verfügbare Gewichte" action={{ label: 'Speichern', onClick: save }}>
      <SheetTitle sub={`Gilt für „${exercise.name}“. Die Steigerung nutzt die nächste verfügbare Stufe.${own ? '' : ' Aktuell gilt der Gewichtssprung aus den Einstellungen.'}`}>Verfügbare Gewichte</SheetTitle>
      <div className="px-6 pb-10">
        {own && (
          <button type="button" onClick={reset} className="mb-3 text-[14px] font-semibold text-amber underline underline-offset-2">
            Eigene Gewichte entfernen (Standard nutzen)
          </button>
        )}
        <div className="flex min-h-[64px] items-center justify-between rounded-lg border border-elevated px-4">
          <span className="text-[17px]">Gewichte einzeln einstellen</span>
          <Toggle checked={individual} onChange={(v) => (setIndividual(v), v && setCustom(expandRows(rows)))} label="Gewichte einzeln einstellen" />
        </div>
        {!individual && (
          <>
            <div className="mt-[26px] grid grid-cols-[1fr_1fr_1fr_32px] gap-x-[9px] text-center text-section font-semibold uppercase tracking-[0.06em] text-fg-2">
              <span>Von</span>
              <span>Bis</span>
              <span>Schritte</span>
              <span />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="mt-[10px] grid grid-cols-[1fr_1fr_1fr_32px] items-center gap-x-[9px]">
                {(['from', 'to', 'step'] as const).map((k) => (
                  <label key={k} className="flex h-[54px] items-center justify-center rounded-lg border border-elevated text-[18px]">
                    <input inputMode="decimal" value={fmt(r[k])} onChange={(e) => setRow(i, { [k]: num(e.target.value) })} className="w-[52px] bg-transparent text-right outline-none" aria-label={k} />
                    <span>kg</span>
                  </label>
                ))}
                <button type="button" aria-label="Reihe löschen" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="flex justify-center text-fg">
                  <Icon name="delete" size={26} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setRows([...rows, { from: 1, to: 10, step: 1 }])} className="mt-3 h-[54px] w-full rounded-lg bg-elevated text-[18px] font-bold">
              Reihe hinzufügen
            </button>
          </>
        )}
        {individual && (
          <div className="mt-[20px] flex gap-3">
            <input inputMode="decimal" value={newW} onChange={(e) => setNewW(e.target.value)} placeholder="Gewicht in kg" className="h-[54px] flex-1 rounded-lg border border-elevated bg-transparent px-4 text-[18px] outline-none" />
            <button
              type="button"
              onClick={() => {
                const v = num(newW)
                if (v > 0 && !custom.includes(v)) setCustom([...custom, v])
                setNewW('')
              }}
              className="h-[54px] rounded-lg bg-elevated px-5 text-[17px] font-bold"
            >
              Hinzufügen
            </button>
          </div>
        )}
        <p className="mt-[28px] px-2 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Deine Gewichte</p>
        <div className="mt-[12px] flex flex-col gap-[10px]">
          {list.slice(0, 200).map((w) => (
            <div key={w} className="relative flex h-[52px] items-center justify-center rounded-lg border border-elevated text-[18px]">
              {fmt(w)} kg
              {individual && (
                <button type="button" aria-label="Entfernen" onClick={() => setCustom(custom.filter((x) => x !== w))} className="absolute right-4 text-fg-2">
                  <Icon name="close" size={20} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}

/** ⚙ im Übungs-Sheet: Pausenzeit, Ausführungshinweise, eigene Notiz. */
export function ExerciseSettingsSheet({ open, onClose, item, onWeights }: { open: boolean; onClose: () => void; item: WorkoutExercise | null; onWeights: () => void }) {
  const [rest, setRest] = useState(120)
  const [note, setNote] = useState('')
  useEffect(() => {
    if (!open || !item) return
    setRest(item.restSec)
    db.exerciseSettings.get(item.exerciseId).then((s) => setNote(s?.note ?? ''))
  }, [open, item])
  if (!item) return null
  const save = async () => {
    await db.sessionExercises.update(item.id!, { restSec: rest })
    const s = await db.sessions.get(item.sessionId)
    if (s?.planDayId) await db.planExercises.where('planDayId').equals(s.planDayId).filter((p) => p.exerciseId === item.exerciseId).modify({ restSec: rest })
    const existing = (await db.exerciseSettings.get(item.exerciseId)) ?? { exerciseId: item.exerciseId }
    await db.exerciseSettings.put({ ...existing, restSec: rest, note })
    onClose()
  }
  return (
    <BottomSheet open={open} onClose={onClose} label="Übungs-Einstellungen" action={{ label: 'Speichern', onClick: save }}>
      <SheetTitle>Einstellungen</SheetTitle>
      <div className="px-6 pb-8">
        <p className="text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Pausenzeit</p>
        <div className="mt-3">
          <StepperField value={rest} onChange={setRest} step={15} min={15} max={600} digits={0} suffix="s" />
        </div>
        <button type="button" onClick={onWeights} className="mt-4 flex h-[54px] w-full items-center justify-between rounded-lg bg-elevated px-4 text-[17px] font-semibold">
          Verfügbare Gewichte
          <Icon name="chevronRight" size={22} />
        </button>
        <p className="mt-6 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Ausführung</p>
        <p className="mt-2 text-body leading-snug">{item.exercise.hinweise}</p>
        <p className="mt-6 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Eigene Notiz zur Übung</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="z. B. Sitzhöhe 4, Griff weit" className="mt-2 w-full rounded-lg border border-elevated bg-transparent p-3 text-body outline-none" />
      </div>
    </BottomSheet>
  )
}
