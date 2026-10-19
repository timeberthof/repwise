import { useEffect, useState } from 'react'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { StepperField } from '../../components/ui/Stepper'
import { db } from '../../db/db'
import { formatLong, today } from '../../logic/dates'

/** Körperfettanteil eintragen (Schätzung, mit Verlauf). */
export function BodyFatSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState(20)
  const date = today()
  useEffect(() => {
    if (!open) return
    db.body.where('kind').equals('bodyfat').sortBy('date').then((l) => setValue(l.at(-1)?.value ?? 20))
  }, [open])
  const save = async () => {
    const existing = await db.body.where('[kind+date]').equals(['bodyfat', date]).first()
    if (existing?.id) await db.body.update(existing.id, { value, source: 'app' })
    else await db.body.add({ date, kind: 'bodyfat', value, source: 'app' })
    onClose()
  }
  return (
    <BottomSheet open={open} onClose={onClose} label="Körperfett" footer={<Button onClick={save}>Speichern</Button>}>
      <SheetTitle sub={`Für ${formatLong(date)} – Deine Schätzung oder ein Messwert.`}>Körperfettanteil</SheetTitle>
      <div className="mx-4 mb-4 rounded-xl border border-elevated bg-surface">
        <StepperField value={value} onChange={setValue} step={0.5} min={3} max={60} suffix="%" digits={1} circled />
      </div>
    </BottomSheet>
  )
}
