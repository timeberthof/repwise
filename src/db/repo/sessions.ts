import { db } from '../db'
import type { AdjustmentNote, Checkin, ISODate, Plan, PlanDay, PlanExercise, Session, SessionExercise, SetEntry, WeekType } from '../types'
import { getExercise } from '../../data/exercises'
import { prescribe, WEEK_TYPE_INFO, type PrescribeResult } from '../../logic/progression'
import { weekTypeFor } from '../../logic/cycle'
import { addDays, formatDate, today, weekdayIndex } from '../../logic/dates'
import { sessionE1rm } from '../../logic/e1rm'
import { estimateMinutes } from '../../logic/planGenerator'
import { daysBetween, exerciseHistory, lastE1rm, relatedE1rm } from './history'
import { availableWeights, withStep } from './weights'
import { pausedDates } from '../derived'
import { planForDate } from './plan'

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
      const planExercises = await db.planExercises.where('planDayId').equals(d.id!).sortBy('order')
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

/** Sätze für die Zeitschätzung an den Wochentyp anpassen (Deload ≈ halbes Volumen …). */
function adjustForWeek(list: PlanExercise[], type: WeekType) {
  const f = type === 'deload' ? 0.5 : 1
  const d = type === 'overreaching' ? 1 : type === 'intro' ? -1 : 0
  return list.map((e) => ({ ...e, sets: Math.max(1, Math.round(e.sets * f + d)) }))
}

// ---------------------------------------------------------------------------
// Vorgaben je Übung

export async function prescribeExercise(
  pe: Pick<PlanExercise, 'exerciseId' | 'sets' | 'repMin' | 'repMax' | 'targetRir'>,
  date: ISODate,
  weekType: WeekType,
  checkin?: Checkin,
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
  return prescribe({
    exercise: ex,
    repMin: pe.repMin,
    repMax: pe.repMax,
    targetRir: pe.targetRir,
    plannedSets: pe.sets,
    history,
    available,
    weekType,
    checkin,
    daysSinceLast: daysBetween(lastDate, date),
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
  const pes = await db.planExercises.where('planDayId').equals(planDayId).sortBy('order')
  const prescriptions = await Promise.all(pes.map((pe) => prescribeExercise(pe, date, weekType)))
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
      estMinutes: estimateMinutes(pes.map((pe, i) => ({ sets: prescriptions[i].sets, restSec: pe.restSec }))),
    })) as number
    await db.sessionExercises.bulkAdd(
      pes.map((pe, i) => {
        const p = prescriptions[i]
        return {
          sessionId,
          exerciseId: pe.exerciseId,
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
        } as SessionExercise
      }),
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
  for (const se of list) {
    const doneSets = await db.sets.where('sessionExerciseId').equals(se.id!).filter((x) => x.done).count()
    if (doneSets > 0) continue
    const pe = pes.find((p) => p.exerciseId === se.exerciseId)
    const base = { exerciseId: se.exerciseId, sets: pe?.sets ?? baseSets(se), repMin: se.repMin, repMax: se.repMax, targetRir: pe?.targetRir ?? 2 }
    const p = await prescribeExercise(base, s.date, s.kind === 'kraft' ? s.weekType : 'normal', s.checkin)
    const manual = se.adjustments.filter((a) => a.kind === 'manuell' || a.kind === 'tausch')
    // Von Hand überschriebene Werte bleiben erhalten
    const keepWeight = manual.some((a) => a.kind === 'manuell' && a.field === 'weight')
    const keepSets = manual.some((a) => a.kind === 'manuell' && a.field === 'sets')
    await db.sessionExercises.update(se.id!, {
      sets: keepSets ? se.sets : p.sets,
      targetRir: p.targetRir,
      weight: keepWeight ? se.weight : p.weight,
      weightIsEstimate: keepWeight ? false : p.isEstimate,
      adjustments: [...p.notes.filter((n) => !(keepWeight && n.field === 'weight') && !(keepSets && n.field === 'sets')), ...manual],
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
  const reps = (i: number) => clamp(lastReps[i] ?? se.repMin, se.repMin, se.repMax)
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
export async function setExerciseSets(sessionExerciseId: number, sets: number) {
  const se = await db.sessionExercises.get(sessionExerciseId)
  if (!se) return
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

export async function addExerciseToSession(sessionId: number, exerciseId: string) {
  const s = await db.sessions.get(sessionId)
  if (!s) return
  const count = await db.sessionExercises.where('sessionId').equals(sessionId).count()
  const ex = getExercise(exerciseId)
  const mobility = ex?.art === 'mobility'
  const base = { exerciseId, sets: 3, repMin: mobility ? 8 : 8, repMax: mobility ? 12 : 12, targetRir: mobility ? 0 : 2 }
  const p = await prescribeExercise(base, s.date, s.kind === 'kraft' ? s.weekType : 'normal', s.checkin)
  const id = (await db.sessionExercises.add({
    sessionId,
    exerciseId,
    order: count,
    sets: p.sets,
    repMin: p.repMin,
    repMax: p.repMax,
    targetRir: p.targetRir,
    restSec: mobility ? 15 : 120,
    weight: p.weight,
    weightIsEstimate: p.isEstimate,
    adjustments: p.notes,
    superset: s.kind === 'mobility',
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
  const range = mobility && ex?.einheit === 'sekunden' ? { repMin: 30, repMax: 45 } : { repMin: se.repMin, repMax: se.repMax }
  const pe = { exerciseId: newExerciseId, sets: baseSets(se), ...range, targetRir: se.targetRir }
  const p = await prescribeExercise(pe, s.date, s.kind === 'kraft' ? s.weekType : 'normal', s.checkin)
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
    await db.sessionExercises.update(sessionExerciseId, { sets: doneCount })
    await addExerciseToSession(s.id!, newExerciseId)
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
    // Im Plan steht noch die ursprüngliche Übung (falls heute schon einmal getauscht wurde)
    const inPlan = se.swappedFrom ?? se.exerciseId
    const days = await db.planDays.where('planId').equals(s.planId).toArray()
    for (const d of days) await db.planExercises.where('planDayId').equals(d.id!).filter((x) => x.exerciseId === inPlan).modify({ exerciseId: newExerciseId, ...range })
    // Bereits angelegte, noch nicht begonnene Einheiten ebenfalls umstellen
    const future = await db.sessions.filter((x) => x.planId === s.planId && x.status === 'geplant' && x.id !== s.id && x.date >= today()).toArray()
    for (const f of future) await db.sessionExercises.where('sessionId').equals(f.id!).filter((x) => x.exerciseId === inPlan).modify({ exerciseId: newExerciseId })
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
