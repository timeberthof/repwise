import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { ProgressPhoto } from '../../db/types'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/icons/Icon'
import { useToast } from '../../components/ui/Toast'
import { formatDate, monthLabel } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { takePickedFile } from '../../lib/pickedFile'
import { AddPhotoSheet, CompareView, PhotoViewer, Thumb, poseLabel } from '../photos/PhotoParts'

const photoLabel = (p: ProgressPhoto) => `${formatDate(p.date)} · ${poseLabel(p.pose)}${p.weight ? ` · ${fmt(p.weight, 1)} kg` : ''}`

/** Fotos chronologisch (neueste zuerst, nach Monat), hinzufügen, Vollbild, Vorher/Nachher-Vergleich. */
export function PhotoGallery() {
  const toast = useToast()
  const photos = useLiveQuery(() => db.photos.orderBy('date').reverse().toArray(), [])
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<File | null>(null)
  const [view, setView] = useState<ProgressPhoto | null>(null)
  const [picking, setPicking] = useState(false)
  const [pair, setPair] = useState<[ProgressPhoto, ProgressPhoto] | null>(null)

  const groups = useMemo(() => {
    const m = new Map<string, ProgressPhoto[]>()
    for (const p of photos ?? []) m.set(monthLabel(p.date), [...(m.get(monthLabel(p.date)) ?? []), p])
    return [...m.entries()]
  }, [photos])

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = await takePickedFile(e.target)
    if (f) setPending(f)
  }

  return (
    <section aria-label="Fortschrittsfotos">
      <div className="flex gap-3">
        <Button icon="camera" className="flex-1" onClick={() => camera.current?.click()}>
          Foto
        </Button>
        <Button variant="secondary" icon="photoLibrary" className="flex-1" onClick={() => gallery.current?.click()}>
          Galerie
        </Button>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {(photos?.length ?? 0) >= 2 && (
        <Button variant="secondary" icon="compare" className="mt-3" onClick={() => setPicking(true)}>
          Vorher / Nachher vergleichen
        </Button>
      )}

      {groups.map(([month, ps]) => (
        <div key={month} className="mt-4">
          <p className="mb-2 px-1 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">{month}</p>
          <div className="grid grid-cols-3 gap-2">
            {ps.map((p) => (
              <Thumb key={p.id} photo={p} onClick={() => setView(p)} />
            ))}
          </div>
        </div>
      ))}
      {photos && !photos.length && <p className="py-8 text-center text-body text-fg-2">Noch keine Fotos. Am besten immer bei gleichem Licht und in derselben Pose.</p>}

      <AddPhotoSheet file={pending} onClose={() => setPending(null)} onSaved={() => toast('Foto gespeichert')} onError={(m) => toast(m)} />
      {view && <PhotoViewer photo={view} onClose={() => setView(null)} />}
      {photos && photos.length >= 2 && <ComparePicker open={picking} photos={photos} onClose={() => setPicking(false)} onCompare={(a, b) => (setPicking(false), setPair([a, b]))} />}
      {pair && <CompareView a={pair[0]} b={pair[1]} onClose={() => setPair(null)} />}
    </section>
  )
}

/** Zwei Fotos über ihr Datum wählen (Standard: ältestes und neuestes). */
function ComparePicker({ open, photos, onClose, onCompare }: { open: boolean; photos: ProgressPhoto[]; onClose: () => void; onCompare: (a: ProgressPhoto, b: ProgressPhoto) => void }) {
  const sorted = useMemo(() => [...photos].sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0)), [photos])
  const [a, setA] = useState<number | undefined>()
  const [b, setB] = useState<number | undefined>()
  const before = sorted.find((p) => p.id === a) ?? sorted[0]
  const after = sorted.find((p) => p.id === b) ?? sorted.at(-1)!
  const select = (label: string, value: ProgressPhoto, set: (id: number) => void) => (
    <label className="mt-4 block">
      <span className="text-section font-semibold uppercase tracking-[0.06em] text-fg-2">{label}</span>
      <span className="relative mt-2 flex h-[52px] items-center justify-between rounded-xl bg-surface-2 px-4 text-[16px] font-semibold">
        {photoLabel(value)}
        <Icon name="arrowDown" size={20} />
        <select value={value.id} onChange={(e) => set(Number(e.target.value))} className="absolute inset-0 opacity-0" aria-label={label}>
          {sorted.map((p) => (
            <option key={p.id} value={p.id}>
              {photoLabel(p)}
            </option>
          ))}
        </select>
      </span>
    </label>
  )
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="Vorher / Nachher"
      footer={
        <Button disabled={before.id === after.id} onClick={() => onCompare(before, after)}>
          Vergleichen
        </Button>
      }
    >
      <SheetTitle>Vorher / Nachher</SheetTitle>
      <div className="px-6 pb-4">
        {select('Vorher', before, setA)}
        {select('Nachher', after, setB)}
      </div>
    </BottomSheet>
  )
}
