import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '../../components/layout/PageHeader'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { Icon } from '../../components/icons/Icon'
import { db } from '../../db/db'
import type { WeeklyCheckin } from '../../db/types'
import { checkinStatus } from '../../db/repo/checkin'
import { formatDate } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { BodyValueCard } from './WeightCard'
import { PhotoGallery } from './PhotoGallery'
import { WeeklyCheckinSheet, type CheckinStep } from './WeeklyCheckinSheet'

/** Körper: wöchentlicher Check-in, Gewichtsverlauf, Fortschrittsfotos mit Vorher/Nachher-Vergleich. */
export function KoerperPage() {
  const status = useLiveQuery(async () => {
    // abhängig von Check-ins und Fotos, damit die Karte sich nach dem Speichern aktualisiert
    await db.checkins.count()
    await db.photos.count()
    return checkinStatus()
  }, [])
  const [sheet, setSheet] = useState<{ step: CheckinStep; checkin: WeeklyCheckin | null } | null>(null)

  return (
    <div className="min-h-full bg-bg">
      <PageHeader title="Körper" />

      <SectionLabel className="mt-[26px]">Wöchentlicher Check-in</SectionLabel>
      <div className="mx-5 mt-3 rounded-xl border border-elevated bg-surface px-4 py-4">
        {status && (
          <>
            <div className="flex items-center gap-3">
              <Icon name="event" size={26} className={status.due ? 'text-orange' : 'text-fg-2'} />
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-semibold">{status.due ? 'Check-in fällig' : status.nextInDays === 1 ? 'Nächster Check-in morgen' : `Nächster Check-in in ${status.nextInDays} Tagen`}</p>
                <p className="text-[13.5px] text-fg-2">{status.last ? `Zuletzt am ${formatDate(status.last.date)} · ${fmt(status.last.weight, 1)} kg` : 'Noch kein Check-in'}</p>
              </div>
            </div>
            {status.photoPending && (
              <button type="button" onClick={() => setSheet({ step: 'foto', checkin: status.photoPending })} className="mt-3 flex w-full items-center gap-2 rounded-lg bg-[#2a150d] px-3 py-3 text-left text-[14.5px]">
                <Icon name="addPhoto" size={22} className="text-[#ed774d]" />
                <span className="flex-1">Foto zum Check-in vom {formatDate(status.photoPending.date)} fehlt noch</span>
                <Icon name="chevronRight" size={20} />
              </button>
            )}
            <button type="button" onClick={() => setSheet({ step: 'gewicht', checkin: null })} className="mt-3 flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-surface-3 text-[15.5px] font-semibold">
              <Icon name="scale" size={20} /> {status.due ? 'Check-in starten' : 'Gewicht jetzt eintragen'}
            </button>
          </>
        )}
      </div>

      <SectionLabel className="mt-[30px]">Verlauf</SectionLabel>
      <div className="mt-3 flex flex-col gap-[14px] px-4">
        <BodyValueCard kind="weight" title="Körpergewicht" unit="kg" color="#5bbd52" />
        <BodyValueCard kind="bodyfat" title="Körperfett" unit="%" color="#f3ae3c" />
      </div>

      <SectionLabel className="mt-[30px]">Fortschrittsfotos</SectionLabel>
      <div className="mt-3 px-4">
        <PhotoGallery />
      </div>

      <WeeklyCheckinSheet open={!!sheet} step={sheet?.step ?? 'gewicht'} checkin={sheet?.checkin} required={false} onClose={() => setSheet(null)} />
    </div>
  )
}
