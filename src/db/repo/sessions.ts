import { db } from '../db'
import type { AdjustmentNote, Checkin, ExerciseRole, ISODate, Plan, PlanDay, PlanExercise, Session, SessionExercise, SetEntry, WeekType } from '../types'
import { getExercise } from '../../data/exercises'
import { limitSessionSets, prescribe, PROGRESSION_CONFIG, WEEK_TYPE_INFO, type PrescribeResult } from '../../logic/progression'
import { weekTypeFor } from '../../logic/cycle'
import { addDays, formatDate, today, weekdayIndex } from '../../logic/dates'
import { sessionE1rm } from '../../logic/e1rm'
import { estimateMinutes } from '../../logic/planGenerator'
import { prescriptionForRole, roleOf } from '../../logic/roles'
import { occurrenceIndex, resolveVariants } from '../../logic/variants'
import { daysBetween, exerciseHistory, lastE1rm, lastTrainedDate, relatedE1rm } from './history'
import { availableWeights, withStep } from './weights'
import { pausedDates } from '../derived'
import { planForDate, variantsForPlan } from './plan'

/** Fehler, wenn eine Einheit schon die Höchstzahl an Übungen hat. */
export class TooManyExercisesError extends Error {
  constructor() {
    super(`Höchstens ${PROGRESSION_CONFIG.planning.maxExercises} Übungen pro Einheit`)
  }
}

// ---------------------------------------------------------------------------
// Varianten: welche Übung ist an einem Tag dran?

export interface ResolvedPlanExercise {
  pe: PlanExercise
  /** Übung an diesem Tag (Variante) */
  exerciseId: string
  /** Übung bei der letzten Einheit dieses Typs (für den Hinweis „gewechselt“) */
  previousId: string
}

/** Varianten eines Plantags für ein Datum auflösen (Anker, fixierte Übungen und Deload-Wochen wechseln nicht). */
export async function resolvedPlanExercises(plan: Plan, day: PlanDay, date: ISODate): Promise<ResolvedPlanExercise[]> {
  const pes = await db.planExercises.where('planDayId').equals(day.id!).sortBy('order')
  if (day.kind !== 'kraft' || !plan.id) return pes.map((pe) => ({ pe, exerciseId: pe.exerciseId, previousId: pe.exerciseId }))
  const same = await db.planDays.where('planId').equals(plan.id).filter((d) => d.kind === 'kraft' && d.name === day.name).toArray()
  const occ = occurrenceIndex({ startDate: plan.startDate, date, weekdays: [...new Set(same.map((d) => d.weekday))], weekTypeOf: (d) => weekTypeFor(plan, d).type })
  const now = resolveVariants(pes, occ)
  const before = occ > 0 ? resolveVariants(pes, occ - 1) : now
  return pes.map((pe, i) => ({ pe, exerciseId: now[i], previousId: before[i] }))
}

export interface PlannedItem extends ResolvedPlanExercise {
  p: PrescribeResult
  role: ExerciseRole | undefined
}

/**
 * Vorgaben einer geplanten Einheit (ohne zu speichern): Varianten, Progression je Übung,
 * dann die Satzgrenzen der ganzen Einheit nach dem Wochentyp (z. B. Deload 40–50 % weniger Sätze).
 */
export async function planSession(plan: Plan, day: PlanDay, date: ISODate, weekType: WeekType, checkin?: Checkin): Promise<PlannedItem[]> {
  const resolved = await resolvedPlanExercises(plan, day, date)
  const items: PlannedItem[] = await Promise.all(
    resolved.map(async (r) => {
      const ex = getExercise(r.exerciseId)
      const role = day.kind === 'kraft' && ex?.art === 'kraft' ? (r.pe.role ?? roleOf(ex)) : undefined
      const p = await prescribeExercise({ ...r.pe, exerciseId: r.exerciseId }, date, weekType, checkin, { role, variantIds: r.pe.variants })
      if (r.exerciseId !== r.pe.exerciseId) {
        p.notes.unshift({
          kind: 'variante',
          field: 'uebung',
          before: null,
          after: null,
          title: 'Variante zur Abwechslung',
          reason: `Heute die Variante „${getExercise(r.exerciseId)?.name ?? r.exerciseId}“ statt „${getExercise(r.pe.exerciseId)?.name ?? r.pe.exerciseId}“ – gleiche Zielmuskeln, eigener Verlauf.`,
        })
      }
      return { ...r, p, role }
    }),
  )
  if (day.kind === 'kraft') applySessionLimits(items, weekType)
  return items
}

