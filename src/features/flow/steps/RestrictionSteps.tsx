import { useMemo, useState } from 'react'
import type { Pain, PainRegion } from '../../../db/types'
import { PAIN_REGIONS } from '../../../data/muskeln'
import { allExercises } from '../../../data/exercises'
import { muscleLabel } from '../../../data/muskeln'
import { Icon } from '../../../components/icons/Icon'
import { Slider } from '../../../components/ui/Slider'

/** Schmerzen je Region mit Stärke 0–10 (wie „Linkes Knie: 6“). Ab 5 werden belastende Übungen gemieden. */
export function PainEditor({ value, onChange }: { value: Pain[]; onChange: (v: Pain[]) => void }) {
  const level = (r: PainRegion) => value.find((p) => p.region === r)?.level
  const set = (r: PainRegion, l: number | null) => {
    const rest = value.filter((p) => p.region !== r)
    onChange(l === null ? rest : [...rest, { region: r, level: l }])
  }
  return (
    <div className="mt-[22px] overflow-hidden rounded-xl bg-surface">
      {PAIN_REGIONS.map((r, i) => {
        const l = level(r.id)
        const on = l !== undefined
        return (
          <div key={r.id} className={`px-[18px] py-[12px] ${i < PAIN_REGIONS.length - 1 ? 'border-b border-elevated' : ''}`}>
            <button type="button" onClick={() => set(r.id, on ? null : 5)} className="flex w-full items-center justify-between text-left">
              <span className="text-[17px] font-semibold">{r.label}</span>
              <span className="flex items-center gap-3">
                {on && <span className="text-[17px] font-bold text-action">{l}</span>}
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${on ? 'border-action bg-action text-fg-inverse' : 'border-fg-3'}`}>{on && <Icon name="check" size={16} />}</span>
              </span>
            </button>
            {on && (
              <div className="mt-2">
                <Slider value={l!} min={1} max={10} onChange={(v) => set(r.id, v)} ariaLabel={`Schmerzstärke ${r.label}`} />
                <div className="flex justify-between text-label text-fg-2">
                  <span>leicht</span>
                  <span>stark</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Übungen ausschließen, die man nicht machen will oder kann. */
export function ExcludeEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const all = allExercises().filter((e) => e.art === 'kraft')
    const filtered = s ? all.filter((e) => e.name.toLowerCase().includes(s) || muscleLabel(e.primaer).toLowerCase().includes(s)) : all
    return [...filtered].sort((a, b) => Number(value.includes(b.id)) - Number(value.includes(a.id)) || a.name.localeCompare(b.name))
  }, [q, value])
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  return (
    <>
      <div className="mt-[20px] flex h-[50px] items-center gap-3 rounded-lg bg-elevated px-4">
        <Icon name="search" size={24} className="text-fg-2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Übung suchen" className="w-full bg-transparent text-[18px] text-fg outline-none placeholder:text-fg-2" />
      </div>
      <p className="mt-3 text-label text-fg-2">{value.length ? `${value.length} ausgeschlossen` : 'Keine Übung ausgeschlossen'}</p>
      <div className="mt-2 overflow-hidden rounded-xl bg-surface">
        {list.map((e) => {
          const on = value.includes(e.id)
          return (
            <button key={e.id} type="button" onClick={() => toggle(e.id)} className="flex w-full items-center justify-between border-b border-elevated px-[18px] py-[11px] text-left last:border-b-0">
              <span>
                <span className="block text-label text-fg-2">{muscleLabel(e.primaer)}</span>
                <span className={`block text-[16.5px] font-semibold ${on ? 'text-fg-3 line-through' : ''}`}>{e.name}</span>
              </span>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-danger bg-danger' : 'border-fg-3'}`}>{on && <Icon name="close" size={16} />}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
