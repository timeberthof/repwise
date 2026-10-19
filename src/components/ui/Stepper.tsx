import { fmt } from '../../logic/format'
import { Icon } from '../icons/Icon'

interface StepperProps {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  digits?: number
  big?: boolean
  dim?: boolean
  compact?: boolean
}

/** „− 5 +“ – einzelner Stepper. */
export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, digits = 2, big, dim, compact }: StepperProps) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Number(v.toFixed(3)))))
  const btn = compact ? 'h-11 w-9' : 'h-11 w-11'
  const icon = big ? 30 : compact ? 22 : 26
  return (
    <div className="flex items-center justify-between gap-1">
      <button type="button" aria-label="weniger" className={`flex items-center justify-center text-fg active:opacity-60 ${btn}`} onClick={() => set(value - step)}>
        <Icon name="remove" size={icon} />
      </button>
      <span className={`min-w-[2ch] text-center ${big ? 'text-display font-bold' : compact ? 'text-[21px]' : 'text-[26px] font-normal'} ${dim ? 'text-fg-2' : 'text-fg'}`}>{fmt(value, digits)}</span>
      <button type="button" aria-label="mehr" className={`flex items-center justify-center text-fg active:opacity-60 ${btn}`} onClick={() => set(value + step)}>
        <Icon name="add" size={icon} />
      </button>
    </div>
  )
}

/** Großes Stepper-Feld wie „− 2 +“ (Sätze) oder „⊖ 80,0 kg ⊕“. */
export function StepperField({ value, onChange, step = 1, min = 0, max = 999, suffix = '', digits = 1, circled }: StepperProps & { suffix?: string; circled?: boolean }) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Number(v.toFixed(3)))))
  const btn = circled ? 'h-[52px] w-[52px] rounded-full border-2 border-elevated' : 'h-12 w-12'
  return (
    <div className={`flex items-center justify-between ${circled ? 'px-[18px] py-[20px]' : 'h-[66px] rounded-lg bg-elevated px-8'}`}>
      <button type="button" aria-label="weniger" className={`flex items-center justify-center text-fg active:opacity-60 ${btn}`} onClick={() => set(value - step)}>
        <Icon name="remove" size={circled ? 28 : 32} />
      </button>
      <span className={circled ? 'text-display-xl font-extrabold' : 'text-display font-bold'}>
        {fmt(value, digits)}
        {suffix && ` ${suffix}`}
      </span>
      <button type="button" aria-label="mehr" className={`flex items-center justify-center text-fg active:opacity-60 ${btn}`} onClick={() => set(value + step)}>
        <Icon name="add" size={circled ? 28 : 32} />
      </button>
    </div>
  )
}
