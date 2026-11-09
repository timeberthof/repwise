import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { BodyEntry } from '../../db/types'
import { Segmented } from '../../components/ui/Segmented'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { Icon } from '../../components/icons/Icon'
import { addDays, formatDate, formatLong, today } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { TrendChart } from '../statistik/charts'

type Range = '3m' | '1j' | 'alle'
const RANGES: { id: Range; label: string }[] = [
  { id: '3m', label: '3 Monate' },
  { id: '1j', label: '1 Jahr' },
  { id: 'alle', label: 'Alle' },
]
const fromFor = (r: Range) => (r === '3m' ? addDays(today(), -91) : r === '1j' ? addDays(today(), -365) : '0000-00-00')

/** Differenz neutral (ohne Bewertung als gut/schlecht). */
function Change({ value, unit }: { value: number; unit: string }) {
  const r = Math.round(value * 10) / 10
  return (
    <span className="whitespace-nowrap text-[15px] font-semibold text-fg-2">
      {r > 0 ? '+' : r < 0 ? '−' : '±'} {fmt(Math.abs(r), 1)} {unit}
    </span>
  )
}

/** Verlauf eines Körperwerts (Gewicht, Körperfett) mit Zeitraum und Einträgen zum Korrigieren. */
export function BodyValueCard({ kind, title, unit, color }: { kind: BodyEntry['kind']; title: string; unit: string; color: string }) {
  const all = useLiveQuery(() => db.body.where('kind').equals(kind).sortBy('date'), [kind])
  const [range, setRange] = useState<Range>('3m')
  const [showAll, setShowAll] = useState(false)
  const [edit, setEdit] = useState<BodyEntry | null>(null)
  if (!all) return null
  if (!all.length && kind !== 'weight') return null
  const from = fromFor(range)
  const points = all.filter((b) => b.date >= from).map((b) => ({ date: b.date, value: b.value }))
  const latest = all.at(-1)
  const entries = [...all].reverse()
  return (
    <section className="rounded-xl border border-elevated bg-surface pb-2 pt-[14px]" aria-label={title}>
      <div className="flex items-start justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="text-[20px] font-semibold leading-tight">
            {title} {latest && <span className="text-fg-2">{fmt(latest.value, 1)} {unit}</span>}
          </p>
          <p className="mt-[5px] text-[14px] font-light text-fg-2">{latest ? `Zuletzt am ${formatDate(latest.date)} · ${all.length} Einträge` : 'Noch kein Eintrag – der wöchentliche Check-in trägt es ein.'}</p>
        </div>
        {points.length > 1 && <Change value={points[points.length - 1].value - points[0].value} unit={unit} />}
      </div>
      {all.length > 0 && (
        <>
          <Segmented small className="mx-4 mt-3" value={range} onChange={setRange} options={RANGES} />
          <div className="mt-2 pr-1">
            <TrendChart points={points} color={color} unit={unit} height={190} />
          </div>
          <div className="mx-4 mt-2 overflow-hidden rounded-lg bg-surface-2">
            {(showAll ? entries : entries.slice(0, 5)).map((b, i, arr) => (
              <button key={b.id} type="button" onClick={() => setEdit(b)} className={`flex h-[46px] w-full items-center justify-between px-3 text-left ${i < arr.length - 1 ? 'border-b border-elevated' : ''}`}>
                <span className="text-[15px] text-fg-2">{formatDate(b.date)}</span>
                <span className="flex items-center gap-2 text-[16px] font-semibold tabular-nums">
                  {fmt(b.value, 1)} {unit}
                  <Icon name="edit" size={16} className="text-fg-3" />
                </span>
              </button>
            ))}
          </div>
          {entries.length > 5 && (
            <button type="button" onClick={() => setShowAll(!showAll)} className="mx-4 mt-1 h-10 text-[14.5px] font-semibold text-fg-2">
              {showAll ? 'Weniger anzeigen' : `Alle ${entries.length} Einträge anzeigen`}
            </button>
          )}
        </>
      )}
      <EditEntrySheet entry={edit} unit={unit} onClose={() => setEdit(null)} />
    </section>
  )
}

function EditEntrySheet({ entry, unit, onClose }: { entry: BodyEntry | null; unit: string; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [shownFor, setShownFor] = useState<number | undefined>()
  if (entry && entry.id !== shownFor) {
    setShownFor(entry.id)
    setValue(fmt(entry.value, 1))
  }
  const n = Number(value.trim().replace(',', '.'))
  const valid = Number.isFinite(n) && n > 0 && n < 500
  return (
    <>
      <BottomSheet
        open={!!entry}
        onClose={onClose}
        label="Eintrag bearbeiten"
        footer={
          <Button
            disabled={!valid}
            onClick={async () => {
              await db.body.update(entry!.id!, { value: Math.round(n * 10) / 10 })
              onClose()
            }}
          >
            Speichern
          </Button>
        }
      >
        <SheetTitle>{entry ? formatLong(entry.date) : ''}</SheetTitle>
        <div className="px-6 pb-4">
          <label className="flex items-center gap-3 rounded-xl bg-surface-2 px-4">
            <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-label={`Wert in ${unit}`} className="h-[56px] min-w-0 flex-1 bg-transparent text-[24px] font-bold tabular-nums outline-none" />
            <span className="text-[18px] text-fg-2">{unit}</span>
          </label>
          <button type="button" onClick={() => setConfirm(true)} className="mt-5 text-[15px] font-semibold text-[#ff6b5f]">
            Eintrag löschen
          </button>
        </div>
      </BottomSheet>
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Eintrag löschen?"
        text="Nur dieser eine Wert wird gelöscht."
        confirmLabel="Löschen"
        onConfirm={async () => {
          if (entry?.id) await db.body.delete(entry.id)
          setConfirm(false)
          onClose()
        }}
      />
    </>
  )
}
