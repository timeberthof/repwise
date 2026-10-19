import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useProfile, usePlanFor } from '../../db/hooks'
import type { EquipmentId, Profile } from '../../db/types'
import { loadPlanDays, regeneratePlanNow } from '../../db/repo/plan'
import { STEP_EQUIPMENT, loadWeightSteps, saveWeightSteps } from '../../db/repo/weights'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { Icon } from '../../components/icons/Icon'
import { useToast } from '../../components/ui/Toast'
import { ExperienceOptions, EXPERIENCES, LOCATIONS, LocationOptions, SplitOptions } from '../flow/steps/ChoiceSteps'
import { WeekPlanEditor, formatMinutes } from '../flow/steps/WeekPlanStep'
import { FocusEditor } from '../flow/steps/FocusStep'
import { ExcludeEditor, PainEditor } from '../flow/steps/RestrictionSteps'
import { PlanSummaryList } from '../flow/steps/CreatePlanStep'
import { SPLITS } from '../../logic/planGenerator'
import { WEEKDAYS_SHORT, formatLong, today } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { EQUIPMENT } from '../../data/equipment'
import { muscleLabel, painLabel } from '../../data/muskeln'
import { Group, Row, Section, SettingsLayout } from './SettingsLayout'

type Sheet = 'tage' | 'split' | 'erfahrung' | 'ort' | 'fokus' | 'schmerzen' | 'ausschluss' | 'spruenge' | null

