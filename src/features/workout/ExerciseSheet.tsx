import { useEffect, useMemo, useState } from 'react'
import type { AdjustmentNote, Session, SetEntry } from '../../db/types'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { MiniChip } from '../../components/ui/Chip'
import { Stepper } from '../../components/ui/Stepper'
import { Icon, type IconName } from '../../components/icons/Icon'
import { ExerciseGlyph } from '../../components/ui/ExerciseGlyph'
import { useToast } from '../../components/ui/Toast'
import { muscleLabel } from '../../data/muskeln'
import { fmt } from '../../logic/format'
import { completeSet, setExerciseRange, setExerciseSets, setExerciseWeight } from '../../db/repo/sessions'
import { db } from '../../db/db'
import { nextWeight, roundWeight } from '../../logic/progression'
import { availableWeights, stepFor } from '../../db/repo/weights'
import { AdjustmentStrip } from './AdjustmentBox'
import { ExerciseSettingsSheet, RepsSheet, SetsSheet, WeightsSheet } from './EditSheets'
import { TimerButton } from './TimerButton'
import { restTimer, useRestTimer } from './restTimer'
import type { WorkoutExercise } from './useWorkout'
import { unlockAudio } from '../../lib/sound'

const batteryFor = (rir: number | null): IconName => {
  if (rir === null) return 'battery0'
  if (rir <= 0) return 'battery0'
  if (rir === 1) return 'battery2'
  if (rir === 2) return 'battery3'
  if (rir === 3) return 'battery5'
  return 'batteryFull'
}

interface Props {
  open: boolean
  onClose: () => void
  session: Session
  item: WorkoutExercise | null
  isLast: boolean
  onStart: () => void
  onNext: () => void
  onFinish: () => void
}

