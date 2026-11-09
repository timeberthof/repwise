import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { SubHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Segmented } from '../../components/ui/Segmented'
import { StepperField } from '../../components/ui/Stepper'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { Icon } from '../../components/icons/Icon'
import { useToast } from '../../components/ui/Toast'
import { db } from '../../db/db'
import { useProfile } from '../../db/hooks'
import type { CardioActivity, CardioEntry } from '../../db/types'
import { ageOn, formatLong, today } from '../../logic/dates'
import { hrMax, zoneOf, zoneRange, ZONES, type ZoneNumber } from '../../logic/heartRate'
import { fmt } from '../../logic/format'
import { CARDIO_ACTIVITIES } from './activities'

type Form = Omit<CardioEntry, 'id'>

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex min-h-[58px] items-center justify-between gap-3 border-b border-elevated px-4 py-2 last:border-b-0">
      <span>
        <span className="block text-[16px]">{label}</span>
        {hint && <span className="block text-[12.5px] text-fg-2">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function NumInput({ value, onChange, unit, decimals = false }: { value: number | undefined; onChange: (v: number | undefined) => void; unit: string; decimals?: boolean }) {
  const [text, setText] = useState(value !== undefined ? fmt(value, 2) : '')
  useEffect(() => setText(value !== undefined ? fmt(value, 2) : ''), [value])
  return (
    <span className="flex items-center gap-2">
      <input
        inputMode={decimals ? 'decimal' : 'numeric'}
        value={text}
        placeholder="–"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const n = Number(text.replace(/\./g, '').replace(',', '.'))
          onChange(text.trim() && Number.isFinite(n) && n > 0 ? n : undefined)
        }}
        className="w-[78px] rounded-md bg-elevated px-2 py-[7px] text-right text-[17px] outline-none"
      />
      <span className="w-[34px] text-[14px] text-fg-2">{unit}</span>
    </span>
  )
}