/** Einstellungen → Trainingsplan: Trainingstage, Einheiten, Gewichtssprünge, Einheit kg. */
export function TrainingSettingsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const saved = useProfile()
  const plan = usePlanFor(today())
  const days = useLiveQuery(() => (plan?.id ? loadPlanDays(plan.id) : Promise.resolve([])), [plan?.id])
  const [draft, setDraft] = useState<Profile | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [confirm, setConfirm] = useState(false)
  const [showPlan, setShowPlan] = useState(false)

  useEffect(() => {
    if (saved && !draft) setDraft(saved)
  }, [saved, draft])
  if (!saved || !draft) return <SettingsLayout title="Trainingsplan">{null}</SettingsLayout>

  const set = (patch: Partial<Profile>) => setDraft({ ...draft, ...patch, daysPerWeek: (patch.weekdays ?? draft.weekdays).length })
  const dirty = JSON.stringify({ ...saved, onboardingDone: 0 }) !== JSON.stringify({ ...draft, onboardingDone: 0 })

  const apply = async () => {
    await db.profile.put(draft)
    await regeneratePlanNow(draft)
    await db.adjustments.add({ date: today(), kind: 'plan', field: 'plan', before: null, after: null, title: 'Trainingsplan neu erstellt', reason: 'Einstellungen geändert – Übungen und Tage neu geplant, der laufende Zyklus läuft weiter.' })
    toast('Plan neu erstellt', 'Gilt ab sofort. Dein Verlauf bleibt erhalten.')
  }

  return (
    <SettingsLayout
      title="Trainingsplan"
      footer={
        dirty ? (
          <Button icon="restart" onClick={() => setConfirm(true)}>
            Plan neu erstellen
          </Button>
        ) : undefined
      }
    >
      {dirty && <p className="mx-6 mt-3 rounded-lg bg-[#241607] px-4 py-3 text-[14px] text-[#f0943d]">Änderungen werden mit „Plan neu erstellen“ übernommen.</p>}

      <Section title="Woche">
        <Group>
          <Row label="Trainingstage" sub={draft.weekdays.map((d) => WEEKDAYS_SHORT[d]).join(' · ')} onClick={() => setSheet('tage')}>
            <span className="text-[15px] text-fg-2">
              {draft.weekdays.length}× · {formatMinutes(draft.sessionMinutes)}
            </span>
            <Icon name="chevronRight" size={20} className="text-fg-2" />
          </Row>
          <Row label="Split" sub={SPLITS.find((s) => s.id === draft.split)?.label} onClick={() => setSheet('split')}>
            <Icon name="chevronRight" size={20} className="text-fg-2" />
          </Row>
          <Row label="Erfahrung" sub={EXPERIENCES.find((e) => e.id === draft.experience)?.label} onClick={() => setSheet('erfahrung')}>
            <Icon name="chevronRight" size={20} className="text-fg-2" />
          </Row>
          <Row label="Mobility-Einheit" sub="Kurzer Super-Satz an jedem Trainingstag" last>
            <Toggle checked={draft.mobility} onChange={(mobility) => set({ mobility })} label="Mobility" />
          </Row>
        </Group>
      </Section>

      <Section title="Übungsauswahl">
        <Group>
          <Row label="Trainingsort & Equipment" sub={`${LOCATIONS.find((l) => l.id === draft.location)?.label} · ${draft.equipment.length}/${EQUIPMENT.length} Geräte`} onClick={() => setSheet('ort')}>
            <Icon name="chevronRight" size={20} className="text-fg-2" />
          </Row>
          <Row label="Schwerpunkte" sub={draft.focus.length ? draft.focus.map(muscleLabel).join(', ') : 'Keine'} onClick={() => setSheet('fokus')}>
            <Icon name="chevronRight" size={20} className="text-fg-2" />
          </Row>
          <Row label="Schmerzen" sub={draft.pains.length ? draft.pains.map((p) => `${painLabel(p.region)} ${p.level}`).join(', ') : 'Keine'} onClick={() => setSheet('schmerzen')}>
            <Icon name="chevronRight" size={20} className="text-fg-2" />
          </Row>
          <Row label="Ausgeschlossene Übungen" sub={draft.excludedExercises.length ? `${draft.excludedExercises.length} ausgeschlossen` : 'Keine'} onClick={() => setSheet('ausschluss')} last>
            <Icon name="chevronRight" size={20} className="text-fg-2" />
          </Row>
        </Group>
      </Section>

      <Section title="Gewichte" hint="Gewichtssprung = kleinste Steigerung bei der doppelten Progression. Eigene verfügbare Gewichte je Übung stellst Du im Training über den kg-Chip ein.">
        <Group>
          <Row label="Gewichtssprünge" sub="je Gerätetyp" onClick={() => setSheet('spruenge')}>
            <Icon name="chevronRight" size={20} className="text-fg-2" />
          </Row>
          <Row label="Einheit" sub="Repwise rechnet in Kilogramm." last>
            <span className="text-[16px] font-semibold">kg</span>
          </Row>
        </Group>
      </Section>

      <Section title="Zyklus">
        <Group>
          <Row label="Zyklusplanung" sub="6-Wochen-Zyklus ansehen, Wochentypen ändern, nächsten Zyklus planen" onClick={() => navigate('/zyklus')} last>
            <Icon name="chevronRight" size={20} className="text-fg-2" />
          </Row>
        </Group>
      </Section>

      <Section title="Aktueller Plan" hint={plan ? `Gültig seit ${formatLong(plan.startDate)}.` : undefined}>
        <button type="button" onClick={() => setShowPlan(!showPlan)} className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-4 text-[16.5px]">
          {days ? `${days.filter((d) => d.kind === 'kraft').length} Trainingstage · ${new Set(days.flatMap((d) => d.exercises.map((e) => e.exerciseId))).size} Übungen` : '…'}
          <Icon name={showPlan ? 'arrowUp' : 'arrowDown'} size={22} className="text-fg-2" />
        </button>
        {showPlan && days && <PlanSummaryList days={days} />}
      </Section>

      <EditSheet open={sheet === 'tage'} onClose={() => setSheet(null)} title="Trainingstage">
        <div className="flex flex-col pb-4" style={{ minHeight: 520 }}>
          <WeekPlanEditor split={draft.split} weekdays={draft.weekdays} onWeekdays={(weekdays) => set({ weekdays })} minutes={draft.sessionMinutes} onMinutes={(sessionMinutes) => set({ sessionMinutes })} experience={draft.experience} />
          <div className="mt-4 flex flex-wrap gap-2">
            {WEEKDAYS_SHORT.map((d, i) => {
              const on = draft.weekdays.includes(i)
              return (
                <button key={d} type="button" onClick={() => set({ weekdays: on ? draft.weekdays.filter((x) => x !== i) : [...draft.weekdays, i].sort((a, b) => a - b) })} className={`h-[40px] w-[44px] rounded-md text-[15px] font-semibold ${on ? 'bg-fg text-fg-inverse' : 'bg-surface-3 text-fg-2'}`}>
                  {d}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[13px] text-fg-2">Tage an- oder abwählen; mit ⇄ lassen sich Tage tauschen.</p>
        </div>
      </EditSheet>
      <EditSheet open={sheet === 'split'} onClose={() => setSheet(null)} title="Split">
        <SplitOptions value={draft.split} days={draft.weekdays.length} onChange={(split) => set({ split })} />
      </EditSheet>
      <EditSheet open={sheet === 'erfahrung'} onClose={() => setSheet(null)} title="Erfahrung">
        <ExperienceOptions value={draft.experience} onChange={(experience) => set({ experience })} />
      </EditSheet>
      <EditSheet open={sheet === 'ort'} onClose={() => setSheet(null)} title="Trainingsort">
        <LocationOptions location={draft.location} equipment={draft.equipment} onChange={(location, equipment) => set({ location, equipment })} />
      </EditSheet>
      <EditSheet open={sheet === 'fokus'} onClose={() => setSheet(null)} title="Schwerpunkte">
        <FocusEditor value={draft.focus} onChange={(focus) => set({ focus })} />
      </EditSheet>
      <EditSheet open={sheet === 'schmerzen'} onClose={() => setSheet(null)} title="Schmerzen">
        <PainEditor value={draft.pains} onChange={(pains) => set({ pains })} />
      </EditSheet>
      <EditSheet open={sheet === 'ausschluss'} onClose={() => setSheet(null)} title="Übungen ausschließen">
        <ExcludeEditor value={draft.excludedExercises} onChange={(excludedExercises) => set({ excludedExercises })} />
      </EditSheet>
      <StepsSheet open={sheet === 'spruenge'} onClose={() => setSheet(null)} />
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        danger={false}
        title="Plan neu erstellen?"
        text="Übungen und Trainingstage werden mit Deinen neuen Einstellungen neu geplant. Der laufende Zyklus, Dein Verlauf und alle Werte bleiben erhalten; noch nicht begonnene Einheiten werden neu berechnet."
        confirmLabel="Neu erstellen"
        onConfirm={apply}
      />
    </SettingsLayout>
  )
}

function EditSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <BottomSheet open={open} onClose={onClose} full label={title} footer={<Button onClick={onClose}>Übernehmen</Button>}>
      <SheetTitle>{title}</SheetTitle>
      <div className="px-6 pb-6">{children}</div>
    </BottomSheet>
  )
}

function StepsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [steps, setSteps] = useState<Partial<Record<EquipmentId, number>>>({})
  useEffect(() => {
    if (open) loadWeightSteps().then((s) => setSteps({ ...s }))
  }, [open])
  const options = [0.5, 1, 1.25, 2, 2.5, 4, 5]
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      full
      label="Gewichtssprünge"
      footer={
        <Button
          onClick={async () => {
            await saveWeightSteps(steps)
            onClose()
          }}
        >
          Speichern
        </Button>
      }
    >
      <SheetTitle sub="Kleinste sinnvolle Steigerung je Gerätetyp. Gilt für alle Übungen ohne eigene Gewichtsliste.">Gewichtssprünge</SheetTitle>
      <div className="flex flex-col gap-4 px-6 pb-6">
        {STEP_EQUIPMENT.map((e) => {
          const cur = steps[e.id] ?? e.default
          return (
            <div key={e.id}>
              <p className="text-[16px] font-semibold">
                {e.label} <span className="font-normal text-fg-2">· {fmt(cur)} kg</span>
              </p>
              <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
                {options.map((o) => (
                  <button key={o} type="button" onClick={() => setSteps({ ...steps, [e.id]: o })} className={`h-[36px] shrink-0 rounded-md px-3 text-[15px] ${cur === o ? 'bg-fg font-semibold text-fg-inverse' : 'bg-surface-3'}`}>
                    {fmt(o)}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </BottomSheet>
  )
}
