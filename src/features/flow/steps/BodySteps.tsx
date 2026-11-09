import type { ReactNode } from 'react'
import { Segmented } from '../../../components/ui/Segmented'
import { Stepper } from '../../../components/ui/Stepper'
import { ageOn, formatDate } from '../../../logic/dates'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[68px] items-center justify-between border-b border-elevated px-[18px] last:border-b-0">
      <span className="text-[17px] text-fg-2">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  )
}

/** Körperdaten (Geschlecht, Geburtsdatum, Größe). Das Gewicht wird im wöchentlichen Check-in erfasst. */
export function BodyDataEditor({
  sex,
  birthDate,
  heightCm,
  onChange,
}: {
  sex: 'm' | 'w'
  birthDate: string
  heightCm: number
  onChange: (patch: Partial<{ sex: 'm' | 'w'; birthDate: string; heightCm: number }>) => void
}) {
  return (
    <div className="mt-[26px] overflow-hidden rounded-xl border border-elevated bg-surface">
      <Row label="Geschlecht">
        <Segmented
          small
          className="w-[196px]"
          value={sex}
          onChange={(v) => onChange({ sex: v })}
          options={[
            { id: 'm', label: 'Männlich' },
            { id: 'w', label: 'Weiblich' },
          ]}
        />
      </Row>
      <Row label="Geburtsdatum">
        <label className="relative flex flex-col items-end">
          <span className="text-[17px] font-semibold">{formatDate(birthDate)}</span>
          <span className="text-label text-fg-2">{ageOn(birthDate)} Jahre</span>
          <input type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => e.target.value && onChange({ birthDate: e.target.value })} className="absolute inset-0 opacity-0" aria-label="Geburtsdatum" />
        </label>
      </Row>
      <Row label="Größe">
        <div className="w-[170px]">
          <Stepper value={heightCm} onChange={(v) => onChange({ heightCm: v })} min={120} max={230} digits={0} />
        </div>
        <span className="ml-1 text-fg-2">cm</span>
      </Row>
    </div>
  )
}
