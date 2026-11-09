import { Icon } from '../../components/icons/Icon'
import { formatClock } from '../../logic/dates'
import { restTimer, useRestTimer } from './restTimer'

/** Pausentimer-Leiste über den Buttons: Restzeit, +30 s, überspringen. Am Ende Ton und Hinweis. */
export function RestTimerBar({ sessionId }: { sessionId: number }) {
  const { remaining, total, justFinished } = useRestTimer(sessionId)
  if (remaining === null && !justFinished) return null
  if (remaining === null)
    return (
      <div className="mb-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#5bbd52] text-[17px] font-bold text-black" role="status">
        <Icon name="timer" size={22} /> Pause vorbei
      </div>
    )
  const pct = total ? Math.min(100, (1 - remaining / total) * 100) : 0
  return (
    <div className="relative mb-2 flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-surface-3 pl-4 pr-1" role="timer" aria-label={`Pause: noch ${Math.ceil(remaining)} Sekunden`}>
      <span className="absolute inset-y-0 left-0 bg-white/[0.08]" style={{ width: `${pct}%` }} />
      <Icon name="timer" size={22} className="relative" />
      <span className="relative flex-1 text-[19px] font-extrabold tabular-nums">{formatClock(remaining)}</span>
      <button type="button" onClick={() => restTimer.add(30)} className="relative h-10 rounded-lg px-3 text-[15px] font-semibold">
        +30 s
      </button>
      <button type="button" aria-label="Pause überspringen" onClick={() => restTimer.skip()} className="relative flex h-10 w-10 items-center justify-center rounded-lg">
        <Icon name="skipNext" size={24} />
      </button>
    </div>
  )
}
