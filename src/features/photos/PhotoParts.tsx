import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../../db/db'
import type { PhotoPose, ProgressPhoto } from '../../db/types'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/icons/Icon'
import { Segmented } from '../../components/ui/Segmented'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { preparePhoto } from '../../lib/image'
import { formatDate, formatDayMonth, formatLong, today } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { useObjectUrl } from './useObjectUrl'

/** Bausteine für Fortschrittsfotos (nur lokal gespeichert): Vorschaubild, Speichern, Vollbild, Vergleich. */
export const POSES: { id: PhotoPose; label: string }[] = [
  { id: 'vorne', label: 'Vorne' },
  { id: 'seitlich', label: 'Seitlich' },
  { id: 'hinten', label: 'Hinten' },
]
export const poseLabel = (p: PhotoPose) => POSES.find((x) => x.id === p)?.label ?? p

export function Thumb({ photo, selected, onClick }: { photo: ProgressPhoto; selected?: number; onClick: () => void }) {
  const url = useObjectUrl(photo.thumbData ?? photo.data, photo.mime)
  return (
    <button type="button" onClick={onClick} className={`relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-2 ${selected ? 'outline outline-[3px] outline-orange' : ''}`}>
      {url && <img src={url} alt={`${poseLabel(photo.pose)} ${formatDate(photo.date)}`} className="h-full w-full object-cover" />}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-4 text-left text-[11.5px] font-semibold">{formatDayMonth(photo.date)} · {poseLabel(photo.pose)}</span>
      {selected && <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange text-[13px] font-bold text-fg-inverse">{selected}</span>}
    </button>
  )
}

export function AddPhotoSheet({ file, onClose, onSaved, onError }: { file: File | null; onClose: () => void; onSaved: () => void; onError: (msg: string) => void }) {
  const url = useObjectUrl(file)
  const [pose, setPose] = useState<PhotoPose>('vorne')
  const [date, setDate] = useState(today())
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  // Gewicht des Tages (sonst das letzte bekannte) vorschlagen
  useEffect(() => {
    if (!file) return
    db.body
      .where('kind')
      .equals('weight')
      .sortBy('date')
      .then((w) => {
        const same = w.find((x) => x.date === date) ?? w.filter((x) => x.date <= date).at(-1)
        setWeight(same ? fmt(same.value, 1) : '')
      })
  }, [file, date])

  const save = async () => {
    if (!file) return
    setBusy(true)
    try {
      const p = await preparePhoto(file)
      const wv = Number(weight.replace(',', '.'))
      await db.photos.add({ date, pose, ...p, weight: wv > 0 ? wv : undefined, note: note.trim() || undefined, createdAt: Date.now() })
      onSaved()
      setNote('')
      onClose()
    } catch (e) {
      console.error('Foto speichern', e)
      onError('Foto konnte nicht gespeichert werden')
    } finally {
      setBusy(false)
    }
  }
  return (
    <BottomSheet open={!!file} onClose={onClose} full label="Foto speichern" footer={<Button onClick={save} disabled={busy}>{busy ? 'Wird gespeichert…' : 'Speichern'}</Button>}>
      <SheetTitle>Foto speichern</SheetTitle>
      <div className="px-6 pb-6">
        {url && <img src={url} alt="Vorschau" className="mx-auto max-h-[280px] rounded-lg object-contain" />}
        <p className="mt-4 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Ansicht</p>
        <Segmented small className="mt-2" value={pose} onChange={setPose} options={POSES} />
        <div className="mt-4 overflow-hidden rounded-xl bg-surface-2">
          <label className="flex min-h-[54px] items-center justify-between border-b border-elevated px-4">
            <span className="text-[16px]">Datum</span>
            <span className="relative text-[16px] font-semibold">
              {formatLong(date)}
              <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0" aria-label="Datum" />
            </span>
          </label>
          <label className="flex min-h-[54px] items-center justify-between px-4">
            <span className="text-[16px]">Gewicht (optional)</span>
            <span className="flex items-center gap-2">
              <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="–" className="w-[70px] rounded-md bg-elevated px-2 py-[6px] text-right text-[16px] outline-none" />
              <span className="text-fg-2">kg</span>
            </span>
          </label>
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Notiz (optional)" className="mt-3 w-full rounded-xl border border-elevated bg-transparent p-3 text-[16px] outline-none" />
      </div>
    </BottomSheet>
  )
}

export function PhotoViewer({ photo, onClose }: { photo: ProgressPhoto; onClose: () => void }) {
  const url = useObjectUrl(photo.data, photo.mime)
  const [confirm, setConfirm] = useState(false)
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-black" role="dialog" aria-label="Foto">
      <div className="flex items-center justify-between px-3" style={{ paddingTop: 'calc(var(--safe-top) + 6px)' }}>
        <button type="button" aria-label="Schließen" onClick={onClose} className="flex h-11 w-11 items-center justify-center">
          <Icon name="close" size={28} />
        </button>
        <div className="text-center">
          <p className="text-[16px] font-semibold">{formatLong(photo.date)}</p>
          <p className="text-[13px] text-fg-2">
            {poseLabel(photo.pose)}
            {photo.weight ? ` · ${fmt(photo.weight, 1)} kg` : ''}
          </p>
        </div>
        <button type="button" aria-label="Foto löschen" onClick={() => setConfirm(true)} className="flex h-11 w-11 items-center justify-center text-[#ff6b5f]">
          <Icon name="delete" size={26} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-2">{url && <img src={url} alt="" className="max-h-full max-w-full object-contain" />}</div>
      {photo.note && <p className="px-5 text-center text-[15px] text-fg-2" style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}>{photo.note}</p>}
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Foto löschen?"
        text="Das Foto wird von diesem Gerät gelöscht."
        confirmLabel="Löschen"
        onConfirm={async () => {
          await db.photos.delete(photo.id!)
          onClose()
        }}
      />
    </div>,
    document.body,
  )
}

