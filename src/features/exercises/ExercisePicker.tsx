import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Exercise, MuscleId } from '../../db/types'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/icons/Icon'
import { ExerciseGlyph } from '../../components/ui/ExerciseGlyph'
import { MUSCLE_CHOICES, muscleLabel } from '../../data/muskeln'
import { myExercises } from '../../db/repo/exercises'
import { ExerciseEditSheet } from './ExerciseEditSheet'

/** Gruppiert nach Muskelgruppe in der Reihenfolge der Auswahl. */
export function groupByMuscle(list: Exercise[]): [MuscleId, Exercise[]][] {
  const order = (m: MuscleId) => {
    const i = MUSCLE_CHOICES.indexOf(m)
    return i < 0 ? 99 : i
  }
  const map = new Map<MuscleId, Exercise[]>()
  for (const e of list) map.set(e.primaer, [...(map.get(e.primaer) ?? []), e])
  return [...map.entries()].sort((a, b) => order(a[0]) - order(b[0]))
}

/**
 * Übungen aus „Meine Übungen“ wählen (mehrere möglich) oder eine neue anlegen.
 * Bereits vorhandene Übungen (exclude) werden nicht angeboten.
 */
export function ExercisePicker({ open, onClose, onPick, exclude = [], title = 'Übungen wählen' }: { open: boolean; onClose: () => void; onPick: (ids: string[]) => void; exclude?: string[]; title?: string }) {
  const mine = useLiveQuery(() => (open ? myExercises() : Promise.resolve([] as Exercise[])), [open])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const [create, setCreate] = useState(false)
  useEffect(() => {
    if (open) {
      setQ('')
      setSel([])
    }
  }, [open])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (mine ?? []).filter((e) => !exclude.includes(e.id) && (!s || e.name.toLowerCase().includes(s) || muscleLabel(e.primaer).toLowerCase().includes(s)))
  }, [mine, q, exclude])
  const toggle = (id: string) => setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        full
        label={title}
        footer={
          <Button icon="check" disabled={!sel.length} onClick={() => (onPick(sel), onClose())}>
            {sel.length ? `${sel.length} hinzufügen` : 'Übungen antippen'}
          </Button>
        }
      >
        <SheetTitle>{title}</SheetTitle>
        <div className="px-5 pb-6">
          <div className="flex gap-2">
            <div className="flex h-[48px] flex-1 items-center gap-2 rounded-lg bg-elevated px-3">
              <Icon name="search" size={22} className="text-fg-2" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Übung suchen" aria-label="Übung suchen" className="w-full bg-transparent text-[17px] outline-none placeholder:text-fg-2" />
            </div>
            <button type="button" onClick={() => setCreate(true)} className="flex h-[48px] items-center gap-1 rounded-lg bg-fg px-3 text-[15px] font-bold text-fg-inverse">
              <Icon name="add" size={20} /> Neu
            </button>
          </div>
          {mine && !list.length && (
            <p className="py-10 text-center text-body text-fg-2">{q ? 'Keine passende Übung.' : 'Noch keine Übungen – lege mit „Neu“ Deine erste an.'}</p>
          )}
          {groupByMuscle(list).map(([m, items]) => (
            <section key={m} className="mt-4">
              <p className="mb-1 px-1 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">{muscleLabel(m)}</p>
              <div className="overflow-hidden rounded-xl bg-surface">
                {items.map((e, i) => {
                  const on = sel.includes(e.id)
                  return (
                    <button key={e.id} type="button" onClick={() => toggle(e.id)} aria-pressed={on} className={`flex w-full items-center gap-3 px-3 py-[9px] text-left ${i < items.length - 1 ? 'border-b border-elevated' : ''}`}>
                      <ExerciseGlyph exercise={e} size={34} />
                      <span className="min-w-0 flex-1 truncate text-[16.5px] font-semibold">{e.name}</span>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-fg bg-fg text-fg-inverse' : 'border-fg-3'}`}>{on && <Icon name="check" size={16} />}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </BottomSheet>
      <ExerciseEditSheet open={create} onClose={() => setCreate(false)} onSaved={(e) => setSel((cur) => [...cur, e.id])} />
    </>
  )
}
