import { useEffect, useState } from 'react'
import type { Exercise, MuscleId } from '../../db/types'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { useToast } from '../../components/ui/Toast'
import { MUSCLE_CHOICES, muscleLabel } from '../../data/muskeln'
import { deleteExercise, saveExercise } from '../../db/repo/exercises'

/** Eigene Übung anlegen oder bearbeiten: Name, Muskelgruppe (optional), Notiz. */
export function ExerciseEditSheet({ open, onClose, exercise, onSaved }: { open: boolean; onClose: () => void; exercise?: Exercise | null; onSaved?: (e: Exercise) => void }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState<MuscleId>('sonstige')
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(exercise?.name ?? '')
    setMuscle(exercise?.primaer ?? 'sonstige')
    setNote(exercise?.hinweise ?? '')
  }, [open, exercise])

  const save = async () => {
    const e = await saveExercise({ id: exercise?.id, name, primaer: muscle, hinweise: note })
    toast(exercise ? 'Übung gespeichert' : 'Übung angelegt', e.name)
    onSaved?.(e)
    onClose()
  }

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        full
        label={exercise ? 'Übung bearbeiten' : 'Neue Übung'}
        footer={
          <Button icon="check" disabled={name.trim().length < 2} onClick={save}>
            Speichern
          </Button>
        }
      >
        <SheetTitle>{exercise ? 'Übung bearbeiten' : 'Neue Übung'}</SheetTitle>
        <div className="px-6 pb-6">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name der Übung" aria-label="Name der Übung" className="h-[54px] w-full rounded-lg border border-elevated bg-transparent px-4 text-[18px] outline-none" />
          <p className="mt-5 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Muskelgruppe</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MUSCLE_CHOICES.map((m) => (
              <button key={m} type="button" onClick={() => setMuscle(m)} aria-pressed={muscle === m} className={`h-[38px] rounded-md px-3 text-[15px] ${muscle === m ? 'border-2 border-fg bg-surface font-semibold' : 'bg-surface-3'}`}>
                {muscleLabel(m)}
              </button>
            ))}
          </div>
          <p className="mt-5 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Notiz (optional)</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="z. B. Sitzhöhe, Griff, Gerät" className="mt-2 w-full rounded-lg border border-elevated bg-transparent p-3 text-[16px] outline-none" />
          {exercise && (
            <button type="button" onClick={() => setConfirm(true)} className="mt-6 text-[15px] font-semibold text-[#ff6b5f]">
              Übung löschen
            </button>
          )}
        </div>
      </BottomSheet>
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Übung löschen?"
        text="Sie verschwindet aus Deiner Übungsliste und aus Vorlagen. Schon eingetragene Sätze, Verlauf und Diagramme bleiben erhalten."
        confirmLabel="Löschen"
        onConfirm={async () => {
          if (!exercise) return
          const r = await deleteExercise(exercise.id)
          toast(r === 'ausgeblendet' ? 'Übung ausgeblendet' : 'Übung gelöscht', r === 'ausgeblendet' ? 'Der Verlauf bleibt erhalten.' : undefined)
          onClose()
        }}
      />
    </>
  )
}