/** Übungs-Sheet zum Eintragen (S30, S45): Chips, Satz-Tabelle, Stepper, Notizen, Starten/Satz/Timer. */
export function ExerciseSheet({ open, onClose, session, item, isLast, onStart, onNext, onFinish }: Props) {
  const toast = useToast()
  const [sel, setSel] = useState<number | null>(null)
  const [vals, setVals] = useState({ reps: 8, weight: 0 as number | null, rir: 2 as number | null })
  const [edited, setEdited] = useState(false)
  const [sheet, setSheet] = useState<'sets' | 'reps' | 'weights' | 'settings' | null>(null)
  const [weights, setWeights] = useState<number[]>([])
  const { remaining, total, justFinished } = useRestTimer(session.id)

  const sets = item?.sets_ ?? []
  const firstOpen = sets.find((s) => !s.done)
  const current: SetEntry | undefined = sel !== null ? sets.find((s) => s.index === sel) : firstOpen

  useEffect(() => {
    if (!open || !item) return
    setSel(null)
    setEdited(false)
    if (item.exercise.gewichtsschritt) availableWeights(item.exerciseId).then((w) => setWeights(w ?? []))
  }, [open, item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stepper an den gewählten/aktuellen Satz angleichen
  useEffect(() => {
    if (!item) return
    const src = current ?? sets.at(-1)
    setVals({ reps: src?.reps ?? item.repMin, weight: src?.weight ?? item.weight, rir: src?.rir ?? item.targetRir })
    setEdited(false)
  }, [current?.id, current?.done, item?.weight, item?.repMin]) // eslint-disable-line react-hooks/exhaustive-deps

  const bodyweight = !!item && (item.exercise.gewichtsart === 'koerpergewicht' || item.exercise.gewichtsschritt === 0)
  const seconds = item?.exercise.einheit === 'sekunden'
  const mobility = item?.exercise.art === 'mobility'
  const step = (item && stepFor(item.exercise)) || 2.5
  const autoNotes = useMemo(() => (item?.adjustments ?? []).filter((n) => n.kind !== 'manuell' && !(n.kind === 'wochentyp' && n.field === 'rir')), [item?.adjustments])

  if (!item) return null
  const running = session.status === 'laeuft'
  const finished = session.status === 'fertig'
  const allDone = sets.length > 0 && sets.every((s) => s.done)

  const changeWeight = (dir: 1 | -1) => {
    const w = vals.weight ?? 0
    const next = dir > 0 ? nextWeight(w, step, 1, weights) : weights.length ? [...weights].reverse().find((x) => x < w - 1e-9) ?? 0 : Math.max(0, w - step)
    setVals({ ...vals, weight: next ? roundWeight(next, step, 'nearest', weights) : 0 })
    setEdited(true)
  }

  const submitSet = async () => {
    if (!current) return
    unlockAudio()
    const wasDone = current.done
    await completeSet(current.id!, { reps: vals.reps, weight: bodyweight && !vals.weight ? null : vals.weight, rir: mobility ? null : vals.rir })
    setSel(null)
    if (!wasDone) {
      const remainingSets = sets.filter((s) => !s.done && s.id !== current.id).length
      if (remainingSets > 0 || !isLast) restTimer.start(session.id!, item.restSec)
    }
  }

  const undo = async (n: AdjustmentNote) => {
    if (n.field === 'weight') await setExerciseWeight(item.id!, n.before)
    if (n.field === 'sets' && n.before) await setExerciseSets(item.id!, n.before)
    if (n.field === 'rir' && n.before !== null) {
      await db.sessionExercises.update(item.id!, { targetRir: n.before })
      for (const s of sets.filter((x) => !x.done)) await db.sets.update(s.id!, { rir: n.before })
    }
    await db.sessionExercises.update(item.id!, { adjustments: item.adjustments.filter((a) => a !== n && !(a.kind === n.kind && a.field === n.field && a.reason === n.reason)) })
    toast('Anpassung rückgängig gemacht', n.title)
  }

  let main: React.ReactNode
  if (finished) main = <Button onClick={onClose}>Schließen</Button>
  else if (!running)
    main = (
      <Button icon="play" onClick={onStart}>
        Starten
      </Button>
    )
  else if (remaining !== null && !(current && current.done)) main = <TimerButton remaining={remaining} total={total} />
  else if (current && !(allDone && !edited && sel === null))
    main = (
      <Button icon="check" onClick={submitSet} style={justFinished ? { animation: 'timer-flash 0.8s 3' } : undefined}>
        {current.done ? 'Satz speichern' : `Satz ${current.index + 1} abschließen`}
      </Button>
    )
  else if (isLast)
    main = (
      <Button icon="check" onClick={onFinish}>
        Training beenden
      </Button>
    )
  else
    main = (
      <Button icon="play" onClick={onNext}>
        Nächste Übung
      </Button>
    )

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        fixedTop={229}
        label={item.exercise.name}
        footer={
          <div className="flex gap-3">
            <button type="button" aria-label="Übungs-Einstellungen" onClick={() => setSheet('settings')} className="flex h-14 w-[62px] shrink-0 items-center justify-center rounded-xl bg-elevated">
              <Icon name="settingsFill" size={26} />
            </button>
            <div className="flex flex-1">{main}</div>
          </div>
        }
      >
        <div className="flex items-center gap-[22px] px-[34px] pb-[26px]">
          <ExerciseGlyph exercise={item.exercise} size={86} />
          <div className="min-w-0">
            <p className="text-[16.5px] text-fg-2">{muscleLabel(item.exercise.primaer)}</p>
            <h2 className="mt-1 text-screen font-black uppercase leading-[1.25]">{item.exercise.name}</h2>
          </div>
        </div>

        {autoNotes.length > 0 && !finished && (
          <div className="-mt-2 px-6 pb-[18px]">
            <AdjustmentStrip notes={autoNotes} onUndo={item.doneCount > 0 ? undefined : (n) => (n.kind === 'kalibrierung' || n.kind === 'tausch' ? undefined : undo(n))} />
          </div>
        )}

        <div className="flex gap-[8px] px-[36px]">
          <MiniChip icon="barChart" active onClick={() => !finished && setSheet('sets')}>
            {item.sets} {item.sets === 1 ? 'Satz' : 'Sätze'}
          </MiniChip>
          <MiniChip icon="sync" onClick={() => !finished && setSheet('reps')}>
            {item.repMin}-{item.repMax} {seconds ? 's' : 'Wdh'}
          </MiniChip>
          {!bodyweight && (
            <MiniChip icon="barbell" onClick={() => setSheet('weights')}>
              {item.weight ? `${fmt(item.weight)} kg` : '– kg'}
            </MiniChip>
          )}
        </div>

        {/* Satz-Tabelle */}
        <div className="mt-[28px] px-6">
          <div className={`grid ${mobility ? 'grid-cols-2' : 'grid-cols-4'} text-center text-card font-medium uppercase`}>
            <span>Satz</span>
            <span>{seconds ? 'Sek' : 'Wdh'}</span>
            {!mobility && <span>Kg</span>}
            {!mobility && (
              <button type="button" className="flex items-center justify-center gap-1" onClick={() => toast('RIR – Reserve', 'Wie viele Wiederholungen hättest Du noch geschafft? 2 = zwei weitere wären möglich gewesen.')}>
                RIR <Icon name="info" size={16} />
              </button>
            )}
          </div>
          <div className="mt-[10px] flex flex-col gap-[2px]">
            {(sets.length ? sets : Array.from({ length: item.sets }, (_, i) => ({ index: i, reps: item.repMin, weight: item.weight, rir: item.targetRir, done: false }) as SetEntry)).map((s) => {
              const isCur = running && current?.index === s.index
              return (
                <button
                  key={s.index}
                  type="button"
                  disabled={!running}
                  onClick={() => setSel(s.index)}
                  className={`relative grid h-[34px] ${mobility ? 'grid-cols-2' : 'grid-cols-4'} items-center rounded-md text-center text-[18px] ${isCur ? 'bg-elevated' : ''} ${s.done ? 'font-bold text-fg' : running ? 'text-fg' : 'text-[#9e9e9e]'}`}
                >
                  <span className="font-normal">{s.index + 1}</span>
                  <span>{s.reps}</span>
                  {!mobility && <span>{s.weight ? fmt(s.weight) : bodyweight ? '–' : '?'}</span>}
                  {!mobility && (
                    <span className="flex items-center justify-center gap-1">
                      {s.rir ?? '–'} <Icon name={batteryFor(s.rir)} size={24} />
                    </span>
                  )}
                  {s.done && <span className="absolute -right-[2px] top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full bg-set-done" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Eingabe */}
        {running && current && (
          <div className="mx-6 mt-[22px] grid grid-cols-[1fr_1.2fr_1fr] gap-1 overflow-hidden rounded-lg bg-elevated px-[2px] pb-[12px] pt-[16px] text-center">
            <div>
              <p className="text-[16px] text-[#9e9e9e]">{seconds ? 'SEK' : 'WDH'}</p>
              <Stepper compact value={vals.reps} onChange={(v) => (setVals({ ...vals, reps: v }), setEdited(true))} step={seconds ? 5 : 1} min={0} max={seconds ? 600 : 100} dim={!edited} />
            </div>
            {!mobility && !bodyweight ? (
              <div>
                <p className="text-[16px] text-[#9e9e9e]">KG</p>
                <div className="flex items-center justify-between">
                  <button type="button" aria-label="Gewicht senken" className="flex h-11 w-9 items-center justify-center" onClick={() => changeWeight(-1)}>
                    <Icon name="remove" size={22} />
                  </button>
                  <span className={`text-[21px] ${edited ? 'text-fg' : 'text-fg-2'}`}>{fmt(vals.weight ?? 0)}</span>
                  <button type="button" aria-label="Gewicht erhöhen" className="flex h-11 w-9 items-center justify-center" onClick={() => changeWeight(1)}>
                    <Icon name="add" size={22} />
                  </button>
                </div>
              </div>
            ) : (
              <div />
            )}
            {!mobility ? (
              <div>
                <p className="text-[16px] text-[#9e9e9e]">RIR</p>
                <Stepper compact value={vals.rir ?? 0} onChange={(v) => (setVals({ ...vals, rir: v }), setEdited(true))} min={0} max={6} dim={!edited} />
              </div>
            ) : (
              <div />
            )}
          </div>
        )}

        <div className="px-6 pb-6 pt-[22px]">
          <p className="text-[19px] font-semibold">Notizen</p>
          <textarea
            defaultValue={item.note ?? ''}
            onBlur={(e) => db.sessionExercises.update(item.id!, { note: e.target.value })}
            rows={2}
            placeholder="Hier können Notizen zur Übung eingetragen werden."
            className="mt-1 w-full resize-none bg-transparent text-[16.5px] text-fg outline-none placeholder:text-fg-3"
          />
        </div>
      </BottomSheet>

      <SetsSheet open={sheet === 'sets'} onClose={() => setSheet(null)} item={item} onSave={(n) => setExerciseSets(item.id!, n)} />
      <RepsSheet open={sheet === 'reps'} onClose={() => setSheet(null)} item={item} onSave={(a, b) => setExerciseRange(item.id!, a, b)} />
      <WeightsSheet open={sheet === 'weights'} onClose={() => (setSheet(null), availableWeights(item.exerciseId).then((w) => setWeights(w ?? [])))} exercise={item.exercise} />
      <ExerciseSettingsSheet open={sheet === 'settings'} onClose={() => setSheet(null)} item={item} onWeights={() => setSheet('weights')} />
    </>
  )
}
