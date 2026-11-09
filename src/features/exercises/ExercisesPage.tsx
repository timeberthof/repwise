import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import type { Exercise } from '../../db/types'
import { SubHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/icons/Icon'
import { ExerciseGlyph } from '../../components/ui/ExerciseGlyph'
import { muscleLabel } from '../../data/muskeln'
import { myExercises } from '../../db/repo/exercises'
import { ExerciseEditSheet } from './ExerciseEditSheet'
import { groupByMuscle } from './ExercisePicker'

/** Meine Übungen: anlegen, bearbeiten, löschen. */
export default function ExercisesPage() {
  const navigate = useNavigate()
  const list = useLiveQuery(() => myExercises(), [])
  const [edit, setEdit] = useState<Exercise | null>(null)
  const [create, setCreate] = useState(false)
  return (
    <div className="min-h-dvh bg-bg pb-28">
      <SubHeader title="Meine Übungen" onBack={() => navigate(-1)} />
      <p className="mx-6 mt-3 text-[13.5px] leading-snug text-fg-2">Deine Übungen mit Muskelgruppe und Notiz. Löschen entfernt eine Übung nur aus der Liste – eingetragene Sätze und der Verlauf bleiben erhalten.</p>
      <div className="px-4">
        {list && !list.length && <p className="py-10 text-center text-body text-fg-2">Noch keine Übungen.</p>}
        {groupByMuscle(list ?? []).map(([m, items]) => (
          <section key={m} className="mt-5">
            <p className="mb-1 px-1 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">
              {muscleLabel(m)} · {items.length}
            </p>
            <div className="overflow-hidden rounded-xl bg-surface">
              {items.map((e, i) => (
                <button key={e.id} type="button" onClick={() => setEdit(e)} className={`flex w-full items-center gap-3 px-3 py-[10px] text-left ${i < items.length - 1 ? 'border-b border-elevated' : ''}`}>
                  <ExerciseGlyph exercise={e} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16.5px] font-semibold">{e.name}</span>
                    {e.eigene && e.hinweise && <span className="block truncate text-[13px] text-fg-2">{e.hinweise}</span>}
                  </span>
                  <Icon name="chevronRight" size={20} className="text-fg-2" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 px-5" style={{ paddingBottom: 'max(var(--safe-bottom), 16px)' }}>
        <Button icon="add" onClick={() => setCreate(true)}>
          Neue Übung
        </Button>
      </div>
      <ExerciseEditSheet open={create} onClose={() => setCreate(false)} />
      <ExerciseEditSheet open={!!edit} onClose={() => setEdit(null)} exercise={edit} />
    </div>
  )
}
