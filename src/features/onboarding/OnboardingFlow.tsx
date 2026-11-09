import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { FlowLayout, InfoCard } from '../flow/FlowLayout'
import { BodyDataEditor } from '../flow/steps/BodySteps'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { loadBundledStartwerte, profileDefaults, type Startwerte } from '../../db/repo/startwerte'
import { db } from '../../db/db'
import { formatDate } from '../../logic/dates'
import { useToast } from '../../components/ui/Toast'
import { useImportFile } from '../settings/BackupImport'
import { emptyDraft, finishOnboarding, type Draft } from './draft'

const STEPS = ['willkommen', 'koerper', 'fertig'] as const

/** Kurzes Onboarding: Begrüßung (mit Datenimport), Körperdaten, so funktioniert Repwise. Es wird kein Plan erstellt. */
export default function OnboardingFlow() {
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [startwerte, setStartwerte] = useState<Startwerte | null>(null)
  const [useStartwerte, setUseStartwerte] = useState(false)
  const [busy, setBusy] = useState(false)

  // Vorbelegung: bestehendes Profil oder Startwerte
  useEffect(() => {
    ;(async () => {
      const s = await loadBundledStartwerte()
      setStartwerte(s)
      setUseStartwerte(!!s)
      const existing = await db.profile.get('me')
      setDraft(emptyDraft(existing ?? (s ? profileDefaults(s) : null)))
    })()
  }, [])

  // Startwerte als Datei laden (veröffentlichte App ohne eingebaute Startwerte); ein Backup wird wiederhergestellt.
  const importFile = useImportFile({
    onStartwerte: (s) => {
      setStartwerte(s)
      setUseStartwerte(true)
      setDraft(emptyDraft(profileDefaults(s)))
      toast('Startwerte geladen', `Stand ${formatDate(s.stand)} · Angaben vorausgefüllt`)
    },
  })

  if (!draft) return <div className="h-dvh bg-bg" />

  const id = STEPS[step]
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))
  const common = { step, total: STEPS.length, onBack: step > 0 ? back : undefined, onNext: next }

  const finish = async () => {
    setBusy(true)
    try {
      await finishOnboarding(draft, useStartwerte ? startwerte : null)
      navigate('/training', { replace: true })
    } catch (e) {
      toast('Speichern fehlgeschlagen', e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  switch (id) {
    case 'willkommen':
      return (
        <FlowLayout {...common} title="Willkommen bei Repwise!" subtitle="Dein Trainingstagebuch: Du trägst ein, was Du trainierst – Repwise zeigt Dir Verlauf und Fortschritt.">
          <div className="mt-5">
            <Button variant="secondary" icon="upload" onClick={importFile.open}>
              {startwerte ? 'Backup wiederherstellen' : 'Daten importieren'}
            </Button>
            <p className="mt-2 px-1 text-[13.5px] leading-snug text-fg-2">
              {startwerte ? `✓ Startwerte geladen (Stand ${formatDate(startwerte.stand)}). Neu installiert? Dann Dein Backup laden.` : 'Optional: Repwise-Backup oder Startwerte-Datei aus der Dateien-App laden – sonst einfach weiter.'}
            </p>
          </div>
          <div className="mt-auto flex flex-col gap-[14px] pb-4 pt-5">
            <InfoCard icon="edit" title="Du bestimmst." text="Übungen, Gewichte und Wiederholungen trägst Du selbst ein. Repwise gibt nichts vor." />
            <InfoCard icon="trendingUp" title="Verlauf und Fortschritt" text="Diagramme pro Übung, Körpergewicht und Fortschrittsfotos." />
            <InfoCard icon="lock" title="Alles bleibt auf Deinem iPhone." text="Repwise speichert alle Daten nur lokal und funktioniert komplett offline." />
          </div>
          {importFile.element}
        </FlowLayout>
      )
    case 'koerper':
      return (
        <FlowLayout {...common} title="Deine Körperdaten" subtitle="Das Alter wird aus dem Geburtsdatum berechnet. Das Gewicht fragt der wöchentliche Check-in ab.">
          <BodyDataEditor sex={draft.sex} birthDate={draft.birthDate} heightCm={draft.heightCm} onChange={(p) => setDraft({ ...draft, ...p })} />
        </FlowLayout>
      )
    case 'fertig':
      return (
        <FlowLayout {...common} title="So funktioniert Repwise" nextLabel={busy ? 'Speichert…' : "Los geht's"} nextDisabled={busy} onNext={finish}>
          <div className="mt-2 flex flex-col gap-[14px]">
            <InfoCard icon="bookmark" title="1. Vorlagen anlegen" text="Unter Training → Bearbeiten legst Du Vorlagen an, z. B. Push und Pull – oder Du startest ein leeres Training." />
            <InfoCard icon="dumbbell" title="2. Sätze eintragen" text="Pro Satz Gewicht und Wiederholungen, RIR optional. Zur Orientierung siehst Du, was Du beim letzten Mal gemacht hast." />
            <InfoCard icon="scale" title="3. Wöchentlicher Check-in" text="Einmal pro Woche Körpergewicht und Fortschrittsfoto – im Tab „Körper“ siehst Du den Verlauf." />
          </div>
          {startwerte && (
            <label className="mt-6 flex items-center gap-3 rounded-xl bg-surface px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">Startwerte übernehmen</span>
                <span className="block text-[13px] text-fg-2">Werte aus Deiner bisherigen App (Stand {formatDate(startwerte.stand)}) als Ausgangspunkt für Verlauf und Diagramme.</span>
              </span>
              <Toggle checked={useStartwerte} onChange={setUseStartwerte} label="Startwerte übernehmen" />
            </label>
          )}
        </FlowLayout>
      )
  }
}