/** Satzgrenzen der ganzen Einheit anwenden und die Hinweise anpassen. */
function applySessionLimits(items: { pe: Pick<PlanExercise, 'sets'>; p: PrescribeResult; role: ExerciseRole | undefined; fixed?: boolean }[], weekType: WeekType) {
  const planned = items.map((x) => (x.fixed ? x.p.sets : x.pe.sets))
  const limited = limitSessionSets(
    planned,
    items.map((x) => x.p.sets),
    weekType,
    items.map((x) => x.role),
  )
  items.forEach((x, i) => {
    if (x.fixed || limited[i] === x.p.sets) return
    const note = x.p.notes.find((n) => n.field === 'sets' && n.kind === 'wochentyp')
    if (note && note.before === limited[i]) x.p.notes.splice(x.p.notes.indexOf(note), 1)
    else if (note) note.after = limited[i]
    else
      x.p.notes.push({
        kind: 'wochentyp',
        field: 'sets',
        before: x.pe.sets,
        after: limited[i],
        title: 'Satzzahl angepasst',
        reason: `Die Anzahl deiner Sätze wurde ${WEEK_TYPE_INFO[weekType].reason || 'für die Einheit'} angepasst.`,
      })
    x.p.sets = limited[i]
  })
}

// ---------------------------------------------------------------------------
// Tagesansicht: geplante Einheiten (aus dem Plan) + tatsächliche Einheiten

export interface DayEntry {
  key: string
  date: ISODate
  name: string
  kind: 'kraft' | 'mobility'
  planDay?: PlanDay
  planExercises: PlanExercise[]
  session?: Session
  sessionExercises?: SessionExercise[]
  weekType: WeekType
  weekTypeManual: boolean
  minutes: number
  paused: boolean
}

export async function activePlan(date: ISODate = today()): Promise<Plan | null> {
  return planForDate(date)
}

export async function dayEntries(date: ISODate): Promise<DayEntry[]> {
  const plan = await planForDate(date)
  const sessions = await db.sessions.where('date').equals(date).toArray()
  const entries: DayEntry[] = []
  const usedSessions = new Set<number>()
  const paused = pausedDates(plan).has(date)

  if (plan?.id && date >= plan.startDate) {
    const wt = weekTypeFor(plan, date)
    const days = (await db.planDays.where('planId').equals(plan.id).toArray()).filter((d) => d.weekday === weekdayIndex(date)).sort((a, b) => a.order - b.order)
    // Verschobene Einheiten dieses Tages finden (geplant hier, aber auf anderen Tag gelegt)
    const movedAway = await db.sessions.filter((s) => s.plannedDate === date && s.date !== date).toArray()
    for (const d of days) {
      if (movedAway.some((s) => s.planDayId === d.id)) continue
      const session = sessions.find((s) => s.planDayId === d.id && !usedSessions.has(s.id!))
      if (session) usedSessions.add(session.id!)
      // Übungen dieses Tages mit der heute dran befindlichen Variante
      const planExercises = (await resolvedPlanExercises(plan, d, date)).map((r) => ({ ...r.pe, exerciseId: r.exerciseId }))
      const sessionExercises = session ? await db.sessionExercises.where('sessionId').equals(session.id!).sortBy('order') : undefined
      entries.push({
        key: session ? `s${session.id}` : `p${d.id}`,
        date,
        name: d.name,
        kind: d.kind,
        planDay: d,
        planExercises,
        session,
        sessionExercises,
        weekType: session?.weekType ?? wt.type,
        weekTypeManual: session?.weekTypeManual ?? wt.manual,
        minutes: session?.estMinutes ?? estimateMinutes(adjustForWeek(planExercises, d.kind === 'kraft' ? wt.type : 'normal')),
        paused,
      })
    }
  }
  for (const s of sessions) {
    if (usedSessions.has(s.id!)) continue
    const sessionExercises = await db.sessionExercises.where('sessionId').equals(s.id!).sortBy('order')
    entries.push({
      key: `s${s.id}`,
      date,
      name: s.name,
      kind: s.kind,
      planExercises: [],
      session: s,
      sessionExercises,
      weekType: s.weekType,
      weekTypeManual: !!s.weekTypeManual,
      minutes: s.estMinutes ?? estimateMinutes(sessionExercises),
      paused: false,
    })
  }
  return entries
}

/** Sätze für die Zeitschätzung an den Wochentyp anpassen (Deload ≈ 45 % weniger, Overreaching +1 bei Mehrgelenk). */
export function adjustForWeek<T extends Pick<PlanExercise, 'sets' | 'role'>>(list: T[], type: WeekType): T[] {
  const t = PROGRESSION_CONFIG.weekTypes[type]
  return list.map((e) => {
    let sets = e.sets
    if (t.setsReduction) sets = Math.max(1, Math.round(sets * (1 - t.setsReduction)))
    if (t.compoundSetsDelta && e.role !== 'isolation') sets = Math.min(PROGRESSION_CONFIG.planning.maxSetsPerExercise, sets + t.compoundSetsDelta)
    return { ...e, sets }
  })
}

