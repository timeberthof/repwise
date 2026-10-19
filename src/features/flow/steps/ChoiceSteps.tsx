import type { ActivityLevel, EquipmentId, Experience, SplitId, TrainingLocation, WorkPosition } from '../../../db/types'
import { OptionCard } from '../../../components/ui/OptionCard'
import { Segmented } from '../../../components/ui/Segmented'
import { ACTIVITY_LEVELS } from '../../../logic/calories'
import { SPLITS, recommendedDays, recommendedSplits } from '../../../logic/planGenerator'
import { EQUIPMENT, defaultEquipmentFor } from '../../../data/equipment'
import { Icon } from '../../../components/icons/Icon'

export const EXPERIENCES: { id: Experience; label: string; text: string }[] = [
  { id: 'anfaenger', label: 'Anfänger', text: 'Weniger als ein Jahr regelmäßiges Krafttraining.' },
  { id: 'fortgeschritten', label: 'Fortgeschritten', text: 'Ein bis drei Jahre regelmäßiges Krafttraining, die Grundübungen sitzen.' },
  { id: 'profi', label: 'Profi', text: 'Mehr als drei Jahre strukturiertes Training mit hohem Volumen.' },
]

export function ExperienceOptions({ value, onChange }: { value: Experience; onChange: (v: Experience) => void }) {
  return (
    <div className="mt-[26px] flex flex-col gap-[10px]">
      {EXPERIENCES.map((e) => (
        <OptionCard key={e.id} title={e.label} description={e.text} selected={value === e.id} onClick={() => onChange(e.id)} />
      ))}
    </div>
  )
}

export function FrequencyOptions({ value, onChange, experience }: { value: number; onChange: (v: number) => void; experience: Experience }) {
  const rec = recommendedDays(experience)
  return (
    <div className="mt-[20px] flex flex-col gap-[10px]">
      {[2, 3, 4, 5, 6].map((n) => (
        <OptionCard key={n} compact title={`${n} Trainings pro Woche`} recommended={rec.includes(n)} selected={value === n} onClick={() => onChange(n)} />
      ))}
    </div>
  )
}

export function SplitOptions({ value, onChange, days }: { value: SplitId; onChange: (v: SplitId) => void; days: number }) {
  const rec = recommendedSplits(days)
  const list = SPLITS.filter((s) => !(s.id === 'ganzkoerper' && days >= 5))
  return (
    <div className="mt-[20px] flex flex-col gap-[10px]">
      {list.map((s) => (
        <OptionCard key={s.id} compact title={s.label} description={s.text} recommended={rec.includes(s.id)} selected={value === s.id} onClick={() => onChange(s.id)} />
      ))}
    </div>
  )
}

export function ActivityOptions({ value, onChange, work, onWork }: { value: ActivityLevel; onChange: (v: ActivityLevel) => void; work: WorkPosition; onWork: (w: WorkPosition) => void }) {
  return (
    <>
      <p className="mt-[24px] text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Arbeitsposition</p>
      <Segmented
        className="mt-3"
        value={work}
        onChange={onWork}
        options={[
          { id: 'sitzend', label: 'Sitzend' },
          { id: 'stehend', label: 'Stehend' },
          { id: 'koerperlich', label: 'Körperlich' },
        ]}
      />
      <p className="mt-[26px] text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Freizeit</p>
      <div className="mt-3 flex flex-col gap-[10px]">
        {ACTIVITY_LEVELS.map((a) => (
          <OptionCard key={a.id} compact title={a.label} description={a.text} selected={value === a.id} onClick={() => onChange(a.id)} />
        ))}
      </div>
    </>
  )
}

export const LOCATIONS: { id: TrainingLocation; label: string; text: string }[] = [
  { id: 'gym', label: 'Im Gym', text: 'Alle Geräte, Maschinen und Kabelzüge stehen zur Verfügung.' },
  { id: 'zuhause', label: 'Zuhause', text: 'Wähle unten aus, welches Equipment Du hast.' },
  { id: 'ohne_geraete', label: 'Ohne Geräte', text: 'Nur Körpergewicht – überall möglich.' },
]

export function LocationOptions({
  location,
  equipment,
  onChange,
}: {
  location: TrainingLocation
  equipment: EquipmentId[]
  onChange: (location: TrainingLocation, equipment: EquipmentId[]) => void
}) {
  const toggle = (id: EquipmentId) => {
    if (id === 'koerpergewicht') return
    onChange(location, equipment.includes(id) ? equipment.filter((e) => e !== id) : [...equipment, id])
  }
  return (
    <>
      <div className="mt-[20px] flex flex-col gap-[10px]">
        {LOCATIONS.map((l) => (
          <OptionCard key={l.id} compact title={l.label} description={l.text} selected={location === l.id} onClick={() => onChange(l.id, defaultEquipmentFor(l.id))} />
        ))}
      </div>
      <p className="mt-[28px] flex items-center justify-between text-section font-semibold uppercase tracking-[0.06em] text-fg-2">
        <span>Equipment</span>
        <span>
          {equipment.length} / {EQUIPMENT.length}
        </span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {EQUIPMENT.map((e) => {
          const on = equipment.includes(e.id) || e.id === 'koerpergewicht'
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => toggle(e.id)}
              className={`flex h-10 items-center gap-2 rounded-md border-2 px-3 text-body ${on ? 'border-fg bg-surface text-fg' : 'border-transparent bg-surface-3 text-fg-2'}`}
            >
              {on && <Icon name="check" size={18} />}
              {e.label}
            </button>
          )
        })}
      </div>
    </>
  )
}
