import { useEffect, useRef, useState } from 'react'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/icons/Icon'
import { useToast } from '../../components/ui/Toast'
import { db } from '../../db/db'
import type { BodyEntry, WeeklyCheckin } from '../../db/types'
import { attachCheckinPhoto, checkinStatus, saveCheckin } from '../../db/repo/checkin'
import { preparePhoto } from '../../lib/image'
import { takePickedFile } from '../../lib/pickedFile'
import { formatDate, today } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { useObjectUrl } from '../photos/useObjectUrl'

export type CheckinStep = 'gewicht' | 'foto'

const parseWeight = (s: string) => {
  const n = Number(s.trim().replace(',', '.'))
  return Number.isFinite(n) && n >= 20 && n <= 400 ? n : null
}

/**
 * Wöchentlicher Check-in: 1. Körpergewicht (Pflicht, Sheet lässt sich nicht wegwischen),
 * 2. Fortschrittsfoto (Kamera/Galerie) oder „Später“.
 */
export function WeeklyCheckinSheet({ open, step: initialStep, checkin: initialCheckin, onClose, required = true }: { open: boolean; step: CheckinStep; checkin?: WeeklyCheckin | null; onClose: () => void; required?: boolean }) {
  const toast = useToast()
  const [step, setStep] = useState<CheckinStep>(initialStep)
  const [checkin, setCheckin] = useState<WeeklyCheckin | null>(initialCheckin ?? null)
  const [value, setValue] = useState('')
  const [last, setLast] = useState<BodyEntry | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const preview = useObjectUrl(file)

  useEffect(() => {
    if (!open) return
    setStep(initialStep)
    setCheckin(initialCheckin ?? null)
    setValue('')
    setFile(null)
    db.body
      .where('kind')
      .equals('weight')
      .sortBy('date')
      .then((w) => setLast(w.at(-1) ?? null))
  }, [open, initialStep, initialCheckin])

  const weight = parseWeight(value)
  const saveWeight = async () => {
    if (!weight) return
    setBusy(true)
    try {
      const id = await saveCheckin(weight, today())
      setCheckin((await db.checkins.get(id)) ?? null)
      setStep('foto')
    } finally {
      setBusy(false)
    }
  }
  const savePhoto = async () => {
    if (!file || !checkin?.id) return
    setBusy(true)
    try {
      await attachCheckinPhoto(checkin.id, await preparePhoto(file), today())
      toast('Check-in gespeichert', 'Gewicht und Foto sind abgelegt.')
      onClose()
    } catch (e) {
      console.error('Check-in-Foto', e)
      toast('Foto konnte nicht gespeichert werden')
    } finally {
      setBusy(false)
    }
  }
  const later = () => {
    toast('Gewicht gespeichert', 'Das Foto kannst Du beim nächsten Öffnen nachreichen.')
    onClose()
  }
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = await takePickedFile(e.target)
    if (f) setFile(f)
  }

  const weightFooter = (
    <Button icon="arrowForward" disabled={!weight || busy} onClick={saveWeight}>
      Weiter
    </Button>
  )
  const photoFooter = file ? (
    <div className="flex gap-3">
      <Button variant="secondary" className="flex-1" onClick={() => setFile(null)}>
        Anderes Foto
      </Button>
      <Button className="flex-1" disabled={busy} onClick={savePhoto}>
        {busy ? 'Speichert…' : 'Speichern'}
      </Button>
    </div>
  ) : (
    <Button variant="secondary" onClick={later}>
      Später
    </Button>
  )

  return (
    <BottomSheet open={open} onClose={step === 'foto' ? later : onClose} dismissible={step === 'foto' || !required} label="Wöchentlicher Check-in" footer={step === 'gewicht' ? weightFooter : photoFooter}>
      {step === 'gewicht' ? (
        <>
          <SheetTitle>Wöchentlicher Check-in</SheetTitle>
          <div className="px-6 pb-4">
            <p className="text-[15px] leading-snug text-fg-2">Trag Dein aktuelles Körpergewicht ein. Danach folgt ein Fortschrittsfoto.</p>
            <label className="mt-5 flex items-center gap-3 rounded-xl bg-surface-2 px-4">
              <Icon name="scale" size={24} className="text-fg-2" />
              <input
                autoFocus
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveWeight()}
                placeholder="Gewicht"
                aria-label="Körpergewicht in kg"
                className="h-[60px] min-w-0 flex-1 bg-transparent text-[26px] font-bold tabular-nums outline-none placeholder:font-normal placeholder:text-fg-3"
              />
              <span className="text-[18px] text-fg-2">kg</span>
            </label>
            {last && (
              <p className="mt-3 text-[13.5px] text-fg-2">
                Zuletzt: {fmt(last.value, 1)} kg am {formatDate(last.date)}
              </p>
            )}
            {value && !weight && <p className="mt-2 text-[13.5px] text-[#ff6b5f]">Bitte ein Gewicht zwischen 20 und 400 kg eingeben.</p>}
          </div>
        </>
      ) : (
        <>
          <SheetTitle>Fortschrittsfoto</SheetTitle>
          <div className="px-6 pb-4">
            <p className="text-[15px] leading-snug text-fg-2">
              {checkin ? `Gewicht ${fmt(checkin.weight, 1)} kg vom ${formatDate(checkin.date)} ist gespeichert. ` : ''}
              Das Foto bleibt nur auf diesem Gerät.
            </p>
            {preview ? (
              <img src={preview} alt="Vorschau" className="mx-auto mt-4 max-h-[300px] rounded-lg object-contain" />
            ) : (
              <div className="mt-5 flex flex-col gap-3">
                <Button icon="camera" onClick={() => camera.current?.click()}>
                  Foto aufnehmen
                </Button>
                <Button variant="secondary" icon="photoLibrary" onClick={() => gallery.current?.click()}>
                  Aus Galerie wählen
                </Button>
              </div>
            )}
            <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} aria-label="Kamera" />
            <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={onFile} aria-label="Galerie" />
          </div>
        </>
      )}
    </BottomSheet>
  )
}

let promptedThisStart = false

/**
 * Beim Öffnen der App: Check-in fällig → Gewicht (Pflicht) und Foto; Foto vom letzten Check-in noch offen →
 * nur die Foto-Abfrage (einmal pro App-Start, mit „Später“).
 */
export function CheckinPrompt() {
  const [state, setState] = useState<{ step: CheckinStep; checkin: WeeklyCheckin | null } | null>(null)
  useEffect(() => {
    let alive = true
    checkinStatus().then((st) => {
      if (!alive) return
      if (st.due) setState({ step: 'gewicht', checkin: null })
      else if (st.photoPending && !promptedThisStart) setState({ step: 'foto', checkin: st.photoPending })
      promptedThisStart = true
    })
    return () => {
      alive = false
    }
  }, [])
  return <WeeklyCheckinSheet open={!!state} step={state?.step ?? 'gewicht'} checkin={state?.checkin} onClose={() => setState(null)} />
}
