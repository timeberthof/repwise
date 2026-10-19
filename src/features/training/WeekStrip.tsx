import { useRef } from 'react'
import type { ISODate } from '../../db/types'
import { addDays, parseISO, WEEKDAYS_SHORT, weekDates, today as todayFn } from '../../logic/dates'
import { Icon } from '../../components/icons/Icon'

export interface DayMarker {
  kraft: boolean
  mobility: boolean
  done: boolean
}

/**
 * Wochenleiste wie im Original: Wochentage grau, Zahlen weiß, heute/gewählt als weißes Quadrat,
 * erledigte Tage als grüner Haken, darunter Pillen für geplante Einheiten (Kraft orange, Mobility blau).
 * Nach links/rechts wischen wechselt die Woche.
 */
export function WeekStrip({ selected, onSelect, markers }: { selected: ISODate; onSelect: (d: ISODate) => void; markers: Record<ISODate, DayMarker> }) {
  const days = weekDates(selected)
  const t = todayFn()
  const start = useRef<number | null>(null)
  return (
    <div
      className="touch-pan-y"
      onTouchStart={(e) => (start.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (start.current === null) return
        const dx = e.changedTouches[0].clientX - start.current
        start.current = null
        if (Math.abs(dx) > 50) onSelect(addDays(selected, dx < 0 ? 7 : -7))
      }}
    >
      <div className="grid h-[20px] grid-cols-7 items-center px-[6px]">
        {WEEKDAYS_SHORT.map((w) => (
          <span key={w} className="text-center text-[16.5px] font-light text-fg-2">
            {w}
          </span>
        ))}
      </div>
      <div className="mt-[8px] grid grid-cols-7 px-[6px] pb-[13px]">
        {days.map((d) => {
          const m = markers[d]
          const isSel = d === selected
          const isToday = d === t
          return (
            <button key={d} type="button" onClick={() => onSelect(d)} className="flex flex-col items-center" aria-label={d} aria-current={isSel ? 'date' : undefined}>
              <span className={`flex h-[30px] w-[30px] items-center justify-center rounded-sm text-body ${isSel ? 'bg-white text-black' : isToday ? 'text-orange' : 'text-fg'}`}>
                {m?.done && !isSel ? (
                  <Icon name="checkCircle" size={30} style={{ color: '#5bbd52' }} />
                ) : (
                  parseISO(d).getDate()
                )}
              </span>
              <span className="mt-[5px] flex h-[6px] items-center">
                {(m?.kraft || m?.mobility) && (
                  <span
                    className="h-[5.5px] rounded-full"
                    style={{
                      width: m.kraft && m.mobility ? 14 : 9,
                      background: m.kraft && m.mobility ? 'linear-gradient(90deg,#ed774d 0 45%,#2020f5 55% 75%,#613cb0 100%)' : m.kraft ? '#ed774d' : 'linear-gradient(90deg,#2020f5,#613cb0)',
                    }}
                  />
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
