import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { FlowLayout, InfoCard } from '../flow/FlowLayout'
import { GoalChart, GoalOptions, recommendedGoals } from '../flow/steps/GoalStep'
import { ActivityOptions, FrequencyOptions, LOCATIONS, LocationOptions, SplitOptions } from '../flow/steps/ChoiceSteps'
import { WeekPlanEditor, formatMinutes } from '../flow/steps/WeekPlanStep'
import { BodyFatEditor, estimateBodyFat } from '../flow/steps/BodySteps'
import { FocusEditor } from '../flow/steps/FocusStep'
import { PainEditor } from '../flow/steps/RestrictionSteps'
import { PlanProgress, PlanSummaryList } from '../flow/steps/CreatePlanStep'
import { OptionCard } from '../../components/ui/OptionCard'
import { Slider } from '../../components/ui/Slider'
import { StepperField } from '../../components/ui/Stepper'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/icons/Icon'
import { db } from '../../db/db'
import type { Plan, Profile } from '../../db/types'
import { copyPlan, createPlanFromProfile, loadPlanDays, planForDate, type PlanDayWithExercises } from '../../db/repo/plan'
import { exerciseHistory } from '../../db/repo/history'
import { detectStagnation } from '../../logic/progression'
import { defaultPlanStart, nextCycleStart } from '../../logic/cycle'
import { addDays, ageOn, formatDate, formatLong, today, weekdayIndex } from '../../logic/dates'
import { defaultWeekdays, recommendedSplits } from '../../logic/planGenerator'
import { ACTIVITY_LEVELS } from '../../logic/calories'
import { EQUIPMENT } from '../../data/equipment'
import { exerciseName } from '../../data/exercises'
import { muscleLabel, painLabel } from '../../data/muskeln'

const STEPS = ['glueckwunsch', 'anpassen', 'schlaf', 'gewicht', 'koerperfett', 'ziel', 'haeufigkeit', 'split', 'woche', 'korrekt', 'optimieren', 'ergebnis'] as const

const SLEEP_LABELS = ['Schlaflosigkeit', 'Sehr schlecht', 'Schlecht', 'Schlecht', 'Unruhig', 'Mittelmäßig', 'Okay', 'Gut', 'Gut', 'Sehr gut', 'Sehr gut ausgeschlafen']

interface State {
  profile: Profile
  plan: Plan | null
  start: string
  weight: number
  bodyFat: number
  mode: 'auto' | 'keep'
  stagnating: string[]
}

