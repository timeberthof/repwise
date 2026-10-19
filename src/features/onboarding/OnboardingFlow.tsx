import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { FlowLayout, InfoCard } from '../flow/FlowLayout'
import { GoalChart, GoalOptions, recommendedGoals } from '../flow/steps/GoalStep'
import { ActivityOptions, ExperienceOptions, FrequencyOptions, LocationOptions, SplitOptions } from '../flow/steps/ChoiceSteps'
import { WeekPlanEditor } from '../flow/steps/WeekPlanStep'
import { BodyDataEditor, BodyFatEditor, CaloriesResult, estimateBodyFat } from '../flow/steps/BodySteps'
import { FocusEditor } from '../flow/steps/FocusStep'
import { ExcludeEditor, PainEditor } from '../flow/steps/RestrictionSteps'
import { StartwerteReview } from '../flow/steps/StartwerteStep'
import { CycleStrip, PlanProgress, PlanSummaryList } from '../flow/steps/CreatePlanStep'
import { Button } from '../../components/ui/Button'
import { loadBundledStartwerte, profileDefaults, type Startwerte } from '../../db/repo/startwerte'
import { loadPlanDays, type PlanDayWithExercises } from '../../db/repo/plan'
import { db } from '../../db/db'
import { ageOn, formatDate, formatLong } from '../../logic/dates'
import { useToast } from '../../components/ui/Toast'
import { useImportFile } from '../settings/BackupImport'
import { calculateCalories } from '../../logic/calories'
import { defaultWeekdays, recommendedSplits } from '../../logic/planGenerator'
import { emptyDraft, finishOnboarding, type Draft } from './draft'

const STEPS = [
  'willkommen',
  'ziel',
  'erfahrung',
  'haeufigkeit',
  'split',
  'woche',
  'ort',
  'koerper',
  'koerperfett',
  'aktivitaet',
  'kalorien',
  'fokus',
  'schmerzen',
  'ausschluesse',
  'startwerte',
  'erstellen',
  'plan',
] as const

