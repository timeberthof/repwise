import { useEffect, useState } from 'react'
import type { Checkin, MuscleId } from '../../db/types'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { ScaleSlider, Slider } from '../../components/ui/Slider'
import { Icon } from '../../components/icons/Icon'
import { BodyMap, viewFor } from '../../components/ui/BodyMap'
import { muscleLabel } from '../../data/muskeln'

const ENERGY = ['Total K.O.', 'Total K.O.', 'Erschöpft', 'Erschöpft', 'Müde', 'Geht so', 'Okay', 'Fit', 'Fit', 'Sehr fit', 'Sehr fit']
const SLEEP = ['Schlaflosigkeit', 'Sehr schlecht', 'Schlecht', 'Schlecht', 'Unruhig', 'Mittelmäßig', 'Okay', 'Gut', 'Gut', 'Sehr gut', 'Sehr gut ausgeschlafen']

/**
 * Check-in vor dem Training (S31/S32, max. 3 Fragen, überspringbar):
 * Wellness (Energie), Schlaf, Muskelkater je Zielmuskel.
 */
export function CheckinSheet({ open, onClose, muscles, onDone, initial }: { open: boolean; onClose: () => void; muscles: MuscleId[]; onDone: (c: Checkin) => void; initial?: Checkin }) {
  const [page, setPage] = useState(0)
  const [energy, setEnergy] = useState(10)
  const [sleep, setSleep] = useState(10)
  const [sore, setSore] = useState<Partial<Record<MuscleId, number>>>({})
  const [muscle, setMuscle] = useState<MuscleId | null>(muscles[0] ?? null)

  useEffect(() => {
    if (!open) return
    setPage(0)
    setEnergy(initial?.energy ?? 10)
    setSleep(initial?.sleep ?? 10)
    setSore(initial?.soreness ?? {})
    setMuscle(muscles[0] ?? null)
  }, [open, initial, muscles])

  const finish = () => onDone({ energy, sleep, soreness: sore })
  const skip = () => onDone({ skipped: true })
  const last = muscles.length ? 2 : 1

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="Check-in"
      action={{ label: 'Überspringen', onClick: skip }}
      footer={
        <div className="flex gap-3">
          {page > 0 && (
            <button type="button" aria-label="Zurück" onClick={() => setPage(page - 1)} className="flex h-14 w-[66px] shrink-0 items-center justify-center rounded-xl bg-elevated">
              <Icon name="chevronLeft" size={24} />
            </button>
          )}
          <Button onClick={() => (page < last ? setPage(page + 1) : finish())}>{page < last ? 'Weiter' : 'Training starten'}</Button>
        </div>
      }
    >
      {page === 0 && (
        <div className="px-6 pb-6">
          <h2 className="text-screen font-black uppercase">Wellness-Abfrage</h2>
          <p className="mt-[22px] text-[18px] leading-snug">Um Dein heutiges Training genauer zu planen, würden wir gerne Folgendes von Dir wissen.</p>
          <p className="mt-[50px] text-[22px] font-bold">{ENERGY[energy]}</p>
          <Slider className="mx-2 mt-5" value={energy} min={0} max={10} onChange={setEnergy} ariaLabel="Energie" />
          <div className="mt-4 flex justify-between text-[17px]">
            <span>Total K.O.</span>
            <span>Sehr fit</span>
          </div>
        </div>
      )}
      {page === 1 && (
        <div className="px-6 pb-6">
          <h2 className="text-screen font-black uppercase">Schlaf</h2>
          <p className="mt-[22px] text-[18px] leading-snug">Wie hast Du letzte Nacht geschlafen?</p>
          <p className="mt-[50px] text-[22px] font-bold">{SLEEP[sleep]}</p>
          <Slider className="mx-2 mt-5" value={sleep} min={0} max={10} onChange={setSleep} ariaLabel="Schlaf" />
          <div className="mt-4 flex justify-between text-[17px]">
            <span>Schlaflosigkeit</span>
            <span>Sehr gut</span>
          </div>
        </div>
      )}
      {page === 2 && muscle && (
        <div className="pb-6">
          <h2 className="px-6 text-screen font-black uppercase">Muskelkater</h2>
          <div className="no-scrollbar mt-[24px] flex gap-3 overflow-x-auto px-6">
            {muscles.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMuscle(m)}
                className={`flex h-[128px] w-[116px] shrink-0 flex-col items-center justify-between rounded-lg pb-[12px] pt-[10px] ${muscle === m ? 'border-2 border-fg bg-surface' : 'border-2 border-transparent bg-elevated'}`}
              >
                <BodyMap highlight={[m]} view={viewFor(m)} size={88} dim="#3a3a3a" on="#e0e0e0" />
                <span className="max-w-full truncate px-2 text-[16px]">
                  {muscleLabel(m)}
                  {sore[m] ? ` · ${sore[m]}` : ''}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-[28px] px-6">
            <ScaleSlider value={sore[muscle] ?? 0} onChange={(v) => setSore({ ...sore, [muscle]: v })} left="Gar nicht" right="Sehr stark" />
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