/** „Nächsten Trainingszyklus planen“ (S17–S26). Der neue Plan startet mit dem nächsten Zyklus. */
export default function ZyklusPlanen() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [st, setSt] = useState<State | null>(null)
  const [sheet, setSheet] = useState<'ort' | 'fokus' | 'schmerzen' | 'aktivitaet' | null>(null)
  const [result, setResult] = useState<{ days: PlanDayWithExercises[]; replaced: [string, string][] } | null>(null)

  useEffect(() => {
    ;(async () => {
      const profile = await db.profile.get('me')
      if (!profile) return navigate('/onboarding', { replace: true })
      const t = today()
      const plan = await planForDate(t)
      const start = plan && plan.startDate <= t ? nextCycleStart(plan, t) : defaultPlanStart(t, weekdayIndex(t))
      const weights = await db.body.where('kind').equals('weight').sortBy('date')
      const fats = await db.body.where('kind').equals('bodyfat').sortBy('date')
      // Übungen ohne Fortschritt in den letzten 3 Einheiten → im neuen Plan durch Varianten ersetzen
      const stagnating: string[] = []
      if (plan?.id) {
        const days = await db.planDays.where('planId').equals(plan.id).filter((d) => d.kind === 'kraft').toArray()
        const ids = new Set<string>()
        for (const d of days) (await db.planExercises.where('planDayId').equals(d.id!).toArray()).forEach((pe) => ids.add(pe.exerciseId))
        for (const id of ids) {
          const { history } = await exerciseHistory(id, addDays(t, 1))
          if (detectStagnation(history)) stagnating.push(id)
        }
      }
      const weight = weights.at(-1)?.value ?? 80
      setSt({
        profile,
        plan,
        start,
        weight,
        bodyFat: fats.at(-1)?.value ?? estimateBodyFat(weight, profile.heightCm, ageOn(profile.birthDate), profile.sex),
        mode: profile.planMode ?? 'auto',
        stagnating,
      })
    })()
  }, [navigate])

  const set = (patch: Partial<Profile>) => setSt((s) => (s ? { ...s, profile: { ...s.profile, ...patch } } : s))
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  const apply = useCallback(async () => {
    if (!st) return
    const t = today()
    const p: Profile = { ...st.profile, planMode: st.mode, daysPerWeek: st.profile.weekdays.length }
    await db.profile.put(p)
    const upsert = async (kind: 'weight' | 'bodyfat', value: number) => {
      const list = await db.body.where('kind').equals(kind).sortBy('date')
      if (list.at(-1)?.value === value) return
      const existing = await db.body.where('[kind+date]').equals([kind, t]).first()
      if (existing?.id) await db.body.update(existing.id, { value, source: 'app' })
      else await db.body.add({ date: t, kind, value, source: 'app' })
    }
    await upsert('weight', st.weight)
    await upsert('bodyfat', st.bodyFat)

    const oldIds = new Set<string>()
    if (st.plan?.id) for (const d of await loadPlanDays(st.plan.id)) d.exercises.forEach((e) => oldIds.add(e.exerciseId))
    const planId = st.mode === 'keep' && st.plan?.id ? await copyPlan(st.plan.id, st.start) : await createPlanFromProfile(p, 'zyklus', st.start, st.stagnating)
    if (!planId) return
    const days = await loadPlanDays(planId)
    const newIds = new Set(days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))
    const replaced: [string, string][] = st.stagnating.filter((id) => !newIds.has(id)).map((id) => [id, ''])
    const added = [...newIds].filter((id) => !oldIds.has(id))
    await db.adjustments.add({
      date: t,
      kind: 'plan',
      field: 'plan',
      before: null,
      after: null,
      title: 'Neuer Trainingszyklus geplant',
      reason:
        st.mode === 'keep'
          ? `Plan mit Deinen Anpassungen übernommen, Start ${formatDate(st.start)}.`
          : `Repwise entscheidet, Start ${formatDate(st.start)}.${replaced.length ? ` Wegen Stagnation ersetzt: ${replaced.map(([id]) => exerciseName(id)).join(', ')}.` : ''}${added.length ? ` Neu: ${added.map(exerciseName).join(', ')}.` : ''}`,
    })
    setResult({ days, replaced })
    setStep(STEPS.indexOf('ergebnis'))
  }, [st])

  if (!st) return <div className="h-dvh bg-bg" />
  const id = STEPS[step]
  const common = { step, total: STEPS.length, onBack: step > 0 ? back : undefined, onClose: () => navigate(-1), onNext: next }
  const pr = st.profile
  const estimate = estimateBodyFat(st.weight, pr.heightCm, ageOn(pr.birthDate), pr.sex)

  switch (id) {
    case 'glueckwunsch':
      return (
        <FlowLayout {...common} title="Herzlichen Glückwunsch!" subtitle="Du bist dabei den nächsten Trainingszyklus zu beginnen.">
          <div className="mt-[30px] flex flex-col gap-[14px]">
            <InfoCard icon="barChart" title="Du bist dabei den nächsten Trainingszyklus zu planen." text="Deine vergangenen Trainings werden analysiert und Dein Plan anhand Deiner Präferenzen optimiert." />
            <InfoCard icon="calendar" title={`Neuer Plan startet am ${formatDate(st.start)}`} text="Dein neuer Plan wird erst zu Beginn des nächsten Zyklus aktiv. Bis dahin trainierst Du nach Deinem aktuellen Plan weiter." />
            {st.stagnating.length > 0 && (
              <InfoCard icon="trendingDown" title={`${st.stagnating.length} ${st.stagnating.length === 1 ? 'Übung stagniert' : 'Übungen stagnieren'}`} text={`${st.stagnating.map(exerciseName).join(', ')} – seit 3 Einheiten ohne Fortschritt. Repwise wählt dafür eine Variante.`} />
            )}
          </div>
        </FlowLayout>
      )
    case 'anpassen':
      return (
        <FlowLayout {...common} title="Plan anpassen" subtitle="Wähle ob Du deine manuellen Anpassungen beibehalten möchtest.">
          <div className="mt-[30px] flex flex-col gap-[12px]">
            <OptionCard icon="wand" title="Repwise entscheidet" badge="Empfohlen" recommended description="Die Übungsauswahl und Wiederholungsbereiche werden optimiert." descriptionWhenSelected={false} selected={st.mode === 'auto'} onClick={() => setSt({ ...st, mode: 'auto' })} />
            <OptionCard icon="lock" title="Anpassungen beibehalten" description="Dein aktueller Trainingsplan mitsamt deinen Anpassungen wird beibehalten." descriptionWhenSelected={false} selected={st.mode === 'keep'} onClick={() => setSt({ ...st, mode: 'keep' })} />
          </div>
        </FlowLayout>
      )
    case 'schlaf':
      return (
        <FlowLayout
          {...common}
          title="Wie war Dein Schlaf?"
          subtitle="Wie hast Du in letzten 6 Wochen geschlafen?"
          bottomContent={
            <div className="pb-8">
              <p className="text-center text-[20px] font-semibold">{SLEEP_LABELS[pr.sleep ?? 10]}</p>
              <Slider className="mx-2 mt-6" value={pr.sleep ?? 10} min={0} max={10} onChange={(v) => set({ sleep: v })} ariaLabel="Schlaf" />
              <div className="mt-4 flex justify-between text-[16px]">
                <span>Schlaflosigkeit</span>
                <span>Sehr gut</span>
              </div>
            </div>
          }
        />
      )
    case 'gewicht':
      return (
        <FlowLayout {...common} title="Dein Gewicht" subtitle="Für Deinen Kalorienbedarf und die Planung. Es wird mit dem heutigen Datum gespeichert.">
          <div className="mt-[40px] rounded-xl border border-elevated bg-surface">
            <StepperField value={st.weight} onChange={(v) => setSt({ ...st, weight: v })} step={0.1} min={30} max={250} suffix="kg" digits={1} circled />
          </div>
        </FlowLayout>
      )
    case 'koerperfett':
      return (
        <FlowLayout {...common} title="Dein Körperfettanteil" subtitle="Dieser Wert hat Einfluss auf Deine Ziel-Empfehlung.">
          <BodyFatEditor value={st.bodyFat} onChange={(v) => setSt({ ...st, bodyFat: v })} estimate={estimate} sex={pr.sex} />
        </FlowLayout>
      )
    case 'ziel':
      return (
        <FlowLayout {...common} title="Was strebst Du an?">
          <GoalChart goal={pr.goal} />
          <GoalOptions value={pr.goal} onChange={(goal) => set({ goal })} recommended={recommendedGoals(st.bodyFat, pr.sex)} />
        </FlowLayout>
      )
    case 'haeufigkeit':
      return (
        <FlowLayout {...common} title="Wie oft möchtest Du trainieren?" legend>
          <FrequencyOptions
            value={pr.weekdays.length}
            experience={pr.experience}
            onChange={(n) => {
              const rec = recommendedSplits(n)
              set({ daysPerWeek: n, weekdays: pr.weekdays.length === n ? pr.weekdays : defaultWeekdays(n), split: rec.includes(pr.split) ? pr.split : rec[0] })
            }}
          />
        </FlowLayout>
      )
    case 'split':
      return (
        <FlowLayout {...common} title="Wähle Deinen Trainingssplit" legend>
          <SplitOptions value={pr.split} days={pr.weekdays.length} onChange={(split) => set({ split })} />
        </FlowLayout>
      )
    case 'woche':
      return (
        <FlowLayout {...common} title="Deine Wochenplanung" subtitle="Verschiebe Deine Trainings und passe Deinen Trainingsplan an.">
          <WeekPlanEditor split={pr.split} weekdays={pr.weekdays} onWeekdays={(weekdays) => set({ weekdays })} minutes={pr.sessionMinutes} onMinutes={(sessionMinutes) => set({ sessionMinutes })} experience={pr.experience} />
        </FlowLayout>
      )
    case 'korrekt': {
      const rows: { label: string; value: string; sheet: typeof sheet }[] = [
        { label: 'Trainingsort', value: LOCATIONS.find((l) => l.id === pr.location)?.label ?? '', sheet: 'ort' },
        { label: 'Equipment', value: `${pr.equipment.length} / ${EQUIPMENT.length}`, sheet: 'ort' },
        { label: 'Fokus', value: pr.focus.length ? pr.focus.map(muscleLabel).join(', ') : 'Keiner', sheet: 'fokus' },
        { label: 'Schmerzen', value: pr.pains.length ? pr.pains.map((x) => `${painLabel(x.region)}: ${x.level}`).join(', ') : 'Keine', sheet: 'schmerzen' },
        { label: 'Freizeit', value: ACTIVITY_LEVELS.find((a) => a.id === pr.activity)?.label ?? '', sheet: 'aktivitaet' },
        { label: 'Arbeitsposition', value: pr.workPosition === 'sitzend' ? 'Sitzend' : pr.workPosition === 'stehend' ? 'Stehend' : 'Körperlich', sheet: 'aktivitaet' },
        { label: 'Dauer', value: formatMinutes(pr.sessionMinutes), sheet: null },
      ]
      return (
        <FlowLayout {...common} title="Noch alles korrekt?" onNext={next}>
          <div className="mt-[26px] flex flex-col">
            {rows.map((r) => (
              <button key={r.label} type="button" disabled={!r.sheet} onClick={() => setSheet(r.sheet)} className="flex items-center gap-3 border-b border-elevated py-[16px] text-left">
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] text-fg-2">{r.label}</span>
                  <span className="mt-[2px] block text-[18px] font-semibold">{r.value}</span>
                </span>
                {r.sheet && <Icon name="edit" size={22} />}
              </button>
            ))}
          </div>
          <EditSheet open={sheet === 'ort'} onClose={() => setSheet(null)} title="Trainingsort">
            <LocationOptions location={pr.location} equipment={pr.equipment} onChange={(location, equipment) => set({ location, equipment })} />
          </EditSheet>
          <EditSheet open={sheet === 'fokus'} onClose={() => setSheet(null)} title="Schwerpunkte">
            <FocusEditor value={pr.focus} onChange={(focus) => set({ focus })} />
          </EditSheet>
          <EditSheet open={sheet === 'schmerzen'} onClose={() => setSheet(null)} title="Schmerzen">
            <PainEditor value={pr.pains} onChange={(pains) => set({ pains })} />
          </EditSheet>
          <EditSheet open={sheet === 'aktivitaet'} onClose={() => setSheet(null)} title="Aktivität">
            <ActivityOptions value={pr.activity} onChange={(activity) => set({ activity })} work={pr.workPosition} onWork={(workPosition) => set({ workPosition })} />
          </EditSheet>
        </FlowLayout>
      )
    }
    case 'optimieren':
      return (
        <FlowLayout {...common} onBack={undefined} title="Dein Trainingsplan wird optimiert…" nextLabel="Meinen Trainingsplan optimieren" nextDisabled>
          <PlanProgress labels={['Analyse Deiner letzten Trainings', 'Optimierung der Übungsauswahl', 'Berücksichtigung Deiner Präferenzen']} onDone={apply} />
        </FlowLayout>
      )
    case 'ergebnis':
      return (
        <FlowLayout step={step} total={STEPS.length} title="Dein neuer Trainingsplan" subtitle={`Startet am ${formatLong(st.start)} mit einer Intro-Woche.`} hideButton>
          {result && result.replaced.length > 0 && (
            <div className="mt-4 rounded-xl bg-surface px-4 py-3 text-[14.5px] text-fg-2">
              Wegen Stagnation ersetzt: <span className="text-fg">{result.replaced.map(([id]) => exerciseName(id)).join(', ')}</span>
            </div>
          )}
          {result && <PlanSummaryList days={result.days} />}
          <div className="sticky bottom-0 -mx-5 mt-6 bg-gradient-to-t from-black via-black/95 to-transparent px-5 pt-6" style={{ paddingBottom: 'max(var(--safe-bottom), 16px)' }}>
            <Button onClick={() => navigate('/zyklus', { replace: true })}>Fertig</Button>
          </div>
        </FlowLayout>
      )
  }
}

function EditSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <BottomSheet open={open} onClose={onClose} full label={title} footer={<Button onClick={onClose}>Übernehmen</Button>}>
      <SheetTitle>{title}</SheetTitle>
      <div className="px-6 pb-6">{children}</div>
    </BottomSheet>
  )
}
