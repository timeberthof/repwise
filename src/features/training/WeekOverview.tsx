import { useState } from 'react'
import type { DayEntry } from '../../db/repo/sessions'
import type { ISODate } from '../../db/types'
import { Icon } from '../../components/icons/Icon'
import { parseISO, today, WEEKDAYS_SHORT, weekdayIndex } from '../../logic/dates'
import { fmt } from '../../logic/format'

export interface WeekData {
  days: { date: ISODate; entries: DayEntry[] }[]
  sets: number
  volume: number
  stats: Record<number, { sets: number; volume: number; minutes: number | null }>
}

type EntryState = 'erledigt' | 'verpasst' | 'uebersprungen' | 'laeuft' | 'offen' | 'vorschau' | 'pausiert'

export function entryState(e: DayEntry): EntryState {
  const t = today()
  if (e.paused) return 'pausiert'
  const st = e.session?.status
  if (st === 'fertig') return 'erledigt'
  if (st === 'uebersprungen') return 'uebersprungen'
  if (st === 'laeuft') return 'laeuft'
  if (e.date < t) return 'verpasst'
  if (e.date > t) return 'vorschau'
  return 'offen'
}

const STATE_STYLE: Record<EntryState, { icon: Parameters<typeof Icon>[0]['name'] | null; color: string; label: string }> = {
  erledigt: { icon: 'checkCircle', color: '#5bbd52', label: 'erledigt' },
  verpasst: { icon: 'close', color: '#d2463b', label: 'verpasst' },
  uebersprungen: { icon: 'skipNext', color: '#9f9f9f', label: 'übersprungen' },
  laeuft: { icon: 'play', color: '#ed774d', label: 'läuft' },
  offen: { icon: null, color: '#f3f3f3', label: 'heute' },
  vorschau: { icon: null, color: '#9f9f9f', label: 'geplant' },
  pausiert: { icon: 'pause', color: '#ffaa00', label: 'pausiert' },
}

/** Wochenübersicht: geplant vs. tatsächlich trainiert (vergangene Wochen) bzw. Vorschau (kommende). */
export function WeekOverview({ data, selected, onSelect, mode }: { data: WeekData; selected: ISODate; onSelect: (d: ISODate) => void; mode: 'vergangen' | 'aktuell' | 'kommend' }) {
  const [open, setOpen] = useState(mode !== 'aktuell')
  const all = data.days.flatMap((d) => d.entries).filter((e) => e.kind === 'kraft')
  const done = all.filter((e) => e.session?.status === 'fertig').length
  const missed = all.filter((e) => entryState(e) === 'verpasst').length
  const summary =
    mode === 'kommend'
      ? `Vorschau · ${all.length} Krafteinheiten geplant`
      : `${done} von ${all.length} Einheiten absolviert${missed ? ` · ${missed} verpasst` : ''}${data.sets ? ` · ${data.sets} Sätze · ${fmt(Math.round(data.volume / 100) / 10, 1)} t` : ''}`
  return (
    <div className="rounded-xl border border-elevated bg-surface">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-[13px] text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">Wochenübersicht</span>
          <span className="block text-[13.5px] text-fg-2">{summary}</span>
        </span>
        <Icon name={open ? 'arrowUp' : 'arrowDown'} size={24} className="text-fg-2" />
      </button>
      {open && (
        <div className="border-t border-elevated px-2 py-1">
          {data.days.map((d) => {
            const isSel = d.date === selected
            return (
              <button key={d.date} type="button" onClick={() => onSelect(d.date)} className={`flex w-full items-center gap-3 rounded-md px-2 py-[7px] text-left ${isSel ? 'bg-surface-2' : ''}`}>
                <span className={`w-[64px] shrink-0 text-[14px] ${d.date === today() ? 'font-semibold text-orange' : 'text-fg-2'}`}>
                  {WEEKDAYS_SHORT[weekdayIndex(d.date)]} {parseISO(d.date).getDate()}.
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1">
                  {d.entries.length === 0 && <span className="text-[14px] text-fg-3">Ruhetag</span>}
                  {d.entries.map((e) => {
                    const st = STATE_STYLE[entryState(e)]
                    const stats = e.session?.id ? data.stats[e.session.id] : undefined
                    return (
                      <span key={e.key} className="flex items-center gap-1 text-[14px]" style={{ color: e.kind === 'mobility' ? '#9f9f9f' : st.color === '#9f9f9f' ? '#cfcfcf' : '#f3f3f3' }}>
                        {st.icon && <Icon name={st.icon} size={16} style={{ color: st.color }} />}
                        {e.name}
                        {stats && e.kind === 'kraft' ? <span className="text-fg-2">· {stats.sets} Sätze</span> : null}
                        {!st.icon && <span className="text-fg-3">· {st.label}</span>}
                      </span>
                    )
                  })}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
