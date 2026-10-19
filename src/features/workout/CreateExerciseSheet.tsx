import { useEffect, useState } from 'react'
import type { EquipmentId, Exercise, MovementPattern, MuscleId } from '../../db/types'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { MUSCLES, muscleLabel } from '../../data/muskeln'
import { EQUIPMENT } from '../../data/equipment'
import { db } from '../../db/db'
import { allExercises, setCustomExercises } from '../../data/exercises'

const PATTERN_FOR: Partial<Record<MuscleId, MovementPattern>> = {
  brust: 'horizontal_druecken',
  ruecken: 'horizontal_ziehen',
  nacken: 'shrug',
  vordere_schulter: 'vertikal_druecken',
  mittlere_schulter: 'seitheben',
  hintere_schulter: 'reverse_fly',
  bizeps: 'bizeps_curl',
  trizeps: 'trizeps_streckung',
  unterarme: 'unterarm',
  bauch: 'rumpfbeuge',
  quadrizeps: 'kniebeuge',
  beinbeuger: 'beinbeugen',
  gesaess: 'glute_bruecke',
  adduktoren: 'adduktion',
  abduktoren: 'abduktion',
  waden: 'wadenheben',
  unterer_ruecken: 'rueckenstreckung',
}

/** Eigene Übung anlegen („Erstellen“ in S28). */
export function CreateExerciseSheet({ open, onClose, defaults, onCreated }: { open: boolean; onClose: () => void; defaults: { art: 'kraft' | 'mobility'; primaer: MuscleId }; onCreated: (e: Exercise) => void }) {
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState<MuscleId>(defaults.primaer)
  const [equipment, setEquipment] = useState<EquipmentId>('maschine')
  useEffect(() => {
    if (open) {
      setName('')
      setMuscle(defaults.primaer)
      setEquipment(defaults.art === 'mobility' ? 'koerpergewicht' : 'maschine')
    }
  }, [open, defaults.primaer, defaults.art])
  const muscles = (Object.keys(MUSCLES) as MuscleId[]).filter((m) => (defaults.art === 'mobility') === (MUSCLES[m].main === 'Mobility'))
  const save = async () => {
    const bw = equipment === 'koerpergewicht' || equipment === 'widerstandsband'
    const e: Exercise = {
      id: `eigen-${Date.now()}`,
      name: name.trim(),
      art: defaults.art,
      primaer: muscle,
      sekundaer: [],
      muster: defaults.art === 'mobility' ? 'mobilisation' : (PATTERN_FOR[muscle] ?? 'brust_isolation'),
      equipment: [equipment],
      schwierigkeit: 1,
      gewichtsschritt: bw ? 0 : 2.5,
      gewichtsart: bw ? 'koerpergewicht' : equipment === 'kurzhantel' ? 'pro_hand' : 'gesamt',
      gelenke: [],
      einheit: defaults.art === 'mobility' ? 'wdh' : undefined,
      hinweise: 'Eigene Übung.',
      eigene: true,
    }
    await db.customExercises.put(e)
    setCustomExercises(await db.customExercises.toArray())
    void allExercises()
    onCreated(e)
    onClose()
  }
  return (
    <BottomSheet open={open} onClose={onClose} label="Übung erstellen" footer={<Button disabled={name.trim().length < 3} onClick={save}>Erstellen</Button>}>
      <SheetTitle>Übung erstellen</SheetTitle>
      <div className="px-6 pb-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name der Übung" className="h-[54px] w-full rounded-lg border border-elevated bg-transparent px-4 text-[18px] outline-none" />
        <p className="mt-5 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Muskelgruppe</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {muscles.map((m) => (
            <button key={m} type="button" onClick={() => setMuscle(m)} className={`h-[38px] rounded-md px-3 text-[15px] ${muscle === m ? 'border-2 border-fg bg-surface' : 'bg-surface-3'}`}>
              {muscleLabel(m)}
            </button>
          ))}
        </div>
        <p className="mt-5 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Equipment</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EQUIPMENT.map((q) => (
            <button key={q.id} type="button" onClick={() => setEquipment(q.id)} className={`h-[38px] rounded-md px-3 text-[15px] ${equipment === q.id ? 'border-2 border-fg bg-surface' : 'bg-surface-3'}`}>
              {q.label}
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}
