import { useEffect, useState } from 'react'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { StepperField } from '../../components/ui/Stepper'
import { db } from '../../db/db'
import { formatLong, today } from '../../logic/dates'
import { useToast } from '../../components/ui/Toast'

/** Gewicht eintragen (wie „GEWICHT EINGEBEN ⊖ 80,0 kg ⊕“ im Original), mit Verlauf. */
export function WeightSheet({ open, onClose, date = today() }: { open: boolean; onClose: () => void; date?: string }) {
  const [value, setValue] = useState(80)
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    db.body
      .where('kind')
      .equals('weight')
      .sortBy('date')
      .then((list) => {
        const sameDay = list.find((b) => b.date === date)
        const last = list[list.length - 1]
        setValue(sameDay?.value ?? last?.value ?? 80)
      })
  }, [open, date])

  const save = async () => {
    const existing = await db.body.where('[kind+date]').equals(['weight', date]).first()
    if (existing?.id) await db.body.update(existing.id, { value, source: 'app' })
    else await db.body.add({ date, kind: 'weight', value, source: 'app' })
    toast('Gewicht gespeichert', `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} kg am ${formatLong(date)}`)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} label="Gewicht eingeben" footer={<Button onClick={save}>Speichern</Button>}>
      <SheetTitle sub={`Für ${formatLong(date)}. Kalorienbedarf und Plan werden automatisch angepasst.`}>Gewicht eingeben</SheetTitle>
      <div className="mx-4 mb-4 rounded-xl border border-elevated bg-surface">
        <StepperField value={value} onChange={setValue} step={0.1} min={30} max={250} suffix="kg" digits={1} circled />
      </div>
    </BottomSheet>
  )
}
