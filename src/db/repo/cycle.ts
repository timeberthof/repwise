import { db } from '../db'
import type { ISODate, Plan, WeekType } from '../types'
import { addDays, formatDate, parseISO, today } from '../../logic/dates'
import { autoWeekType, weekIndex } from '../../logic/cycle'
import { WEEK_TYPE_INFO } from '../../logic/progression'
import { recomputeSession } from './sessions'

export interface CycleWeek {
  index: number
  /** 1-basiert innerhalb des Zyklus */
  number: number
  cycle: number
  start: ISODate
  end: ISODate
  kw: number
  auto: WeekType
  type: WeekType
  manual: boolean
  status: 'vergangen' | 'aktuell' | 'kommend'
  planned: number
  done: number
}

/** ISO-Kalenderwoche */
export function isoWeek(date: ISODate): number {
  const d = parseISO(date)
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7)
}

export function weekStartOf(plan: Pick<Plan, 'startDate'>, index: number): ISODate {
  return addDays(plan.startDate, index * 7)
}

/** Wochen eines Zyklus (Nummer 0-basiert) mit automatischem und tatsächlichem Typ. */
export async function cycleWeeks(plan: Plan, cycleNo: number): Promise<CycleWeek[]> {
  const t = today()
  const curIdx = weekIndex(plan, t)
  const days = plan.id ? await db.planDays.where('planId').equals(plan.id).filter((d) => d.kind === 'kraft').toArray() : []
  const out: CycleWeek[] = []
  for (let i = 0; i < plan.cycleWeeks; i++) {
    const index = cycleNo * plan.cycleWeeks + i
    const start = weekStartOf(plan, index)
    const end = addDays(start, 6)
    const auto = autoWeekType(index, plan.cycleWeeks)
    const manual = plan.weekOverrides?.[index]
    const sessions = await db.sessions.where('date').between(start, end, true, true).filter((s) => s.kind === 'kraft').toArray()
    out.push({
      index,
      number: i + 1,
      cycle: cycleNo + 1,
      start,
      end,
      kw: isoWeek(start),
      auto,
      type: manual ?? auto,
      manual: !!manual,
      status: index < curIdx ? 'vergangen' : index === curIdx ? 'aktuell' : 'kommend',
      planned: days.length,
      done: sessions.filter((s) => s.status === 'fertig').length,
    })
  }
  return out
}

/**
 * Wochentyp einer Woche von Hand setzen (oder mit `null` auf automatisch zurücksetzen).
 * Gilt nur für diese Woche – die Rotation läuft danach normal weiter (DECISIONS.md, Frage 14).
 * Noch nicht begonnene Einheiten der Woche werden neu berechnet, die Änderung wird protokolliert.
 */
export async function setWeekOverride(plan: Plan, index: number, type: WeekType | null): Promise<void> {
  if (!plan.id) return
  const auto = autoWeekType(index, plan.cycleWeeks)
  const before = plan.weekOverrides?.[index] ?? auto
  const overrides = { ...(plan.weekOverrides ?? {}) }
  if (type === null || type === auto) delete overrides[index]
  else overrides[index] = type
  const after = overrides[index] ?? auto
  await db.plans.update(plan.id, { weekOverrides: overrides })

  const start = weekStartOf(plan, index)
  const end = addDays(start, 6)
  const sessions = await db.sessions.where('date').between(start, end, true, true).filter((s) => s.planId === plan.id && s.status === 'geplant' && s.kind === 'kraft' && !s.weekTypeManual).toArray()
  for (const s of sessions) {
    await db.sessions.update(s.id!, { weekType: after })
    await recomputeSession(s.id!)
  }

  if (before === after) return
  const week = `Woche ${(index % plan.cycleWeeks) + 1} von ${plan.cycleWeeks} (${formatDate(start)}–${formatDate(end)})`
  let reason = `${week}: ${WEEK_TYPE_INFO[before].label} → ${WEEK_TYPE_INFO[after].label}`
  if (type === null || type === auto) reason += ' – zurück auf automatisch'
  else if (before === 'deload' && after !== 'deload') reason += ' – Deload übersprungen'
  await db.adjustments.add({
    date: today(),
    kind: 'manuell',
    field: 'woche',
    before: null,
    after: null,
    title: type === null || type === auto ? 'Wochentyp zurückgesetzt' : 'Wochentyp geändert',
    reason,
  })
}
