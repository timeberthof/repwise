import { useEffect, useState } from 'react'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { db } from '../../db/db'
import { addDays, formatLong, relativeDayLabel, today } from '../../logic/dates'
import { Icon } from '../../components/icons/Icon'

/**
 * Schritte eintragen – standardmäßig für gestern (DECISIONS.md, Frage 7).
 * Überspringen möglich, ältere Tage über die Pfeile nachtragen.
 */
export function StepsSheet({ open, onClose, initialDate }: { open: boolean; onClose: () => void; initialDate?: string }) {
  const yesterday = addDays(today(), -1)
  const [date, setDate] = useState(initialDate ?? yesterday)
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) setDate(initialDate ?? yesterday)
  }, [open, initialDate, yesterday])

  useEffect(() => {
    if (!open) return
    db.steps.get(date).then((e) => setValue(e?.steps ? String(e.steps) : ''))
  }, [open, date])

  const save = async () => {
    const n = Number(value.replace(/\D/g, ''))
    await db.steps.put({ date, steps: Number.isFinite(n) && n > 0 ? n : 0 })
    onClose()
  }
  const skip = async () => {
    const existing = await db.steps.get(date)
    if (!existing) await db.steps.put({ date, steps: null, skipped: true })
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="Schritte eintragen"
      action={{ label: 'Überspringen', onClick: skip }}
      footer={
        <Button onClick={save} disabled={!value}>
          Speichern
        </Button>
      }
    >
      <SheetTitle sub="Trag die Schritte von Deiner Garmin ein.">Schritte</SheetTitle>
      <div className="mx-6 mb-5 flex items-center justify-between">
        <button type="button" aria-label="Vorheriger Tag" className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-elevated" onClick={() => setDate(addDays(date, -1))}>
          <Icon name="chevronLeft" size={20} />
        </button>
        <div className="text-center">
          <p className="text-card font-semibold">{relativeDayLabel(date)}</p>
          <p className="text-label text-fg-2">{formatLong(date)}</p>
        </div>
        <button
          type="button"
          aria-label="Nächster Tag"
          disabled={date >= yesterday}
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-elevated disabled:opacity-30"
          onClick={() => setDate(addDays(date, 1))}
        >
          <Icon name="chevronRight" size={20} />
        </button>
      </div>
      <div className="mx-4 mb-4 flex h-[100px] items-center justify-center rounded-xl border border-elevated bg-surface">
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="0"
          value={value ? new Intl.NumberFormat('de-DE').format(Number(value.replace(/\D/g, ''))) : ''}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full bg-transparent text-center text-display-xl font-extrabold text-fg outline-none placeholder:text-fg-3"
          aria-label="Schritte"
        />
      </div>
      <p className="px-6 pb-4 text-center text-label text-fg-2">Schritte</p>
    </BottomSheet>
  )
}
