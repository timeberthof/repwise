import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import type { ISODate } from '../../db/types'
import { IconTile } from '../../components/ui/IconTile'
import { Icon } from '../../components/icons/Icon'
import { CARDIO_ACTIVITIES } from './activities'

/** Cardio-Einträge eines Tages als Karten im Training-Tab. */
export function CardioCards({ date }: { date: ISODate }) {
  const navigate = useNavigate()
  const list = useLiveQuery(() => db.cardio.where('date').equals(date).toArray(), [date])
  if (!list?.length) return null
  return (
    <>
      {list.map((c) => {
        const a = CARDIO_ACTIVITIES.find((x) => x.id === c.activity)!
        return (
          <button key={c.id} type="button" onClick={() => navigate(`/cardio/${c.id}`)} className="rounded-xl border border-elevated bg-surface px-4 py-4 text-left active:opacity-80">
            <div className="flex items-center gap-[14px]">
              <IconTile icon={a.icon} color="#673ab7" bg="#1a0f2e" size={36} className="!h-[36px] !w-[36px]" />
              <span className="flex-1 truncate text-[20px] font-semibold">{c.activityText || a.label}</span>
              <Icon name="chevronRight" size={24} className="text-fg-2" />
            </div>
            <div className="mt-[16px] grid grid-cols-2 gap-x-3 text-[16.5px]">
              <span className="flex items-center gap-3">
                <Icon name="schedule" size={24} className="text-fg-2" />
                {c.durationMin} Minuten
              </span>
              <span className="flex items-center gap-3">
                <Icon name="heart" size={22} className="text-fg-2" />
                {c.avgHr ? `Ø ${c.avgHr} bpm` : `Zone ${c.zone}`}
              </span>
            </div>
          </button>
        )
      })}
    </>
  )
}
