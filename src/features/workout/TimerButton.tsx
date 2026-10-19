import { useRef } from 'react'
import { Icon } from '../../components/icons/Icon'
import { formatClock } from '../../logic/dates'
import { useToast } from '../../components/ui/Toast'
import { restTimer } from './restTimer'

/**
 * Pausentimer im weißen Button (S45): „01:59 ⏭“. Gedrückt halten überspringt die Pause,
 * kurzes Tippen zeigt den Hinweis oben. Am Ende blinkt der Button und es ertönt ein Signal.
 */
export function TimerButton({ remaining, total }: { remaining: number; total: number }) {
  const toast = useToast()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)
  const pct = total ? Math.min(100, (1 - remaining / total) * 100) : 0
  return (
    <button
      type="button"
      onPointerDown={() => {
        longPressed.current = false
        timer.current = setTimeout(() => {
          longPressed.current = true
          restTimer.skip()
        }, 600)
      }}
      onPointerUp={() => {
        if (timer.current) clearTimeout(timer.current)
        if (!longPressed.current) toast('Pause überspringen', 'Halte den Button gedrückt, um die Pause zu überspringen.')
      }}
      onPointerLeave={() => timer.current && clearTimeout(timer.current)}
      onContextMenu={(e) => e.preventDefault()}
      className="relative flex h-14 flex-1 items-center justify-between overflow-hidden rounded-xl bg-fg px-6 text-fg-inverse select-none"
      aria-label={`Pause: noch ${Math.ceil(remaining)} Sekunden`}
    >
      <span className="absolute inset-y-0 left-0 bg-black/[0.07]" style={{ width: `${pct}%` }} />
      <span className="relative text-[19px] font-extrabold tabular-nums">{formatClock(remaining)}</span>
      <Icon name="skipNext" size={24} className="relative" />
    </button>
  )
}