// ---------------------------------------------------------------------------
// Vorgaben je Übung

export async function prescribeExercise(
  pe: Pick<PlanExercise, 'exerciseId' | 'sets' | 'repMin' | 'repMax' | 'targetRir'>,
  date: ISODate,
  weekType: WeekType,
  checkin?: Checkin,
  opts: { role?: ExerciseRole; variantIds?: string[] } = {},
): Promise<PrescribeResult> {
  const lib = getExercise(pe.exerciseId)
  if (!lib || lib.art === 'mobility') {
    return { sets: pe.sets, repMin: pe.repMin, repMax: pe.repMax, targetRir: pe.targetRir, weight: null, notes: [], isEstimate: false }
  }
  // Gewichtssprung aus den Einstellungen (je Gerätetyp) berücksichtigen
  const ex = withStep(lib)
  const { history, lastDate } = await exerciseHistory(ex.id, date)
  const own = await lastE1rm(ex.id)
  const related = own ? null : await relatedE1rm(ex)
  const available = ex.gewichtsschritt ? ((await availableWeights(ex.id)) ?? undefined) : undefined
  // Trainingspause über alle Varianten gemessen – eine rotierende Variante ist nicht „pausiert“
  const lastGroupDate = opts.variantIds?.length ? await lastTrainedDate([...new Set([ex.id, ...opts.variantIds])], date) : null
  const last = [lastDate, lastGroupDate].filter((d): d is string => !!d).sort().at(-1) ?? null
  return prescribe({
    exercise: ex,
    repMin: pe.repMin,
    repMax: pe.repMax,
    targetRir: pe.targetRir,
    plannedSets: pe.sets,
    history,
    available,
    role: opts.role ?? roleOf(ex),
    weekType,
    checkin,
    daysSinceLast: daysBetween(last, date),
    calibration: { ownE1rm: own?.value, related },
  })
}

/** Einheit für einen geplanten Tag anlegen (falls noch nicht vorhanden). */
export async function ensureSession(date: ISODate, planDayId: number): Promise<number> {
  const existing = await db.sessions.filter((s) => s.planDayId === planDayId && (s.plannedDate ?? s.date) === date).first()
  if (existing?.id) return existing.id
  const day = await db.planDays.get(planDayId)
  const plan = day ? await db.plans.get(day.planId) : undefined
  if (!day || !plan) throw new Error('Plantag nicht gefunden')
  const wt = weekTypeFor(plan, date)
  const weekType = day.kind === 'kraft' ? wt.type : 'normal'
  const items = await planSession(plan, day, date, weekType)
  return db.transaction('rw', [db.sessions, db.sessionExercises], async () => {
    const sessionId = (await db.sessions.add({
      date,
      planId: plan.id,
      planDayId,
      name: day.name,
      kind: day.kind,
      weekType,
      weekTypeManual: wt.manual,
      status: 'geplant',
      location: day.location,
      estMinutes: estimateMinutes(items.map((x) => ({ sets: x.p.sets, restSec: x.pe.restSec }))),
    })) as number
    await db.sessionExercises.bulkAdd(
      items.map(({ pe, exerciseId, p, role }, i) => ({
        sessionId,
        exerciseId,
        order: i,
        sets: p.sets,
        repMin: p.repMin,
        repMax: p.repMax,
        targetRir: p.targetRir,
        restSec: pe.restSec,
        weight: p.weight,
        weightIsEstimate: p.isEstimate,
        superset: pe.superset,
        adjustments: p.notes,
        planExerciseId: pe.id,
        role,
        targetReps: p.targetReps,
      })),
    )
    return sessionId
  })
}

/** Trainingstyp nur für diese Einheit ändern (S29) – Vorgaben werden neu berechnet. */
export async function setSessionWeekType(sessionId: number, weekType: WeekType) {
  const s = await db.sessions.get(sessionId)
  if (!s || s.status === 'fertig') return
  if (s.weekType !== weekType) {
    await db.adjustments.add({
      date: today(),
      sessionId,
      kind: 'manuell',
      field: 'woche',
      before: null,
      after: null,
      title: 'Trainingstyp geändert',
      reason: `${s.name} am ${formatDate(s.date)}: ${WEEK_TYPE_INFO[s.weekType].label} → ${WEEK_TYPE_INFO[weekType].label} (nur diese Einheit)`,
    })
  }
  await db.sessions.update(sessionId, { weekType, weekTypeManual: true })
  if (s.kind === 'kraft') await recomputeSession(sessionId)
}

