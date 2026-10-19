import type { ReactNode } from 'react'
import { Segmented } from '../../../components/ui/Segmented'
import { Stepper } from '../../../components/ui/Stepper'
import { Slider } from '../../../components/ui/Slider'
import { ageOn, formatDate } from '../../../logic/dates'
import { fmt } from '../../../logic/format'
import type { CalorieResult } from '../../../logic/calories'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[68px] items-center justify-between border-b border-elevated px-[18px] last:border-b-0">
      <span className="text-[17px] text-fg-2">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  )
}

export function BodyDataEditor({
  sex,
  birthDate,
  heightCm,
  weight,
  onChange,
  onWeightClick,
}: {
  sex: 'm' | 'w'
  birthDate: string
  heightCm: number
  weight: number
  onChange: (patch: Partial<{ sex: 'm' | 'w'; birthDate: string; heightCm: number; weight: number }>) => void
  /** Gewicht nicht direkt ändern, sondern über einen Eintrag mit Datum (Profil) */
  onWeightClick?: () => void
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
      <Row label="Gewicht">
        {onWeightClick ? (
          <button type="button" onClick={onWeightClick} className="flex items-center gap-2 text-[17px] font-semibold">
            {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(weight)} kg
            <span className="text-[13px] font-normal text-amber">eintragen</span>
          </button>
        ) : (
          <>
            <div className="w-[170px]">
              <Stepper value={weight} onChange={(v) => onChange({ weight: v })} step={0.1} min={30} max={250} digits={1} />
            </div>
            <span className="ml-1 text-fg-2">kg</span>
          </>
        )}
      </Row>
    </div>
  )
}

/** Körperfett-Schätzung nach Deurenberg (BMI, Alter, Geschlecht) – nur als Orientierung. */
export function estimateBodyFat(weight: number, heightCm: number, age: number, sex: 'm' | 'w'): number {
  const bmi = weight / (heightCm / 100) ** 2
  return Math.round(1.2 * bmi + 0.23 * age - 10.8 * (sex === 'm' ? 1 : 0) - 5.4)
}

export function bodyFatText(bf: number, sex: 'm' | 'w'): string {
  const x = sex === 'w' ? bf - 8 : bf
  if (x < 8) return 'Wettkampfform – Adern und Muskelstränge deutlich sichtbar.'
  if (x < 12) return 'Sehr definiert, das Sixpack ist klar zu sehen.'
  if (x < 16) return 'Sportlich, Bauchmuskeln sind leicht zu erkennen.'
  if (x < 20) return 'Leichte Muskeldefinition, die Bauchmuskeln sind kaum sichtbar.'
  if (x < 25) return 'Keine Muskeldefinition erkennbar, Du hast ein paar Pfunde zu viel.'
  if (x < 30) return 'Deutlich erhöhter Körperfettanteil.'
  return 'Stark erhöhter Körperfettanteil.'
}

/** Körperfett wie S20 – ohne 3D-Modell, mit geschätztem Bereich. */
export function BodyFatEditor({ value, onChange, estimate, sex }: { value: number; onChange: (v: number) => void; estimate: number; sex: 'm' | 'w' }) {
  return (
    <div className="-mb-3 mt-auto">
      <BodyFatGraphic value={value} sex={sex} />
      <p className="mt-6 text-[31px] font-black leading-none">{value}%</p>
      <p className="mt-[10px] min-h-[44px] text-body leading-snug">{bodyFatText(value, sex)}</p>
      <Slider className="mx-4 mt-[18px]" value={value} min={5} max={45} onChange={onChange} accent range={[Math.max(5, estimate - 3), Math.min(45, estimate + 3)]} ariaLabel="Körperfettanteil" />
      <div className="mt-[8px] flex items-center justify-center gap-2">
        <span className="h-[18px] w-[16px] border-x-2 border-dashed border-orange bg-[rgba(237,119,77,0.18)]" />
        <span className="text-[15px] font-medium uppercase tracking-[0.03em] text-orange underline underline-offset-4">Schätzung</span>
      </div>
    </div>
  )
}

/** Schlichte Silhouette statt 3D-Körpermodell: Taille wächst mit dem Körperfett. */
function BodyFatGraphic({ value, sex }: { value: number; sex: 'm' | 'w' }) {
  const t = (Math.min(45, Math.max(5, value)) - 5) / 40
  const waist = 30 + t * 26
  const hip = sex === 'w' ? 40 + t * 22 : 34 + t * 18
  return (
    <svg viewBox="0 0 200 260" className="mx-auto h-[300px]" aria-hidden>
      <defs>
        <linearGradient id="bodyg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a3a" />
          <stop offset="1" stopColor="#1b1b1b" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="28" r="20" fill="url(#bodyg)" />
      <path
        d={`M100 52 C 70 52, 52 58, 46 72 L 30 150 C 28 160, 40 162, 42 152 L 58 96 C 60 120, ${100 - waist} 130, ${100 - hip} 160 L ${100 - hip + 6} 250 L 92 250 L 100 176 L 108 250 L ${100 + hip - 6} 250 L ${100 + hip} 160 C ${100 + waist} 130, 140 120, 142 96 L 158 152 C 160 162, 172 160, 170 150 L 154 72 C 148 58, 130 52, 100 52 Z`}
        fill="url(#bodyg)"
      />
    </svg>
  )
}

export function CaloriesResult({ result }: { result: CalorieResult }) {
  return (
    <>
      <div className="mt-[30px] rounded-xl border border-elevated bg-surface px-5 py-6 text-center">
        <p className="text-[48px] font-black leading-none">{fmt(result.target)}</p>
        <p className="mt-2 text-body text-fg-2">kcal pro Tag</p>
      </div>
      <p className="mt-[26px] text-section font-semibold uppercase tracking-[0.06em] text-fg-2">So wird gerechnet</p>
      <div className="mt-3 overflow-hidden rounded-xl bg-surface">
        {result.steps.map((s, i) => (
          <div key={s.label} className={`px-[18px] py-[14px] ${i < result.steps.length - 1 ? 'border-b border-elevated' : ''}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body font-semibold">{s.label}</span>
              <span className="shrink-0 text-body font-bold">{s.value}</span>
            </div>
            <p className="mt-1 text-label text-fg-2">{s.formula}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-label leading-snug text-fg-2">
        Der Bedarf wird automatisch neu berechnet, wenn sich Dein Gewicht, Dein Ziel oder Deine Aktivität ändert. Alle Werte sind Schätzungen – beobachte Dein Gewicht und passe bei Bedarf an.
      </p>
    </>
  )
}
