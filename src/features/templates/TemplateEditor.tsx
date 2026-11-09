import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { SubHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { Icon } from '../../components/icons/Icon'
import { ExerciseGlyph } from '../../components/ui/ExerciseGlyph'
import { useToast } from '../../components/ui/Toast'
import { getExercise } from '../../data/exercises'
import { muscleLabel } from '../../data/muskeln'
import { db } from '../../db/db'
import { deleteTemplate, saveTemplate } from '../../db/repo/templates'
import { startWorkout } from '../../db/repo/sessions'
import { ExercisePicker } from '../exercises/ExercisePicker'

/** Vorlage anlegen/bearbeiten: Name und Übungen in Reihenfolge. */
export default function TemplateEditor() {
  const { id = 'neu' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isNew = id === 'neu'
  const [name, setName] = useState('')
  const [ids, setIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(isNew)
  const [picker, setPicker] = useState(false)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (isNew) return
    db.templates.get(Number(id)).then((t) => {
      if (t) {
        setName(t.name)
        setIds(t.exerciseIds)
      }
      setLoaded(true)
    })
  }, [id, isNew])

  // zurück zur vorherigen Seite – ohne App-interne Vorgeschichte (Direktaufruf) zur Vorlagenliste
  const back = () => ((window.history.state as { idx?: number } | null)?.idx ? navigate(-1) : navigate('/vorlagen', { replace: true }))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    const next = [...ids]
    ;[next[i], next[j]] = [next[j], next[i]]
    setIds(next)
  }
  const save = async () => {
    const tid = await saveTemplate({ id: isNew ? undefined : Number(id), name, exerciseIds: ids })
    toast('Vorlage gespeichert', name.trim())
    return tid
  }

  if (!loaded) return <div className="h-dvh bg-bg" />
  return (
    <div className="min-h-dvh bg-bg pb-40">
      <SubHeader title={isNew ? 'Neue Vorlage' : 'Vorlage'} onBack={back} />
      <div className="px-5 pt-5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, z. B. Push" aria-label="Name der Vorlage" className="h-[54px] w-full rounded-lg border border-elevated bg-transparent px-4 text-[18px] outline-none" />
        <p className="mt-6 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Übungen · {ids.length}</p>
        <div className="mt-2 flex flex-col gap-2">
          {ids.map((exId, i) => {
            const e = getExercise(exId)
            return (
              <div key={exId} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2">
                <span className="w-5 text-center text-[15px] text-fg-2">{i + 1}</span>
                {e && <ExerciseGlyph exercise={e} size={34} />}
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold leading-tight">{e?.name ?? exId}</span>
                  {e && <span className="block text-[13px] text-fg-2">{muscleLabel(e.primaer)}</span>}
                </span>
                <button type="button" aria-label="Nach oben" disabled={i === 0} onClick={() => move(i, -1)} className="flex h-9 w-8 items-center justify-center disabled:opacity-30">
                  <Icon name="arrowUp" size={20} />
                </button>
                <button type="button" aria-label="Nach unten" disabled={i === ids.length - 1} onClick={() => move(i, 1)} className="flex h-9 w-8 items-center justify-center disabled:opacity-30">
                  <Icon name="arrowDown" size={20} />
                </button>
                <button type="button" aria-label={`${e?.name ?? exId} entfernen`} onClick={() => setIds(ids.filter((x) => x !== exId))} className="flex h-9 w-8 items-center justify-center text-[#ff6b5f]">
                  <Icon name="close" size={20} />
                </button>
              </div>
            )
          })}
        </div>
        <button type="button" onClick={() => setPicker(true)} className="mt-3 flex h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-fg-3 text-[16px] font-semibold">
          <Icon name="add" size={20} /> Übungen hinzufügen
        </button>
        {!isNew && (
          <button type="button" onClick={() => setConfirm(true)} className="mt-8 text-[15px] font-semibold text-[#ff6b5f]">
            Vorlage löschen
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 flex flex-col gap-2 px-5" style={{ paddingBottom: 'max(var(--safe-bottom), 16px)' }}>
        <Button
          icon="check"
          disabled={!name.trim()}
          onClick={async () => {
            await save()
            back()
          }}
        >
          Speichern
        </Button>
        <Button
          variant="secondary"
          icon="play"
          disabled={!name.trim() || !ids.length}
          onClick={async () => {
            await save()
            const sid = await startWorkout({ name, exerciseIds: ids })
            navigate(`/workout/${sid}`, { replace: true })
          }}
        >
          Speichern und Training starten
        </Button>
      </div>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} exclude={ids} onPick={(add) => setIds([...ids, ...add])} />
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Vorlage löschen?"
        text="Nur die Vorlage wird gelöscht. Übungen und bisherige Trainings bleiben erhalten."
        confirmLabel="Löschen"
        onConfirm={async () => {
          await deleteTemplate(Number(id))
          back()
        }}
      />
    </div>
  )
}