/** Vorgaben aller noch nicht begonnenen Übungen neu berechnen (Wochentyp, Check-in). */
export async function recomputeSession(sessionId: number) {
  const s = await db.sessions.get(sessionId)
  if (!s) return
  const list = await db.sessionExercises.where('sessionId').equals(sessionId).sortBy('order')
  const pes = s.planDayId ? await db.planExercises.where('planDayId').equals(s.planDayId).toArray() : []
  const weekType = s.kind === 'kraft' ? s.weekType : 'normal'
  const work = await Promise.all(
    list.map(async (se) => {
      const doneSets = await db.sets.where('sessionExerciseId').equals(se.id!).filter((x) => x.done).count()
      const pe = pes.find((p) => p.id === se.planExerciseId) ?? pes.find((p) => p.exerciseId === se.exerciseId)
      const ex = getExercise(se.exerciseId)
      const role = se.role ?? (ex && ex.art === 'kraft' ? roleOf(ex) : undefined)
      const manual = se.adjustments.filter((a) => a.kind === 'manuell' || a.kind === 'tausch')
      // Von Hand überschriebene Werte bleiben erhalten; begonnene Übungen werden nicht neu berechnet
      const keepWeight = manual.some((a) => a.kind === 'manuell' && a.field === 'weight')
      const keepSets = manual.some((a) => a.kind === 'manuell' && a.field === 'sets')
      const fixed = doneSets > 0
      const base = { exerciseId: se.exerciseId, sets: pe?.sets ?? baseSets(se), repMin: se.repMin, repMax: se.repMax, targetRir: pe?.targetRir ?? se.targetRir }
      const p = fixed
        ? { sets: se.sets, repMin: se.repMin, repMax: se.repMax, targetRir: se.targetRir, weight: se.weight, notes: se.adjustments, isEstimate: se.weightIsEstimate, targetReps: se.targetReps }
        : await prescribeExercise(base, s.date, weekType, s.checkin, { role, variantIds: pe?.variants })
      if (!fixed && keepSets) p.sets = se.sets
      return { se, pe: { sets: base.sets }, p, role, fixed: fixed || keepSets, keepWeight, keepSets, manual }
    }),
  )
  if (s.kind === 'kraft') applySessionLimits(work, weekType)
  for (const w of work) {
    if (w.fixed && !w.keepSets) continue
    const { se, p } = w
    const variant = se.adjustments.filter((a) => a.kind === 'variante')
    await db.sessionExercises.update(se.id!, {
      sets: w.keepSets ? se.sets : p.sets,
      targetRir: p.targetRir,
      weight: w.keepWeight ? se.weight : p.weight,
      weightIsEstimate: w.keepWeight ? false : p.isEstimate,
      targetReps: p.targetReps,
      adjustments: [...variant, ...p.notes.filter((n) => n.kind !== 'variante' && !(w.keepWeight && n.field === 'weight') && !(w.keepSets && n.field === 'sets')), ...w.manual],
    })
    if (s.status === 'laeuft') await syncPlannedSets(se.id!)
  }
}

function baseSets(se: SessionExercise) {
  const wt = se.adjustments.find((a) => a.field === 'sets' && a.before !== null)
  return wt?.before ?? se.sets
}

// ---------------------------------------------------------------------------
// Ablauf

/** Training starten: Check-in speichern, Vorgaben anpassen, Sätze anlegen. */
export async function startSession(sessionId: number, checkin: Checkin) {
  await db.sessions.update(sessionId, { checkin, status: 'laeuft', startedAt: Date.now(), currentExercise: 0 })
  await recomputeSession(sessionId)
  const list = await db.sessionExercises.where('sessionId').equals(sessionId).toArray()
  for (const se of list) await syncPlannedSets(se.id!)
}

/** Geplante (noch offene) Sätze an die Vorgabe angleichen: Anzahl, Gewicht, Wiederholungen. */
export async function syncPlannedSets(sessionExerciseId: number) {
  const se = await db.sessionExercises.get(sessionExerciseId)
  const s = se ? await db.sessions.get(se.sessionId) : undefined
  if (!se || !s) return
  const sets = await db.sets.where('sessionExerciseId').equals(sessionExerciseId).sortBy('index')
  const done = sets.filter((x) => x.done)
  const open = sets.filter((x) => !x.done)
  const lastReps = await previousReps(se.exerciseId, s.date)
  // Nach einer Steigerung bzw. in der Intensivwoche: unteres Ende des Bereichs, sonst Wiederholungen der letzten Einheit
  const reps = (i: number) => (se.targetReps ? clamp(se.targetReps, se.repMin, se.repMax) : clamp(lastReps[i] ?? se.repMin, se.repMin, se.repMax))
  const wanted = Math.max(se.sets, done.length)
  await db.transaction('rw', db.sets, async () => {
    for (const o of open) await db.sets.delete(o.id!)
    const rows: SetEntry[] = []
    for (let i = done.length; i < wanted; i++) {
      rows.push({ sessionId: s.id!, sessionExerciseId, exerciseId: se.exerciseId, date: s.date, index: i, weight: se.weight, reps: reps(i), rir: se.targetRir, done: false })
    }
    await db.sets.bulkAdd(rows)
  })
}

