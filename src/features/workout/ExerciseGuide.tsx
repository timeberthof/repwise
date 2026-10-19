import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { getExercise } from '../../data/exercises'
import { Icon } from '../../components/icons/Icon'
import { useToast } from '../../components/ui/Toast'
import { setExercisePinned } from '../../db/repo/sessions'
import { stepFor } from '../../db/repo/weights'
import { fmt } from '../../logic/format'
import { ROLE_LABEL, rirExplanation, roleOf, warmupSets } from '../../logic/roles'
import type { WorkoutExercise } from './useWorkout'

/**
 * Kurze Erklärung zur Übung im Übungs-Sheet: Ziel-RIR, Rolle, Anker/Varianten mit „Fixieren“
 * und – nur bei der ersten schweren Grundübung – Aufwärmsätze (zählen nicht als Arbeitssätze).
 */
export function ExerciseGuide({ item, warmup, finished }: { item: WorkoutExercise; warmup: boolean; finished: boolean }) {
  const toast = useToast()
  const pe = useLiveQuery(async () => (item.planExerciseId ? await db.planExercises.get(item.planExerciseId) : undefined), [item.planExerciseId])
  if (item.exercise.art !== 'kraft') return null
  const role = item.role ?? roleOf(item.exercise)
  const others = (pe?.variants ?? []).filter((v) => v !== item.exerciseId)
  const canPin = !!pe && !pe.anchor && ((pe.variants?.length ?? 0) > 1 || pe.pinned)
  const warm = warmup && role === 'grund' ? warmupSets(item.weight, stepFor(item.exercise)) : []

  let rotation = ''
  if (pe?.anchor) rotation = 'Anker: bleibt im ganzen Zyklus gleich, damit Dein Fortschritt messbar ist.'
  else if (pe?.pinned) rotation = 'Fixiert: wird nicht automatisch variiert.'
  else if (others.length) rotation = `Wechselt von Training zu Training mit ${others.map((v) => `„${getExercise(v)?.name ?? v}“`).join(' und ')} – jede Variante hat ihren eigenen Verlauf.`

  return (
    <div className="mx-6 mt-[14px] rounded-lg bg-surface-2 px-4 py-3 text-[13.5px] leading-snug text-fg-2">
      <p>
        <span className="font-semibold text-fg">Ziel-RIR {item.targetRir}</span> · {rirExplanation(item.targetRir, role)}
      </p>
      <p className="mt-[6px]">
        <span className="font-semibold text-fg">{ROLE_LABEL[role]}</span>
        {rotation ? ` · ${rotation}` : ''}
      </p>
      {warm.length > 0 && (
        <p className="mt-[6px]">
          <span className="font-semibold text-fg">Aufwärmen</span> (zählt nicht als Arbeitssatz):{' '}
          {warm.map((w) => (w.weight ? `${w.reps} × ${fmt(w.weight)} kg` : `${w.reps} Wdh. leicht`)).join(' · ')}
        </p>
      )}
      {canPin && !finished && (
        <button
          type="button"
          onClick={async () => {
            await setExercisePinned(pe!.id!, !pe!.pinned, item.exerciseId)
            toast(pe!.pinned ? 'Fixierung aufgehoben' : 'Übung fixiert', pe!.pinned ? 'Wechselt wieder mit ihren Varianten.' : `„${item.exercise.name}“ bleibt fest im Plan.`)
          }}
          className={`mt-[10px] flex h-[32px] items-center gap-1 rounded-md px-3 text-[13.5px] font-semibold ${pe!.pinned ? 'bg-fg text-fg-inverse' : 'bg-elevated text-fg'}`}
        >
          <Icon name={pe!.pinned ? 'lock' : 'bookmark'} size={16} />
          {pe!.pinned ? 'Fixiert' : 'Fixieren'}
        </button>
      )}
    </div>
  )
}