export function CompareView({ a, b, onClose }: { a: ProgressPhoto; b: ProgressPhoto; onClose: () => void }) {
  const [first, second] = a.date <= b.date ? [a, b] : [b, a]
  const ua = useObjectUrl(first.data, first.mime)
  const ub = useObjectUrl(second.data, second.mime)
  const days = Math.round((new Date(second.date).getTime() - new Date(first.date).getTime()) / 86_400_000)
  const dw = first.weight && second.weight ? second.weight - first.weight : null
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-black" role="dialog" aria-label="Vergleich">
      <div className="flex items-center justify-between px-3" style={{ paddingTop: 'calc(var(--safe-top) + 6px)' }}>
        <button type="button" aria-label="Schließen" onClick={onClose} className="flex h-11 w-11 items-center justify-center">
          <Icon name="close" size={28} />
        </button>
        <p className="text-[16px] font-semibold">
          Vergleich · {days} {days === 1 ? 'Tag' : 'Tage'}
          {dw !== null ? ` · ${dw > 0 ? '+' : dw < 0 ? '−' : '±'}${fmt(Math.abs(dw), 1)} kg` : ''}
        </p>
        <span className="w-11" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-1 p-1">
        {[
          [first, ua],
          [second, ub],
        ].map(([p, u]) => {
          const ph = p as ProgressPhoto
          return (
            <div key={ph.id} className="flex min-h-0 flex-col">
              <div className="flex min-h-0 flex-1 items-center justify-center">{u && <img src={u as string} alt="" className="max-h-full max-w-full object-contain" />}</div>
              <p className="py-2 text-center text-[13.5px]">
                {formatDate(ph.date)} · {poseLabel(ph.pose)}
                {ph.weight ? ` · ${fmt(ph.weight, 1)} kg` : ''}
              </p>
            </div>
          )
        })}
      </div>
      <div style={{ height: 'var(--safe-bottom)' }} />
    </div>,
    document.body,
  )
}