async function previousReps(exerciseId: string, date: ISODate): Promise<number[]> {
  const { history } = await exerciseHistory(exerciseId, date)
  const last = history.sessions.at(-1)
  return last ? last.sets.filter((x) => x.done).map((x) => x.reps) : []
}

export async function completeSet(setId: number, values: { reps: number; weight: number | null; rir: number | null }) {
  await db.sets.update(setId, { ...values, done: true, doneAt: Date.now() })
  const set = await db.sets.get(setId)
  if (!set) return
  // Folgende offene Sätze übernehmen Gewicht/Wdh/RIR des gerade erledigten Satzes
  const open = await db.sets.where('sessionExerciseId').equals(set.sessionExerciseId).filter((x) => !x.done && x.index > set.index).toArray()
  for (const o of open) await db.sets.update(o.id!, { weight: values.weight, reps: values.reps, rir: values.rir })
}

export async function uncompleteSet(setId: number) {
  await db.sets.update(setId, { done: false, doneAt: undefined })
}

/** Sätze ändern (S35) – „Bestätigen“. */
/** Erlaubte Satzzahl bei manuellen Änderungen: 2–4 (in der Deload-Woche ab 1). */
export function manualSetRange(weekType: WeekType, doneCount = 0): [number, number] {
  const P = PROGRESSION_CONFIG.planning
  const lo = weekType === 'deload' ? 1 : P.minSetsPerExercise
  return [Math.max(lo, doneCount), Math.max(P.maxSetsPerExercise, doneCount)]
}

export async function setExerciseSets(sessionExerciseId: number, requested: number) {
  const se = await db.sessionExercises.get(sessionExerciseId)
  if (!se) return
  const s = await db.sessions.get(se.sessionId)
  const done = await db.sets.where('sessionExerciseId').equals(sessionExerciseId).filter((x) => x.done).count()
  const [lo, hi] = manualSetRange(s?.weekType ?? 'normal', done)
  const sets = Math.min(hi, Math.max(lo, requested))
  const note: AdjustmentNote = { kind: 'manuell', field: 'sets', before: se.sets, after: sets, title: 'Von Dir geändert', reason: `Satzzahl von ${se.sets} auf ${sets} geändert.` }
  await db.sessionExercises.update(sessionExerciseId, { sets, adjustments: [...se.adjustments.filter((a) => !(a.kind === 'manuell' && a.field === 'sets')), note] })
  await syncPlannedSets(sessionExerciseId)
}

/** Wiederholungsbereich ändern (S33). */
export async function setExerciseRange(sessionExerciseId: number, repMin: number, repMax: number, permanent = true) {
  const se = await db.sessionExercises.get(sessionExerciseId)
  if (!se) return
  await db.sessionExercises.update(sessionExerciseId, { repMin, repMax })
  await syncPlannedSets(sessionExerciseId)
  if (permanent) {
    const s = await db.sessions.get(se.sessionId)
    if (s?.planDayId) await db.planExercises.where('planDayId').equals(s.planDayId).filter((p) => p.exerciseId === se.exerciseId).modify({ repMin, repMax })
  }
}

/** Gewicht der Übung überschreiben (Anpassung überschreiben). */
export async function setExerciseWeight(sessionExerciseId: number, weight: number | null) {
  const se = await db.sessionExercises.get(sessionExerciseId)
  if (!se) return
  const note: AdjustmentNote = { kind: 'manuell', field: 'weight', before: se.weight, after: weight, title: 'Von Dir geändert', reason: 'Gewicht von Dir überschrieben.' }
  await db.sessionExercises.update(sessionExerciseId, { weight, weightIsEstimate: false, adjustments: [...se.adjustments.filter((a) => !(a.kind === 'manuell' && a.field === 'weight')), note] })
  const open = await db.sets.where('sessionExerciseId').equals(sessionExerciseId).filter((x) => !x.done).toArray()
  for (const o of open) await db.sets.update(o.id!, { weight })
}

/** Darf in diese Einheit noch eine Übung? (Krafteinheiten: höchstens 7) */
export async function canAddExercise(sessionId: number): Promise<boolean> {
  const s = await db.sessions.get(sessionId)
  if (!s || s.kind !== 'kraft') return true
  return (await db.sessionExercises.where('sessionId').equals(sessionId).count()) < PROGRESSION_CONFIG.planning.maxExercises
}

