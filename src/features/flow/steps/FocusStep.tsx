import type { MuscleId } from '../../../db/types'
import { FOCUS_OPTIONS, muscleLabel } from '../../../data/muskeln'
import { Icon } from '../../../components/icons/Icon'

const MAX_FOCUS = 3

/** Schwerpunkte / Problemzonen: bis zu drei Muskelgruppen priorisieren. */
export function FocusEditor({ value, onChange }: { value: MuscleId[]; onChange: (v: MuscleId[]) => void }) {
  const toggle = (m: MuscleId) => {
    if (value.includes(m)) onChange(value.filter((x) => x !== m))
    else if (value.length < MAX_FOCUS) onChange([...value, m])
  }
  return (
    <>
      <div className="mt-[26px] grid grid-cols-2 gap-[10px]">
        {FOCUS_OPTIONS.map((m) => {
          const on = value.includes(m)
          const full = !on && value.length >= MAX_FOCUS
          return (
            <button
              key={m}
              type="button"
              onClick={() => toggle(m)}
              disabled={full}
              className={`flex h-[54px] items-center justify-between rounded-lg px-4 text-left text-[17px] font-semibold disabled:opacity-40 ${on ? 'border-grad-accent' : 'border border-[#262626] bg-surface'}`}
            >
              <span className={on ? 'text-grad-accent' : ''}>{muscleLabel(m)}</span>
              {on && <Icon name="check" size={22} style={{ color: '#ed774d' }} />}
            </button>
          )
        })}
      </div>
      <p className="mt-4 text-label text-fg-2">
        {value.length}/{MAX_FOCUS} gewählt – Schwerpunkte bekommen einen Satz mehr und, wenn Zeit bleibt, eine zusätzliche Übung.
      </p>
    </>
  )
}
