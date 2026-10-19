import type { DayEntry } from '../../db/repo/sessions'
import { getExercise } from '../../data/exercises'
import { muscleLabel } from '../../data/muskeln'
import { Icon } from '../../components/icons/Icon'
import { IconTile } from '../../components/ui/IconTile'
import { Badge } from '../../components/ui/Chip'
import { ExerciseGlyph } from '../../components/ui/ExerciseGlyph'
import { WEEK_TYPE_INFO } from '../../logic/progression'
import { fmt } from '../../logic/format'
import { WEEK_TYPE_STYLE } from './weekTypeStyle'
import { entryState } from './WeekOverview'
import type { MuscleId } from '../../db/types'

export function entryExerciseIds(e: DayEntry): string[] {
  return e.sessionExercises?.length ? e.sessionExercises.map((x) => x.exerciseId) : e.planExercises.map((x) => x.exerciseId)
}

export function entryMuscles(e: DayEntry): string {
  const ms: MuscleId[] = []
  for (const id of entryExerciseIds(e)) {
    const m = getExercise(id)?.primaer
    if (m && !ms.includes(m)) ms.push(m)
  }
  return ms.map(muscleLabel).join(', ')
}

/** Einheiten-Karte wie „Push“ / „Mobility“ im Training-Tab (S02/S03). */
export function SessionCard({ entry, stats, onOpen, onMenu }: { entry: DayEntry; stats?: { sets: number; volume: number; minutes: number | null }; onOpen: () => void; onMenu: () => void }) {
  const ids = entryExerciseIds(entry)
  const state = entryState(entry)
  const isMobility = entry.kind === 'mobility'
  const showType = entry.kind === 'kraft' && entry.weekType !== 'normal' && state !== 'erledigt'
  const imported = !!entry.session?.imported
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      className={`rounded-xl border border-elevated bg-surface px-4 pb-[18px] pt-4 active:opacity-80 ${state === 'uebersprungen' || state === 'pausiert' ? 'opacity-45' : state === 'verpasst' ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center gap-[14px]">
        <IconTile icon={isMobility ? 'mobility' : 'dumbbell'} color={isMobility ? '#2020f5' : '#ed774d'} bg={isMobility ? '#08083d' : '#3b1d12'} size={36} className="!h-[36px] !w-[36px]" />
        <span className="min-w-0 flex-1 truncate text-[20px] font-semibold">{entry.name}</span>
        {state === 'erledigt' && (
          <span className="flex items-center gap-1 text-[13px] font-semibold uppercase tracking-[0.04em] text-green">
            <Icon name="checkCircle" size={22} /> Erledigt
          </span>
        )}
        {state === 'laeuft' && <Badge color="#ed774d">Läuft</Badge>}
        {state === 'uebersprungen' && <Badge color="#9f9f9f">Übersprungen</Badge>}
        {state === 'verpasst' && <Badge color="#d2463b">Verpasst</Badge>}
        {state === 'pausiert' && <Badge color="#ffaa00">Pausiert</Badge>}
        {showType && (
          <span className="flex items-center gap-1">
            <Badge color={WEEK_TYPE_STYLE[entry.weekType].badge}>{WEEK_TYPE_INFO[entry.weekType].label}</Badge>
            {entry.weekTypeManual && <Icon name="edit" size={14} className="text-fg-2" />}
          </span>
        )}
        {!imported && (
          <button
            type="button"
            aria-label="Menü"
            onClick={(ev) => {
              ev.stopPropagation()
              onMenu()
            }}
            className="-mr-2 flex h-9 w-9 items-center justify-center text-fg"
          >
            <Icon name="moreVert" size={26} />
          </button>
        )}
      </div>
      {imported ? (
        <p className="mt-4 text-body text-fg-2">Aus Deiner bisherigen App übernommen – Maximalkraft-Werte siehe Statistik.</p>
      ) : (
        <>
          <div className="mt-[18px] grid grid-cols-2 gap-x-3 text-[16.5px]">
            <span className="flex items-center gap-3">
              <Icon name="schedule" size={24} className="text-fg-2" />
              {state === 'erledigt' && stats?.minutes ? `${stats.minutes} Minuten` : `${entry.minutes} Minuten`}
            </span>
            <span className="flex items-center gap-3">
              <Icon name="list" size={24} className="text-fg-2" />
              {state === 'erledigt' && stats ? `${stats.sets} Sätze` : `${ids.length} Übungen`}
            </span>
          </div>
          {state === 'erledigt' && stats && !isMobility ? (
            <p className="mt-[14px] flex items-center gap-3 text-[16.5px]">
              <Icon name="barbell" size={24} className="shrink-0 text-fg-2" />
              {fmt(stats.volume)} kg bewegt · {ids.length} Übungen
            </p>
          ) : (
            <p className="mt-[14px] flex items-start gap-3 text-[16.5px] leading-snug">
              <Icon name="person" size={24} className="mt-[-1px] shrink-0 text-fg-2" />
              <span>{entryMuscles(entry)}</span>
            </p>
          )}
          <div className="no-scrollbar -mx-1 mt-[16px] flex gap-[14px] overflow-x-auto">
            {ids.slice(0, 8).map((id, i) => {
              const ex = getExercise(id)
              return ex ? (
                <span key={`${id}-${i}`} className="flex h-[58px] w-[58px] shrink-0 items-center justify-center">
                  <ExerciseGlyph exercise={ex} size={50} />
                </span>
              ) : null
            })}
          </div>
          {state === 'vorschau' && (
            <p className="mt-3 flex items-center gap-2 text-[13.5px] text-fg-2">
              <Icon name="visibility" size={18} /> Vorschau – Gewichte und Ziele können sich durch kommende Trainings noch ändern.
            </p>
          )}
        </>
      )}
    </div>
  )
}