export async function addExerciseToSession(sessionId: number, exerciseId: string, opts: { ignoreLimit?: boolean } = {}) {
  const s = await db.sessions.get(sessionId)
  if (!s) return
  if (!opts.ignoreLimit && !(await canAddExercise(sessionId))) throw new TooManyExercisesError()
  const count = await db.sessionExercises.where('sessionId').equals(sessionId).count()
  const ex = getExercise(exerciseId)
  const mobility = ex?.art === 'mobility'
  const profile = await db.profile.get('me')
  // Kraftübungen bekommen die Vorgaben ihrer Rolle (Sätze, Wiederholungen, RIR, Pause)
  const rp = ex && !mobility ? prescriptionForRole(ex, profile?.experience ?? 'fortgeschritten', !!profile?.focus.includes(ex.primaer)) : null
  const base = { exerciseId, sets: rp?.sets ?? 3, repMin: rp?.repMin ?? 8, repMax: rp?.repMax ?? 12, targetRir: rp?.targetRir ?? (mobility ? 0 : 2) }
  const p = await prescribeExercise(base, s.date, s.kind === 'kraft' ? s.weekType : 'normal', s.checkin, { role: rp?.role })
  const id = (await db.sessionExercises.add({
    sessionId,
    exerciseId,
    order: count,
    sets: p.sets,
    repMin: p.repMin,
    repMax: p.repMax,
    targetRir: p.targetRir,
    restSec: mobility ? 15 : (rp?.restSec ?? 120),
    weight: p.weight,
    weightIsEstimate: p.isEstimate,
    adjustments: p.notes,
    superset: s.kind === 'mobility',
    role: rp?.role,
    targetReps: p.targetReps,
  })) as number
  if (s.status === 'laeuft') await syncPlannedSets(id)
}

export async function removeExerciseFromSession(sessionExerciseId: number) {
  await db.sets.where('sessionExerciseId').equals(sessionExerciseId).delete()
  await db.sessionExercises.delete(sessionExerciseId)
}

// ---------------------------------------------------------------------------
// Übung tauschen

export type SwapScope = 'heute' | 'dauerhaft'

export async function swapExercise(sessionExerciseId: number, newExerciseId: string, scope: SwapScope) {
  const se = await db.sessionExercises.get(sessionExerciseId)
  const s = se ? await db.sessions.get(se.sessionId) : undefined
  if (!se || !s) return
  const ex = getExercise(newExerciseId)
  const mobility = ex?.art === 'mobility'
  // Andere Rolle (z. B. Isolation statt Grundübung) → deren Bereich und Pause; sonst bleibt der bisherige Bereich
  const newRole = ex && !mobility ? roleOf(ex) : undefined
  const roleChanged = !!newRole && newRole !== se.role
  const profile = await db.profile.get('me')
  const rp = ex && roleChanged ? prescriptionForRole(ex, profile?.experience ?? 'fortgeschritten', false, newRole) : null
  const range = mobility && ex?.einheit === 'sekunden' ? { repMin: 30, repMax: 45 } : rp ? { repMin: rp.repMin, repMax: rp.repMax } : { repMin: se.repMin, repMax: se.repMax }
  const pe = { exerciseId: newExerciseId, sets: baseSets(se), ...range, targetRir: rp?.targetRir ?? se.targetRir }
  const p = await prescribeExercise(pe, s.date, s.kind === 'kraft' ? s.weekType : 'normal', s.checkin, { role: newRole })
  const note: AdjustmentNote = {
    kind: 'tausch',
    field: 'weight',
    before: null,
    after: p.weight,
    title: scope === 'heute' ? 'Nur heute getauscht' : 'Dauerhaft getauscht',
    reason: `Ersetzt „${getExercise(se.exerciseId)?.name ?? se.exerciseId}“.`,
  }
  // Nur offene Sätze verwerfen – erledigte Sätze bleiben beim alten Verlauf
  await db.sets.where('sessionExerciseId').equals(sessionExerciseId).filter((x) => !x.done).delete()
  const doneCount = await db.sets.where('sessionExerciseId').equals(sessionExerciseId).count()
  if (doneCount > 0) {
    // Tausch mitten in der Übung: erledigte Sätze bleiben bei der alten Übung, die neue nimmt ihren Platz ein
    await db.sessionExercises.update(sessionExerciseId, { sets: doneCount })
    await addExerciseToSession(s.id!, newExerciseId, { ignoreLimit: true })
  } else {
    await db.sessionExercises.update(sessionExerciseId, {
      exerciseId: newExerciseId,
      swappedFrom: se.swappedFrom ?? se.exerciseId,
      sets: p.sets,
      repMin: p.repMin,
      repMax: p.repMax,
      targetRir: p.targetRir,
      weight: p.weight,
      weightIsEstimate: p.isEstimate,
      adjustments: [...p.notes, note],
      role: newRole,
      targetReps: p.targetReps,
      ...(rp ? { restSec: rp.restSec } : {}),
    })
    if (s.status === 'laeuft') await syncPlannedSets(sessionExerciseId)
  }
  // Anpassungsprotokoll: Tausch sofort festhalten
  await db.adjustments.add({
    date: today(),
    sessionId: s.id,
    exerciseId: newExerciseId,
    kind: 'tausch',
    field: 'uebung',
    before: null,
    after: null,
    title: scope === 'heute' ? 'Übung getauscht (nur heute)' : 'Übung dauerhaft ersetzt',
    reason: `${getExercise(se.exerciseId)?.name ?? se.exerciseId} → ${ex?.name ?? newExerciseId}${scope === 'dauerhaft' ? ' – im Plan ersetzt' : ''}`,
  })
  if (scope === 'dauerhaft' && s.planId) {
    // Im Plan steht noch die ursprüngliche Übung bzw. die Grundvariante (falls heute eine Variante dran war)
    const inPlan = se.swappedFrom ?? se.exerciseId
    // Grundvariante im Plan: dauerhaft ersetzt wird sie in allen Einheiten des Plans
    const basePlanExercise = se.planExerciseId ? (await db.planExercises.get(se.planExerciseId))?.exerciseId : undefined
    const days = await db.planDays.where('planId').equals(s.planId).toArray()
    const replaced = new Set<number>()
    for (const d of days) {
      const list = await db.planExercises.where('planDayId').equals(d.id!).toArray()
      for (const pe of list) {
        const hit = pe.id === se.planExerciseId || pe.exerciseId === inPlan || (!!basePlanExercise && pe.exerciseId === basePlanExercise)
        if (!hit) continue
        const others = list.filter((x) => x.id !== pe.id).map((x) => x.exerciseId)
        const variants = await variantsForPlan(newExerciseId, others, !!pe.anchor)
        await db.planExercises.update(pe.id!, { exerciseId: newExerciseId, variants, role: newRole, ...range, ...(rp ? { restSec: rp.restSec, targetRir: rp.targetRir } : {}) })
        replaced.add(pe.id!)
      }
    }
    // Bereits angelegte, noch nicht begonnene Einheiten ebenfalls umstellen
    const future = await db.sessions.filter((x) => x.planId === s.planId && x.status === 'geplant' && x.id !== s.id && x.date >= today()).toArray()
    for (const f of future) await db.sessionExercises.where('sessionId').equals(f.id!).filter((x) => (x.planExerciseId !== undefined && replaced.has(x.planExerciseId)) || x.exerciseId === inPlan).modify({ exerciseId: newExerciseId, role: newRole })
  }
}