/** Cardio eintragen/bearbeiten (Werte von der Garmin). Keine Vorgaben – die Pulszone ergibt sich aus dem Ø-Puls. */
export default function CardioForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const profile = useProfile()
  const [form, setForm] = useState<Form | null>(null)
  const [confirm, setConfirm] = useState(false)
  const isNew = !id

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      if (id) {
        const e = await db.cardio.get(Number(id))
        if (e) return setForm(e)
      }
      const last = (await db.cardio.orderBy('date').reverse().first()) ?? null
      setForm({
        date: params.get('datum') ?? today(),
        activity: last?.activity ?? 'laufen',
        activityText: '',
        durationMin: 30,
        // Pflichtfelder des Datenmodells; werden beim Speichern aus dem Ø-Puls bestimmt
        zone: 2,
        targetHrMin: 0,
        targetHrMax: 0,
        intensity: 'moderat',
      })
    })()
  }, [id, profile, params])

  if (!form || !profile) return <div className="h-dvh bg-bg" />
  const max = hrMax(ageOn(profile.birthDate), profile.hrMaxOverride)
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch })
  const actualZone = form.avgHr ? zoneOf(form.avgHr, max, profile.hrZones) : null

  const save = async () => {
    const zone = (actualZone ?? form.zone) as ZoneNumber
    const r = zoneRange(zone, max, profile.hrZones)
    const clean: Form = { ...form, zone, targetHrMin: r.min, targetHrMax: r.max, activityText: form.activityText?.trim() || undefined, createdAt: form.createdAt ?? Date.now() }
    if (id) await db.cardio.update(Number(id), clean)
    else await db.cardio.add(clean)
    toast('Cardio gespeichert', `${clean.activityText || CARDIO_ACTIVITIES.find((a) => a.id === clean.activity)?.label} · ${clean.durationMin} Min`)
    navigate(-1)
  }

  return (
    <div className="min-h-dvh bg-bg pb-36">
      <SubHeader title={isNew ? 'Cardio eintragen' : 'Cardio'} onBack={() => navigate(-1)} />

      <p className="mx-5 mt-6 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Aktivität</p>
      <div className="mx-4 mt-2 grid grid-cols-4 gap-2">
        {CARDIO_ACTIVITIES.map((a) => (
          <button key={a.id} type="button" onClick={() => set({ activity: a.id as CardioActivity })} className={`flex h-[64px] flex-col items-center justify-center gap-1 rounded-lg text-[12.5px] ${form.activity === a.id ? 'border-2 border-fg bg-surface' : 'border-2 border-transparent bg-surface-3 text-fg-2'}`}>
            <Icon name={a.icon} size={24} />
            {a.label}
          </button>
        ))}
      </div>
      <input
        value={form.activityText ?? ''}
        onChange={(e) => set({ activityText: e.target.value })}
        placeholder={form.activity === 'sonstiges' ? 'Welche Aktivität? (z. B. Fußball)' : 'Bezeichnung (optional, z. B. Intervall-Lauf)'}
        className="mx-4 mt-2 h-[48px] w-[calc(100%-32px)] rounded-lg border border-elevated bg-transparent px-4 text-[16px] outline-none"
      />

      <p className="mx-5 mt-6 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Einheit</p>
      <div className="mx-4 mt-2 overflow-hidden rounded-xl bg-surface">
        <Field label="Datum">
          <span className="relative">
            <span className="text-[16px] font-semibold">{formatLong(form.date)}</span>
            <input type="date" value={form.date} max={today()} onChange={(e) => e.target.value && set({ date: e.target.value })} className="absolute inset-0 opacity-0" aria-label="Datum" />
          </span>
        </Field>
      </div>
      <div className="mx-4 mt-2 rounded-xl bg-surface">
        <p className="px-4 pt-3 text-[16px]">Dauer</p>
        <StepperField value={form.durationMin} onChange={(v) => set({ durationMin: v })} step={5} min={1} max={600} suffix="Min" digits={0} />
      </div>
      <div className="mx-4 mt-2 rounded-xl bg-surface px-4 py-3">
        <p className="mb-2 text-[16px]">Intensität</p>
        <Segmented
          small
          value={form.intensity}
          onChange={(intensity) => set({ intensity })}
          options={[
            { id: 'leicht', label: 'Leicht' },
            { id: 'moderat', label: 'Moderat' },
            { id: 'intensiv', label: 'Intensiv' },
          ]}
        />
      </div>

      <p className="mx-5 mt-6 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Werte von der Garmin (optional)</p>
      <div className="mx-4 mt-2 overflow-hidden rounded-xl bg-surface">
        <Field label="Ø-Puls" hint={actualZone ? `${ZONES[actualZone - 1].label} (HFmax ${max} bpm)` : undefined}>
          <NumInput value={form.avgHr} onChange={(v) => set({ avgHr: v ? Math.round(v) : undefined })} unit="bpm" />
        </Field>
        <Field label="Max. Puls">
          <NumInput value={form.maxHr} onChange={(v) => set({ maxHr: v ? Math.round(v) : undefined })} unit="bpm" />
        </Field>
        <Field label="Zeit in Zone" hint="laut Garmin">
          <NumInput value={form.timeInZoneMin} onChange={(v) => set({ timeInZoneMin: v ? Math.round(v) : undefined })} unit="Min" />
        </Field>
        <Field label="Distanz">
          <NumInput value={form.distanceKm} onChange={(v) => set({ distanceKm: v })} unit="km" decimals />
        </Field>
        <Field label="Kalorien" hint="laut Garmin">
          <NumInput value={form.calories} onChange={(v) => set({ calories: v ? Math.round(v) : undefined })} unit="kcal" />
        </Field>
      </div>
      <textarea
        value={form.note ?? ''}
        onChange={(e) => set({ note: e.target.value })}
        rows={3}
        placeholder="Notiz"
        className="mx-4 mt-3 w-[calc(100%-32px)] rounded-xl border border-elevated bg-transparent p-4 text-[16px] outline-none"
      />

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 px-5 pt-6" style={{ paddingBottom: 'max(var(--safe-bottom), 16px)', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.95) 35%)' }}>
        {!isNew && (
          <Button variant="secondary" icon="delete" className="!w-[150px] shrink-0" onClick={() => setConfirm(true)}>
            Löschen
          </Button>
        )}
        <Button icon="check" onClick={save}>
          Speichern
        </Button>
      </div>
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Cardio löschen?"
        text="Der Eintrag wird endgültig gelöscht."
        confirmLabel="Löschen"
        onConfirm={async () => {
          await db.cardio.delete(Number(id))
          navigate(-1)
        }}
      />
    </div>
  )
}
