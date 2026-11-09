import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { SetEntry } from '../../db/types'
import { Icon } from '../../components/icons/Icon'
import { ExerciseGlyph } from '../../components/ui/ExerciseGlyph'
import { muscleLabel } from '../../data/muskeln'
import { addSet, deleteSet, lastPerformance, updateSet, type SetValues } from '../../db/repo/sessions'
import { formatDate } from '../../logic/dates'
import { fmt } from '../../logic/format'
import type { WorkoutExercise } from './useWorkout'

const num = (s: string): number | null => {
  const t = s.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','))

/** Kurztext eines Satzes, z. B. „50 kg × 8 (RIR 2)“; ohne Wiederholungen nur das Gewicht. */
export function setText(s: SetValues): string {
  const w = s.weight ? `${fmt(s.weight)} kg` : 'KG'
  return `${w}${s.reps ? ` × ${s.reps}` : ''}${s.rir !== null && s.rir !== undefined ? ` (RIR ${s.rir})` : ''}`
}

const INPUT = 'h-[42px] w-full rounded-md bg-elevated px-2 text-center text-[17px] tabular-nums outline-none placeholder:text-fg-3 focus:ring-2 focus:ring-fg/40'

/** Eingetragener Satz – direkt änderbar, Änderung wird beim Verlassen des Feldes gespeichert. */
function SetRow({ set, n, editable }: { set: SetEntry; n: number; editable: boolean }) {
  const [v, setV] = useState({ w: str(set.weight), r: str(set.reps), i: str(set.rir) })
  const commit = (next = v) => {
    const reps = num(next.r)
    if (!reps || reps <= 0) {
      setV({ w: str(set.weight), r: str(set.reps), i: str(set.rir) })
      return
    }
    const values: SetValues = { weight: num(next.w), reps, rir: num(next.i) }
    if (values.weight !== set.weight || values.reps !== set.reps || values.rir !== set.rir) void updateSet(set.id!, values)
  }
  return (
    <div className="grid grid-cols-[34px_1fr_1fr_1fr_36px] items-center gap-2 py-[3px]">
      <span className="text-center text-[16px] text-fg-2">{n}</span>
      <input aria-label={`Satz ${n} Gewicht`} inputMode="decimal" disabled={!editable} value={v.w} onChange={(e) => setV({ ...v, w: e.target.value })} onBlur={() => commit()} placeholder="kg" className={INPUT} />
      <input aria-label={`Satz ${n} Wiederholungen`} inputMode="numeric" disabled={!editable} value={v.r} onChange={(e) => setV({ ...v, r: e.target.value })} onBlur={() => commit()} placeholder="Wdh" className={INPUT} />
      <input aria-label={`Satz ${n} RIR`} inputMode="numeric" disabled={!editable} value={v.i} onChange={(e) => setV({ ...v, i: e.target.value })} onBlur={() => commit()} placeholder="–" className={INPUT} />
      {editable ? (
        <button type="button" aria-label={`Satz ${n} löschen`} onClick={() => deleteSet(set.id!)} className="flex h-9 w-9 items-center justify-center text-fg-2">
          <Icon name="close" size={20} />
        </button>
      ) : (
        <span />
      )}
    </div>
  )
}

/**
 * Eine Übung im Training: „Letztes Mal“ als reine Information, eingetragene Sätze, neuer Satz.
 * Felder für neue Sätze sind leer – es gibt keine Vorgaben.
 */
export function ExerciseBlock({ item, sessionId, editable, onMenu, onSetSaved }: { item: WorkoutExercise; sessionId: number; editable: boolean; onMenu: () => void; onSetSaved: () => void }) {
  const last = useLiveQuery(() => lastPerformance(item.exerciseId, sessionId), [item.exerciseId, sessionId])
  const sets = item.sets_.filter((s) => s.done).sort((a, b) => a.index - b.index)
  const [draft, setDraft] = useState({ w: '', r: '', i: '' })
  const reps = num(draft.r)
  const save = async (values?: SetValues) => {
    const v = values ?? { weight: num(draft.w), reps: reps ?? 0, rir: num(draft.i) }
    if (!(v.reps > 0)) return
    await addSet(item.id!, v)
    setDraft({ w: '', r: '', i: '' })
    onSetSaved()
  }
  const prev = sets.at(-1)

  return (
    <section className="rounded-xl border border-elevated bg-surface px-3 pb-3 pt-3" aria-label={item.exercise.name}>
      <div className="flex items-center gap-3">
        <ExerciseGlyph exercise={item.exercise} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] text-fg-2">{muscleLabel(item.exercise.primaer)}</p>
          <h3 className="text-[18px] font-semibold leading-tight">{item.exercise.name}</h3>
        </div>
        {editable && (
          <button type="button" aria-label={`Menü ${item.exercise.name}`} onClick={onMenu} className="flex h-10 w-9 items-center justify-center">
            <Icon name="moreVert" size={24} />
          </button>
        )}
      </div>

      <p className="mt-2 rounded-md bg-surface-2 px-3 py-2 text-[13.5px] leading-snug text-fg-2">
        {last === undefined ? '…' : last ? (
          <>
            <span className="font-semibold text-fg">Letztes Mal</span> ({formatDate(last.date)}{last.source === 'mci' ? ', bisherige App' : ''}): {last.sets.map(setText).join(' · ')}
          </>
        ) : (
          'Noch kein Eintrag zu dieser Übung.'
        )}
      </p>

      <div className="mt-3 grid grid-cols-[34px_1fr_1fr_1fr_36px] gap-2 px-0 text-center text-[12.5px] font-semibold uppercase tracking-[0.04em] text-fg-2">
        <span>Satz</span>
        <span>kg</span>
        <span>Wdh</span>
        <span>RIR</span>
        <span />
      </div>
      {sets.map((s, i) => (
        <SetRow key={`${s.id}-${s.weight}-${s.reps}-${s.rir}`} set={s} n={i + 1} editable={editable} />
      ))}

      {editable && (
        <>
          <div className="grid grid-cols-[34px_1fr_1fr_1fr_36px] items-center gap-2 py-[3px]">
            <span className="text-center text-[16px] text-fg-3">{sets.length + 1}</span>
            <input aria-label="Neuer Satz Gewicht" inputMode="decimal" value={draft.w} onChange={(e) => setDraft({ ...draft, w: e.target.value })} placeholder="kg" className={INPUT} />
            <input aria-label="Neuer Satz Wiederholungen" inputMode="numeric" value={draft.r} onChange={(e) => setDraft({ ...draft, r: e.target.value })} placeholder="Wdh" className={INPUT} />
            <input aria-label="Neuer Satz RIR (optional)" inputMode="numeric" value={draft.i} onChange={(e) => setDraft({ ...draft, i: e.target.value })} placeholder="RIR" className={INPUT} />
            <span />
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={!reps} onClick={() => save()} className="flex h-[44px] flex-1 items-center justify-center gap-1 rounded-lg bg-fg text-[15.5px] font-bold text-fg-inverse disabled:bg-[#cfcfcf]">
              <Icon name="check" size={20} /> Satz eintragen
            </button>
            {prev && (
              <button type="button" onClick={() => save({ weight: prev.weight, reps: prev.reps, rir: prev.rir })} className="flex h-[44px] items-center justify-center gap-1 rounded-lg bg-surface-3 px-3 text-[14.5px] font-semibold">
                <Icon name="add" size={18} /> Wie Satz {sets.length}
              </button>
            )}
          </div>
        </>
      )}
      {item.note && <p className="mt-2 text-[13.5px] text-fg-2">Notiz: {item.note}</p>}
    </section>
  )
}