export default function OnboardingFlow() {
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [startwerte, setStartwerte] = useState<Startwerte | null>(null)
  const [planDays, setPlanDays] = useState<PlanDayWithExercises[]>([])
  const [planStart, setPlanStart] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Vorbelegung: bestehendes Profil oder Startwerte
  useEffect(() => {
    ;(async () => {
      const s = await loadBundledStartwerte()
      setStartwerte(s)
      const existing = await db.profile.get('me')
      const weights = await db.body.where('kind').equals('weight').sortBy('date')
      const fats = await db.body.where('kind').equals('bodyfat').sortBy('date')
      const base = existing ?? (s ? { ...profileDefaults(s), onboardingDone: false, createdAt: Date.now() } : null)
      const sWeight = s?.koerper.gewicht.at(-1)?.wert
      const sFat = s?.koerper.koerperfett.at(-1)?.wert
      setDraft(emptyDraft(base, weights.at(-1)?.value ?? sWeight ?? 80, fats.at(-1)?.value ?? sFat ?? null, !!s))
    })()
  }, [])

  // Startwerte als Datei laden (veröffentlichte App ohne eingebaute Startwerte). Am Anfang füllen sie auch das Profil vor.
  const importFile = useImportFile({
    onStartwerte: (s) => {
      setStartwerte(s)
      if (step === 0) {
        const fat = s.koerper.koerperfett?.at(-1)?.wert ?? null
        setDraft((d) => emptyDraft({ ...profileDefaults(s), onboardingDone: false, createdAt: Date.now() }, s.koerper.gewicht.at(-1)?.wert ?? d?.weight ?? 80, fat, true))
      } else setDraft((d) => (d ? { ...d, useStartwerte: true } : d))
      toast('Startwerte geladen', `Stand ${formatDate(s.stand)} · ${Object.keys(s.maximalkraft).length} Übungen${step === 0 ? ' · Angaben vorausgefüllt' : ''}`)
    },
  })

  const set = useCallback((patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d)), [])
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  const calories = useMemo(
    () => (draft ? calculateCalories({ sex: draft.sex, weightKg: draft.weight, heightCm: draft.heightCm, age: ageOn(draft.birthDate), activity: draft.activity, goal: draft.goal }) : null),
    [draft],
  )

  const create = useCallback(async () => {
    if (!draft) return
    try {
      const planId = await finishOnboarding(draft, draft.useStartwerte ? startwerte : null)
      const plan = await db.plans.get(planId)
      setPlanStart(plan?.startDate ?? '')
      setPlanDays(await loadPlanDays(planId))
      setStep(STEPS.indexOf('plan'))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [draft, startwerte])

  if (!draft) return <div className="h-dvh bg-bg" />

  const id = STEPS[step]
  const common = { step, total: STEPS.length, onBack: step > 0 ? back : undefined, onNext: next }
  const estimate = estimateBodyFat(draft.weight, draft.heightCm, ageOn(draft.birthDate), draft.sex)

  switch (id) {
    case 'willkommen':
      return (
        <FlowLayout {...common} title="Willkommen bei Repwise!" subtitle="In wenigen Schritten erstellen wir Deinen persönlichen Trainingsplan.">
          <div className="mt-5">
            <Button variant="secondary" icon="upload" onClick={importFile.open}>
              {startwerte ? 'Backup wiederherstellen' : 'Daten importieren'}
            </Button>
            <p className="mt-2 px-1 text-[13.5px] leading-snug text-fg-2">
              {startwerte ? `✓ Startwerte geladen (Stand ${formatDate(startwerte.stand)}). Neu installiert? Dann Dein Backup laden.` : 'Optional: Startwerte-Datei oder Repwise-Backup aus der Dateien-App laden – sonst einfach weiter.'}
            </p>
          </div>
          <div className="mt-auto flex flex-col gap-[14px] pb-4 pt-5">
            <InfoCard icon="barChart" title="Dein Training passt sich an." text="Nach jeder Einheit werden Gewichte, Sätze und Wiederholungen automatisch angepasst – mit kurzer Begründung." />
            <InfoCard icon="calendar" title="Mesozyklen von 6 Wochen" text="Intro, Normal, Overreaching, Peak Week und Deload wechseln sich automatisch ab." />
            <InfoCard icon="lock" title="Alles bleibt auf Deinem iPhone." text="Repwise speichert alle Daten nur lokal und funktioniert komplett offline." />
          </div>
          {importFile.element}
        </FlowLayout>
      )
    case 'ziel':
      return (
        <FlowLayout {...common} title="Was strebst Du an?">
          <GoalChart goal={draft.goal} />
          <GoalOptions value={draft.goal} onChange={(goal) => set({ goal })} recommended={recommendedGoals(draft.bodyFat, draft.sex)} />
        </FlowLayout>
      )
    case 'erfahrung':
      return (
        <FlowLayout {...common} title="Wie erfahren bist Du?" subtitle="Danach richtet sich das Volumen Deines Plans.">
          <ExperienceOptions value={draft.experience} onChange={(experience) => set({ experience })} />
        </FlowLayout>
      )
    case 'haeufigkeit':
      return (
        <FlowLayout {...common} title="Wie oft möchtest Du trainieren?" legend>
          <FrequencyOptions
            value={draft.daysPerWeek}
            experience={draft.experience}
            onChange={(n) => {
              const rec = recommendedSplits(n)
              set({ daysPerWeek: n, weekdays: draft.weekdays.length === n ? draft.weekdays : defaultWeekdays(n), split: rec.includes(draft.split) ? draft.split : rec[0] })
            }}
          />
        </FlowLayout>
      )
    case 'split':
      return (
        <FlowLayout {...common} title="Wähle Deinen Trainingssplit" legend>
          <SplitOptions value={draft.split} days={draft.daysPerWeek} onChange={(split) => set({ split })} />
        </FlowLayout>
      )
    case 'woche':
      return (
        <FlowLayout {...common} title="Deine Wochenplanung" subtitle="Verschiebe Deine Trainings und passe Deinen Trainingsplan an.">
          <WeekPlanEditor split={draft.split} weekdays={draft.weekdays} onWeekdays={(weekdays) => set({ weekdays })} minutes={draft.sessionMinutes} onMinutes={(sessionMinutes) => set({ sessionMinutes })} experience={draft.experience} />
        </FlowLayout>
      )
    case 'ort':
      return (
        <FlowLayout {...common} title="Wo trainierst Du?" subtitle="Repwise wählt nur Übungen für Dein verfügbares Equipment.">
          <LocationOptions location={draft.location} equipment={draft.equipment} onChange={(location, equipment) => set({ location, equipment })} />
        </FlowLayout>
      )
    case 'koerper':
      return (
        <FlowLayout {...common} title="Deine Körperdaten" subtitle="Das Alter wird aus dem Geburtsdatum berechnet. Gewicht kannst Du später jederzeit aktualisieren.">
          <BodyDataEditor sex={draft.sex} birthDate={draft.birthDate} heightCm={draft.heightCm} weight={draft.weight} onChange={(p) => set(p)} />
        </FlowLayout>
      )
    case 'koerperfett':
      return (
        <FlowLayout {...common} title="Dein Körperfettanteil" subtitle="Dieser Wert hat Einfluss auf Deine Ziel-Empfehlung.">
          <BodyFatEditor value={draft.bodyFat ?? estimate} onChange={(bodyFat) => set({ bodyFat })} estimate={estimate} sex={draft.sex} />
        </FlowLayout>
      )
    case 'aktivitaet':
      return (
        <FlowLayout {...common} title="Wie aktiv bist Du im Alltag?" subtitle="Ohne das Training – für Deinen Kalorienbedarf.">
          <ActivityOptions value={draft.activity} onChange={(activity) => set({ activity })} work={draft.workPosition} onWork={(workPosition) => set({ workPosition })} />
        </FlowLayout>
      )
    case 'kalorien':
      return (
        <FlowLayout {...common} title="Dein Kalorienbedarf" subtitle="Berechnet aus Deinen Angaben und Deinem Ziel.">
          {calories && <CaloriesResult result={calories} />}
        </FlowLayout>
      )
    case 'fokus':
      return (
        <FlowLayout {...common} title="Deine Schwerpunkte" subtitle="Welche Muskelgruppen sollen mehr Aufmerksamkeit bekommen?">
          <FocusEditor value={draft.focus} onChange={(focus) => set({ focus })} />
        </FlowLayout>
      )
    case 'schmerzen':
      return (
        <FlowLayout {...common} title="Hast Du Schmerzen?" subtitle="Ab Stärke 5 meidet Repwise Übungen, die das Gelenk belasten, und plant passende Mobility-Übungen ein.">
          <PainEditor value={draft.pains} onChange={(pains) => set({ pains })} />
        </FlowLayout>
      )
    case 'ausschluesse':
      return (
        <FlowLayout {...common} title="Übungen ausschließen" subtitle="Übungen, die Du nicht machen willst oder kannst, kommen nicht in Deinen Plan.">
          <ExcludeEditor value={draft.excluded} onChange={(excluded) => set({ excluded })} />
        </FlowLayout>
      )
    case 'startwerte':
      return (
        <FlowLayout {...common} title="Deine Startwerte" subtitle="Übernommen aus Deiner bisherigen App – Ausgangspunkt für Verlauf, Diagramme und automatische Anpassung.">
          <StartwerteReview data={startwerte} use={draft.useStartwerte} onUse={(useStartwerte) => set({ useStartwerte })} onLoad={importFile.open} />
          {importFile.element}
        </FlowLayout>
      )
    case 'erstellen':
      return (
        <FlowLayout {...common} title="Dein Trainingsplan wird erstellt…" nextLabel="Meinen Trainingsplan erstellen" nextDisabled>
          {error ? <p className="mt-10 text-danger">{error}</p> : <PlanProgress labels={['Analyse Deiner Angaben', 'Auswahl der Übungen', 'Berücksichtigung Deiner Präferenzen']} onDone={create} />}
        </FlowLayout>
      )
    case 'plan':
      return (
        <FlowLayout step={step} total={STEPS.length} title="Dein Trainingsplan" subtitle={planStart ? `Startet am ${formatLong(planStart)} · 6-Wochen-Zyklus` : undefined} hideButton>
          <CycleStrip />
          <PlanSummaryList days={planDays} />
          <div className="sticky bottom-0 -mx-5 mt-6 bg-gradient-to-t from-black via-black/95 to-transparent px-5 pt-6" style={{ paddingBottom: 'max(var(--safe-bottom), 16px)' }}>
            <Button onClick={() => navigate('/training', { replace: true })}>Los geht's</Button>
          </div>
        </FlowLayout>
      )
  }
}