/**
 * Übung im Plan fixieren (wird nicht mehr automatisch variiert) bzw. wieder freigeben.
 * Beim Fixieren gilt die gerade angezeigte Variante als feste Übung.
 */
export async function setExercisePinned(planExerciseId: number, pinned: boolean, currentExerciseId?: string) {
  const pe = await db.planExercises.get(planExerciseId)
  if (!pe) return
  const keep = currentExerciseId ?? pe.exerciseId
  const variants = [keep, ...(pe.variants ?? [pe.exerciseId]).filter((x) => x !== keep)]
  await db.planExercises.update(planExerciseId, pinned ? { exerciseId: keep, variants, pinned: true } : { pinned: false })
  await db.adjustments.add({
    date: today(),
    exerciseId: keep,
    kind: 'manuell',
    field: 'uebung',
    before: null,
    after: null,
    title: pinned ? 'Übung fixiert' : 'Fixierung aufgehoben',
    reason: pinned ? `„${getExercise(keep)?.name ?? keep}“ bleibt fest im Plan und wird nicht mehr automatisch variiert.` : `„${getExercise(keep)?.name ?? keep}“ wechselt wieder mit ${(variants.length - 1) || 'keinen'} Variante${variants.length === 2 ? '' : 'n'} ab.`,
  })
  // noch nicht begonnene Einheiten dieser Übung neu anlegen lassen
  const future = await db.sessionExercises.filter((x) => x.planExerciseId === planExerciseId).toArray()
  for (const se of future) {
    const s = await db.sessions.get(se.sessionId)
    if (s && s.status === 'geplant' && s.date > today()) {
      await db.sessionExercises.where('sessionId').equals(s.id!).delete()
      await db.sessions.delete(s.id!)
    }
  }
}

// ---------------------------------------------------------------------------
// Abschluss

export interface FinishSummary {
  sessionId: number
  movedKg: number
  minutes: number
  sets: number
  strength: { exerciseId: string; before: number | null; after: number; record: boolean; history: { date: ISODate; e1rm: number }[] }[]
  muscles: string[]
}

