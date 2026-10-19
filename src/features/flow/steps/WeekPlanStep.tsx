import { useState } from 'react'
import type { Experience, SplitId } from '../../../db/types'
import { WEEKDAYS_LETTER } from '../../../logic/dates'
import { dayNamesFor, recommendedDuration } from '../../../logic/planGenerator'
import { Icon } from '../../../components/icons/Icon'
import { Slider } from '../../../components/ui/Slider'
import { RecommendedLegend } from '../FlowLayout'

/** Farbverlauf der Kugeln je Einheit (gemessen: Push #E0724C→#593C31, Pull #E5A53A→#5A4926). */
export const DAY_COLORS: Record<string, [string, string]> = {
  Push: ['#e0724c', '#4a3029'],
  Pull: ['#e5a53a', '#4a3c22'],
  Legs: ['#8a6be0', '#33284f'],
  Upper: ['#e0724c', '#4a3029'],
  Lower: ['#e5a53a', '#4a3c22'],
  Ganzkörper: ['#e0724c', '#4a3029'],
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} Min`
  return m ? `${h} h ${m} Min` : `${h} h`
}

export function WeekPlanEditor({
  split,
  weekdays,
  onWeekdays,
  minutes,
  onMinutes,
  experience,
}: {
  split: SplitId
  weekdays: number[]
  onWeekdays: (w: number[]) => void
  minutes: number
  onMinutes: (m: number) => void
  experience: Experience
}) {
  const names = dayNamesFor(split, weekdays)
  const unique = [...new Set(Object.values(names))]
  const [selected, setSelected] = useState<number | null>(weekdays[weekdays.length - 2] ?? weekdays[0] ?? 0)
  const [swapMode, setSwapMode] = useState(false)
  const rec = recommendedDuration(experience)

  const tap = (d: number) => {
    if (swapMode && selected !== null && selected !== d) {
      const has = (x: number) => weekdays.includes(x)
      let next = [...weekdays]
      if (has(selected) !== has(d)) next = has(selected) ? next.filter((x) => x !== selected).concat(d) : next.filter((x) => x !== d).concat(selected)
      onWeekdays(next.sort((a, b) => a - b))
      setSelected(d)
      setSwapMode(false)
      return
    }
    setSelected(d)
    setSwapMode(false)
  }

  return (
    <>
      <div className="mt-[64px] flex flex-col gap-[7px]">
        {unique.map((n) => (
          <div key={n} className="flex items-center gap-[18px]">
            <span className="h-[15px] w-[15px] rounded-full" style={{ background: `linear-gradient(180deg, ${DAY_COLORS[n]?.[0] ?? '#e0724c'}, ${DAY_COLORS[n]?.[1] ?? '#4a3029'})` }} />
            <span className="text-[17px]">{n}</span>
          </div>
        ))}
      </div>
      <div className="mt-[24px] flex gap-[6px]">
        {WEEKDAYS_LETTER.map((letter, d) => {
          const name = names[d]
          const isSel = selected === d
          return (
            <div key={d} className="flex flex-1 flex-col items-center">
              <button
                type="button"
                onClick={() => tap(d)}
                aria-label={`${letter}: ${name ?? 'frei'}`}
                className="relative flex h-[100px] w-full flex-col items-center overflow-hidden rounded-full bg-elevated"
                style={isSel ? { boxShadow: '0 0 0 2.5px #ed774d, 0 0 14px 2px rgba(237,119,77,0.55)', background: '#312a28' } : undefined}
              >
                <span className="mt-[14px] text-[19px] font-bold">{letter}</span>
                {name && (
                  <span
                    className={`absolute bottom-0 aspect-square rounded-full ${isSel ? 'inset-x-[4px] bottom-[4px]' : 'inset-x-0'}`}
                    style={{ background: `linear-gradient(180deg, ${DAY_COLORS[name][0]} 0%, ${DAY_COLORS[name][1]} 100%)` }}
                  />
                )}
              </button>
              {isSel && (
                <button
                  type="button"
                  aria-label="Tag tauschen"
                  onClick={() => setSwapMode((v) => !v)}
                  className={`mt-[10px] flex h-[38px] w-[38px] items-center justify-center rounded-md ${swapMode ? 'bg-orange text-fg-inverse' : 'bg-elevated text-fg'}`}
                >
                  <Icon name="swap" size={24} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-3 h-5 text-center text-label text-fg-2">{swapMode ? 'Tippe auf den Tag, mit dem getauscht werden soll.' : ''}</p>

      <div className="-mb-3 mt-auto pt-[30px]">
        <p className="text-[27px] font-extrabold leading-none">{formatMinutes(minutes)}</p>
        <p className="mt-[6px] text-body font-light text-fg-2">Dauer der Einheit</p>
        <Slider className="mx-4 mt-[20px]" value={minutes} min={30} max={150} step={5} onChange={onMinutes} accent range={rec} ariaLabel="Dauer der Einheit" />
        <RecommendedLegend className="mt-[12px]" />
      </div>
    </>
  )
}
