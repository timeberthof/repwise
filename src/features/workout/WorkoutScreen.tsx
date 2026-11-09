import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { SubHeader } from '../../components/layout/PageHeader'
import { Icon } from '../../components/icons/Icon'
import { Button, BottomBar } from '../../components/ui/Button'
import { ActionSheet } from '../../components/ui/ActionSheet'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { useToast } from '../../components/ui/Toast'
import { formatDuration } from '../../logic/dates'
import { db } from '../../db/db'
import { useSettings } from '../../db/settings'
import { addExercise, discardWorkout, finishWorkout, moveExercise, removeExercise } from '../../db/repo/sessions'
import { saveTemplate } from '../../db/repo/templates'
import { useWakeLock } from '../../lib/wakeLock'
import { unlockAudio } from '../../lib/sound'
import { ExercisePicker } from '../exercises/ExercisePicker'
import { ExerciseBlock } from './ExerciseBlock'
import { RestTimerBar } from './RestTimerBar'
import { restTimer } from './restTimer'
import { useWorkout, type WorkoutExercise } from './useWorkout'

/** Laufendes Training: Übungen wählen, Sätze selbst eintragen. Keine Vorgaben. */
export default function WorkoutScreen() {
  const { id } = useParams()
  const sessionId = Number(id)
  const navigate = useNavigate()
  const toast = useToast()
  const settings = useSettings()
  const data = useWorkout(sessionId)
  const [picker, setPicker] = useState(false)
  const [menu, setMenu] = useState(false)
  const [cardMenu, setCardMenu] = useState<WorkoutExercise | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [rename, setRename] = useState<string | null>(null)
  const [, tick] = useState(0)

  const running = data?.session.status === 'laeuft'
  useWakeLock(!!running)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  if (data === undefined) return <div className="h-dvh bg-bg" />
  if (data === null) {
    return (
      <div className="h-dvh bg-bg">
        <SubHeader title="Training" onBack={() => navigate('/training')} />
        <p className="p-6 text-fg-2">Dieses Training gibt es nicht mehr.</p>
      </div>
    )
  }
  if (!running) return <Navigate to={`/verlauf/${sessionId}`} replace />

  const { session, items } = data
  const setCount = items.reduce((a, it) => a + it.doneCount, 0)

  const finish = async () => {
    restTimer.skip()
    const saved = await finishWorkout(sessionId)
    if (saved) navigate(`/workout/${sessionId}/abschluss`, { replace: true })
    else {
      toast('Training verworfen', 'Es war noch kein Satz eingetragen.')
      navigate('/training', { replace: true })
    }
  }
  const onSetSaved = () => {
    unlockAudio()
    if (settings?.restTimer) restTimer.start(sessionId, settings.restSec)
  }

  return (
    <div className="min-h-dvh bg-bg pb-44">
      <SubHeader
        title={session.name}
        onBack={() => navigate('/training')}
        right={
          <button type="button" aria-label="Menü" onClick={() => setMenu(true)} className="flex h-10 w-8 items-center justify-center text-fg">
            <Icon name="moreVert" size={28} />
          </button>
        }
      >
        <div className="flex items-center justify-between px-[20px] pb-[14px]">
          <span className="flex items-baseline gap-3">
            <span className="text-[13px] uppercase tracking-[0.12em] text-fg-2">Zeit</span>
            <span className="text-[24px] font-extrabold tabular-nums">{formatDuration(Date.now() - (session.startedAt ?? Date.now()))}</span>
          </span>
          <span className="flex items-baseline gap-3">
            <span className="text-[13px] uppercase tracking-[0.12em] text-fg-2">Sätze</span>
            <span className="text-[24px] font-extrabold tabular-nums">{setCount}</span>
          </span>
        </div>
      </SubHeader>

      <div className="mt-4 flex flex-col gap-4 px-4">
        {!items.length && <p className="rounded-xl bg-surface px-4 py-6 text-center text-[15px] text-fg-2">Noch keine Übung. Füge unten eine Übung hinzu.</p>}
        {items.map((it) => (
          <ExerciseBlock key={it.id} item={it} sessionId={sessionId} editable onMenu={() => setCardMenu(it)} onSetSaved={onSetSaved} />
        ))}
        <button type="button" onClick={() => setPicker(true)} className="flex h-[52px] items-center justify-center gap-2 rounded-xl border border-dashed border-fg-3 text-[16px] font-semibold">
          <Icon name="add" size={22} /> Übung hinzufügen
        </button>
      </div>

      <BottomBar>
        <div className="w-full">
          <RestTimerBar sessionId={sessionId} />
          <Button icon="check" onClick={finish}>
            Training beenden
          </Button>
        </div>
      </BottomBar>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        exclude={items.map((i) => i.exerciseId)}
        onPick={async (ids) => {
          for (const exId of ids) await addExercise(sessionId, exId)
        }}
      />
      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title={session.name}
        items={[
          { label: 'Übung hinzufügen', icon: 'add', onClick: () => setPicker(true) },
          { label: 'Training umbenennen', icon: 'edit', onClick: () => setRename(session.name) },
          {
            label: 'Als Vorlage speichern',
            icon: 'bookmark',
            hint: 'Nur die Übungen, ohne Werte.',
            onClick: async () => {
              if (!items.length) return toast('Noch keine Übung im Training')
              await saveTemplate({ name: session.name, exerciseIds: items.map((i) => i.exerciseId) })
              toast('Vorlage gespeichert', session.name)
            },
          },
          { label: 'Training beenden', icon: 'check', onClick: finish },
          { label: 'Training verwerfen', icon: 'delete', danger: true, hint: 'Alle Einträge dieses Trainings werden gelöscht.', onClick: () => setConfirmDiscard(true) },
        ]}
      />
      <ActionSheet
        open={!!cardMenu}
        onClose={() => setCardMenu(null)}
        title={cardMenu?.exercise.name ?? ''}
        items={
          cardMenu
            ? [
                ...(items.indexOf(cardMenu) > 0 ? [{ label: 'Nach oben', icon: 'arrowUp' as const, onClick: () => moveExercise(cardMenu.id!, -1) }] : []),
                ...(items.indexOf(cardMenu) < items.length - 1 ? [{ label: 'Nach unten', icon: 'arrowDown' as const, onClick: () => moveExercise(cardMenu.id!, 1) }] : []),
                {
                  label: 'Aus diesem Training entfernen',
                  icon: 'delete' as const,
                  danger: true,
                  hint: cardMenu.doneCount ? `${cardMenu.doneCount} eingetragene Sätze werden gelöscht.` : undefined,
                  onClick: () => removeExercise(cardMenu.id!),
                },
              ]
            : []
        }
      />
      <ConfirmSheet
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Training verwerfen?"
        text="Alle Sätze dieses Trainings werden gelöscht. Frühere Trainings bleiben erhalten."
        confirmLabel="Verwerfen"
        onConfirm={async () => {
          restTimer.skip()
          await discardWorkout(sessionId)
          navigate('/training', { replace: true })
        }}
      />
      <BottomSheet open={rename !== null} onClose={() => setRename(null)} label="Training umbenennen">
        <SheetTitle>Training umbenennen</SheetTitle>
        <div className="px-5 pb-6">
          <input autoFocus value={rename ?? ''} onChange={(e) => setRename(e.target.value)} aria-label="Name des Trainings" className="h-[54px] w-full rounded-lg border border-elevated bg-transparent px-4 text-[18px] outline-none" />
          <Button
            className="mt-4"
            disabled={!rename?.trim()}
            onClick={async () => {
              await db.sessions.update(sessionId, { name: rename!.trim() })
              setRename(null)
            }}
          >
            Speichern
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