export async function finishSession(sessionId: number): Promise<void> {
  const s = await db.sessions.get(sessionId)
  if (!s) return
  const list = await db.sessionExercises.where('sessionId').equals(sessionId).toArray()
  await db.transaction('rw', [db.sessions, db.sets, db.strength, db.adjustments, db.sessionExercises], async () => {
    // offene Sätze verwerfen
    await db.sets.where('sessionId').equals(sessionId).filter((x) => !x.done).delete()
    // Wochentyp-Anpassungen betreffen alle Übungen gleich → nur einmal je Einheit protokollieren
    const weekNotes = new Map<string, AdjustmentNote>()
    for (const se of list) for (const n of se.adjustments) if (n.kind === 'wochentyp') weekNotes.set(`${n.field}|${n.reason}`, n)
    for (const n of weekNotes.values()) await db.adjustments.add({ ...n, before: null, after: null, reason: `${s.name}: ${n.reason}`, date: s.date, sessionId })
    for (const se of list) {
      const sets = await db.sets.where('sessionExerciseId').equals(se.id!).toArray()
      const v = sessionE1rm(sets)
      if (v) {
        await db.strength.where('[exerciseId+date]').equals([se.exerciseId, s.date]).filter((p) => p.source === 'app').delete()
        await db.strength.add({ exerciseId: se.exerciseId, date: s.date, e1rm: v, source: 'app', sessionId })
      }
      if (sets.length === 0) await db.sessionExercises.delete(se.id!)
      // Anpassungsprotokoll: nur echte Änderungen (Tausch wurde schon beim Tauschen protokolliert)
      for (const n of se.adjustments) {
        if (n.kind === 'tausch' || n.kind === 'wochentyp') continue
        if (n.field === 'weight' && n.before !== null && n.before === n.after) continue
        await db.adjustments.add({ ...n, date: s.date, sessionId, exerciseId: se.exerciseId })
      }
    }
    await db.sessions.update(sessionId, { status: 'fertig', endedAt: Date.now() })
  })
}

export async function finishSummary(sessionId: number): Promise<FinishSummary | null> {
  const s = await db.sessions.get(sessionId)
  if (!s) return null
  const list = await db.sessionExercises.where('sessionId').equals(sessionId).sortBy('order')
  const sets = await db.sets.where('sessionId').equals(sessionId).filter((x) => x.done).toArray()
  const movedKg = sets.reduce((sum, x) => sum + (x.weight ?? 0) * x.reps, 0)
  const strength: FinishSummary['strength'] = []
  const muscles = new Set<string>()
  for (const se of list) {
    const ex = getExercise(se.exerciseId)
    if (ex) {
      muscles.add(ex.primaer)
      ex.sekundaer.forEach((m) => muscles.add(m))
    }
    const all = await db.strength.where('exerciseId').equals(se.exerciseId).sortBy('date')
    const cur = all.filter((p) => p.sessionId === sessionId).at(-1)
    if (!cur) continue
    const before = all.filter((p) => p.date < s.date || (p.date === s.date && p.sessionId !== sessionId))
    const prevBest = before.length ? Math.max(...before.map((p) => p.e1rm)) : 0
    strength.push({
      exerciseId: se.exerciseId,
      before: before.at(-1)?.e1rm ?? null,
      after: cur.e1rm,
      record: before.length > 0 && cur.e1rm > prevBest,
      history: [...before.slice(-6), cur].map((p) => ({ date: p.date, e1rm: p.e1rm })),
    })
  }
  return {
    sessionId,
    movedKg: Math.round(movedKg),
    minutes: s.startedAt && s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) : 0,
    sets: sets.length,
    strength,
    muscles: [...muscles],
  }
}

export async function skipSession(date: ISODate, planDayId: number) {
  const id = await ensureSession(date, planDayId)
  await db.sessions.update(id, { status: 'uebersprungen' })
}

export async function moveSession(date: ISODate, planDayId: number, to: ISODate) {
  const id = await ensureSession(date, planDayId)
  await db.sessions.update(id, { date: to, plannedDate: date })
  await db.sets.where('sessionId').equals(id).modify({ date: to })
}

export async function resetSession(sessionId: number) {
  await db.sets.where('sessionId').equals(sessionId).delete()
  await db.sessions.update(sessionId, { status: 'geplant', startedAt: undefined, checkin: undefined, currentExercise: 0 })
  await recomputeSession(sessionId)
}

export async function deleteSession(sessionId: number) {
  await db.sets.where('sessionId').equals(sessionId).delete()
  await db.sessionExercises.where('sessionId').equals(sessionId).delete()
  await db.sessions.delete(sessionId)
}

/** Nächster Tag mit geplantem Krafttraining ab dem gegebenen Datum. */
export async function nextTrainingDate(from: ISODate): Promise<ISODate | null> {
  const plan = await activePlan(from)
  if (!plan?.id) return null
  const days = await db.planDays.where('planId').equals(plan.id).filter((d) => d.kind === 'kraft').toArray()
  const set = new Set(days.map((d) => d.weekday))
  for (let i = 0; i < 14; i++) {
    const d = addDays(from, i)
    if (d >= plan.startDate && set.has(weekdayIndex(d))) return d
  }
  return null
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n))
}
