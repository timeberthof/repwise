/**
 * Erzeugt einen Trainingsplan aus den Onboarding-Antworten.
 *
 * Ablauf: Split → Tagesvorlagen (höchstens 7 Übungen, Anker zuerst) → Übungsauswahl nach Equipment,
 * Schwerpunkten, Ausschlüssen und Schmerzen → Ausgleich des Wochenvolumens (planBalance.ts) →
 * Zeitlimit → Varianten für die Rotation (variants.ts). Regeln und Schwellen: progression.ts → planning/roles.
 */
import type { EquipmentId, Exercise, ExerciseRole, Experience, MovementPattern, MuscleId, Pain, SplitId, TrainingLocation } from '../db/types'
import { isAvailable } from '../data/exercises'
import { PAIN_REGIONS } from '../data/muskeln'
import { PROGRESSION_CONFIG } from './progression'
import { roleOf, setRange } from './roles'
import { allowedExercises, possibleGroups, preferredRolesFor, scoreExercise, sortByScore, type SelectionInput } from './selection'
import { balanceWeek, daySets, draftFor, sortDay, volumeOf, type DraftDay, type DraftExercise } from './planBalance'
import { variantsFor } from './variants'
import { groupLabel, groupStatus, primaryGroup, ratios, VOLUME_GROUPS, fmtSets, type VolumeGroup, type WeekVolume, type Ratios } from './volume'

export interface PlanInput {
  split: SplitId
  weekdays: number[]
  sessionMinutes: number
  experience: Experience
  focus: MuscleId[]
  equipment: EquipmentId[]
  excluded: string[]
  pains: Pain[]
  location: TrainingLocation
  mobility: boolean
  /** Übungen mit vorhandenem Verlauf werden bevorzugt (Startwerte bleiben nutzbar). */
  preferred: string[]
  /** Übungen, die möglichst durch eine Variante ersetzt werden sollen (z. B. Stagnation) */
  avoid?: string[]
  library: Exercise[]
}

export interface GeneratedExercise {
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  targetRir: number
  restSec: number
  superset?: boolean
  role?: ExerciseRole
  anchor?: boolean
  variants?: string[]
  pinned?: boolean
}

export interface GeneratedDay {
  weekday: number
  name: string
  kind: 'kraft' | 'mobility'
  location: TrainingLocation
  exercises: GeneratedExercise[]
}

interface Slot {
  muscles: MuscleId[]
  patterns?: MovementPattern[]
  /** Ankerplatz: schwere Grundübung, bleibt im Zyklus gleich */
  anchor?: boolean
  /** Bevorzugte Rollen (in dieser Reihenfolge) */
  roles?: ExerciseRole[]
}

const SHOULDER: MuscleId[] = ['vordere_schulter', 'mittlere_schulter']
const HINGE_MUSCLES: MuscleId[] = ['beinbeuger', 'gesaess', 'unterer_ruecken']
const ABS: MovementPattern[] = ['rumpfbeuge', 'rotation']

/**
 * Tagesvorlagen je Split. Die ersten 7 Plätze sind die Einheit; weitere Plätze springen ein, wenn ein Platz
 * keine erlaubte Übung hat (z. B. Waden bei Schmerzen im Sprunggelenk). `groups` = Muskelgruppen, die der
 * Ausgleich an diesem Tag ergänzen darf.
 */
export const DAY_TEMPLATES: Record<string, { name: string; groups: VolumeGroup[]; slots: Slot[] }> = {
  // Push | Pull wie im Original: drückende Übungen inkl. kniedominanter Beine, ziehende inkl. Hüftstrecker
  push: {
    name: 'Push',
    groups: ['brust', 'vordere_schulter', 'seitliche_schulter', 'trizeps', 'quadrizeps', 'waden', 'bauch'],
    slots: [
      { muscles: ['brust'], patterns: ['horizontal_druecken'], anchor: true },
      { muscles: SHOULDER, patterns: ['vertikal_druecken'], anchor: true },
      { muscles: ['quadrizeps'], patterns: ['kniebeuge', 'ausfallschritt'], roles: ['ergaenzung', 'grund'] },
      { muscles: ['brust'], patterns: ['brust_isolation', 'horizontal_druecken'], roles: ['isolation', 'ergaenzung'] },
      { muscles: ['mittlere_schulter'], patterns: ['seitheben'] },
      { muscles: ['trizeps'], patterns: ['trizeps_streckung'] },
      { muscles: ['waden'], patterns: ['wadenheben'] },
      { muscles: ['quadrizeps'], patterns: ['beinstrecken'] },
      { muscles: ['trizeps'], patterns: ['vertikal_druecken', 'horizontal_druecken'] },
    ],
  },
  pull: {
    name: 'Pull',
    groups: ['ruecken', 'hintere_schulter', 'bizeps', 'beinbeuger', 'gesaess', 'bauch'],
    slots: [
      { muscles: ['ruecken'], patterns: ['vertikal_ziehen'], anchor: true },
      { muscles: ['ruecken'], patterns: ['horizontal_ziehen'], anchor: true },
      { muscles: HINGE_MUSCLES, patterns: ['hueftstreckung'], roles: ['ergaenzung', 'grund'] },
      { muscles: ['beinbeuger'], patterns: ['beinbeugen'] },
      { muscles: ['bizeps'], patterns: ['bizeps_curl'] },
      { muscles: ['hintere_schulter'], patterns: ['reverse_fly'] },
      { muscles: ['bauch'], patterns: ABS },
      { muscles: ['gesaess'], patterns: ['glute_bruecke'] },
    ],
  },
  ppl_push: {
    name: 'Push',
    groups: ['brust', 'vordere_schulter', 'seitliche_schulter', 'trizeps', 'bauch'],
    slots: [
      { muscles: ['brust'], patterns: ['horizontal_druecken'], anchor: true },
      { muscles: SHOULDER, patterns: ['vertikal_druecken'], anchor: true },
      { muscles: ['brust'], patterns: ['horizontal_druecken'], roles: ['ergaenzung'] },
      { muscles: ['brust'], patterns: ['brust_isolation'] },
      { muscles: ['mittlere_schulter'], patterns: ['seitheben'] },
      { muscles: ['trizeps'], patterns: ['trizeps_streckung'] },
      { muscles: ['trizeps'], patterns: ['trizeps_streckung', 'vertikal_druecken'] },
    ],
  },
  ppl_pull: {
    name: 'Pull',
    groups: ['ruecken', 'hintere_schulter', 'bizeps', 'bauch'],
    slots: [
      { muscles: ['ruecken'], patterns: ['vertikal_ziehen'], anchor: true },
      { muscles: ['ruecken'], patterns: ['horizontal_ziehen'], anchor: true },
      { muscles: ['ruecken'], patterns: ['horizontal_ziehen', 'vertikal_ziehen'], roles: ['ergaenzung'] },
      { muscles: ['hintere_schulter'], patterns: ['reverse_fly'] },
      { muscles: ['bizeps'], patterns: ['bizeps_curl'] },
      { muscles: ['bizeps'], patterns: ['bizeps_curl'] },
      { muscles: ['bauch'], patterns: ABS },
    ],
  },
  ppl_legs: {
    name: 'Legs',
    groups: ['quadrizeps', 'beinbeuger', 'gesaess', 'waden', 'bauch'],
    slots: [
      { muscles: ['quadrizeps'], patterns: ['kniebeuge'], anchor: true },
      { muscles: HINGE_MUSCLES, patterns: ['hueftstreckung'], anchor: true },
      { muscles: ['quadrizeps'], patterns: ['kniebeuge', 'ausfallschritt'], roles: ['ergaenzung'] },
      { muscles: ['beinbeuger'], patterns: ['beinbeugen'] },
      { muscles: ['gesaess'], patterns: ['glute_bruecke'] },
      { muscles: ['waden'], patterns: ['wadenheben'] },
      { muscles: ['bauch'], patterns: ABS },
      { muscles: ['quadrizeps'], patterns: ['beinstrecken'] },
    ],
  },
  upper: {
    name: 'Upper',
    groups: ['brust', 'ruecken', 'vordere_schulter', 'seitliche_schulter', 'hintere_schulter', 'bizeps', 'trizeps', 'bauch'],
    slots: [
      { muscles: ['brust'], patterns: ['horizontal_druecken'], anchor: true },
      { muscles: ['ruecken'], patterns: ['horizontal_ziehen'], anchor: true },
      { muscles: SHOULDER, patterns: ['vertikal_druecken'] },
      { muscles: ['ruecken'], patterns: ['vertikal_ziehen'] },
      { muscles: ['mittlere_schulter'], patterns: ['seitheben'] },
      { muscles: ['bizeps'], patterns: ['bizeps_curl'] },
      { muscles: ['trizeps'], patterns: ['trizeps_streckung'] },
      { muscles: ['hintere_schulter'], patterns: ['reverse_fly'] },
    ],
  },
  lower: {
    name: 'Lower',
    groups: ['quadrizeps', 'beinbeuger', 'gesaess', 'waden', 'bauch'],
    slots: [
      { muscles: ['quadrizeps'], patterns: ['kniebeuge'], anchor: true },
      { muscles: HINGE_MUSCLES, patterns: ['hueftstreckung'], anchor: true },
      { muscles: ['quadrizeps'], patterns: ['kniebeuge', 'ausfallschritt'], roles: ['ergaenzung'] },
      { muscles: ['beinbeuger'], patterns: ['beinbeugen'] },
      { muscles: ['gesaess'], patterns: ['glute_bruecke'] },
      { muscles: ['waden'], patterns: ['wadenheben'] },
      { muscles: ['bauch'], patterns: ABS },
      { muscles: ['quadrizeps'], patterns: ['beinstrecken'] },
    ],
  },
  full_a: {
    name: 'Ganzkörper A',
    groups: VOLUME_GROUPS.map((g) => g.id),
    slots: [
      { muscles: ['quadrizeps'], patterns: ['kniebeuge'], anchor: true },
      { muscles: ['brust'], patterns: ['horizontal_druecken'], anchor: true },
      { muscles: ['ruecken'], patterns: ['vertikal_ziehen'] },
      { muscles: HINGE_MUSCLES, patterns: ['hueftstreckung'] },
      { muscles: ['mittlere_schulter'], patterns: ['seitheben'] },
      { muscles: ['trizeps'], patterns: ['trizeps_streckung'] },
      { muscles: ['bauch'], patterns: ABS },
      { muscles: ['waden'], patterns: ['wadenheben'] },
    ],
  },
  full_b: {
    name: 'Ganzkörper B',
    groups: VOLUME_GROUPS.map((g) => g.id),
    slots: [
      { muscles: ['ruecken'], patterns: ['horizontal_ziehen'], anchor: true },
      { muscles: SHOULDER, patterns: ['vertikal_druecken'], anchor: true },
      { muscles: ['quadrizeps'], patterns: ['kniebeuge', 'ausfallschritt'], roles: ['ergaenzung'] },
      { muscles: ['beinbeuger'], patterns: ['beinbeugen'] },
      { muscles: ['hintere_schulter'], patterns: ['reverse_fly'] },
      { muscles: ['bizeps'], patterns: ['bizeps_curl'] },
      { muscles: ['waden'], patterns: ['wadenheben'] },
      { muscles: ['bauch'], patterns: ABS },
    ],
  },
}

export const SPLITS: { id: SplitId; label: string; text: string; cycle: string[] }[] = [
  { id: 'upper_lower', label: 'Upper | Lower', text: 'Abwechselnd Oberkörper und Unterkörper – jede Muskelgruppe zweimal pro Woche.', cycle: ['upper', 'lower'] },
  { id: 'push_pull_legs', label: 'Push | Pull | Legs', text: 'Drücken, Ziehen und Beine an getrennten Tagen – viel Volumen pro Einheit.', cycle: ['ppl_push', 'ppl_pull', 'ppl_legs'] },
  { id: 'push_pull', label: 'Push | Pull', text: 'Hier machst Du an einem Tag alle drückenden und an einem anderen Tag alle ziehenden Übungen.', cycle: ['push', 'pull'] },
  { id: 'ganzkoerper', label: 'Ganzkörper', text: 'Jede Einheit trainiert den ganzen Körper – ideal bei wenigen Trainingstagen.', cycle: ['full_a', 'full_b'] },
]

/** Empfohlene Splits je Anzahl Trainingstage (Hervorhebung „EMPFOHLEN“). */
export function recommendedSplits(days: number): SplitId[] {
  if (days <= 2) return ['ganzkoerper']
  if (days === 3) return ['ganzkoerper', 'push_pull_legs']
  if (days === 4) return ['upper_lower', 'push_pull']
  if (days === 5) return ['push_pull_legs', 'upper_lower']
  return ['upper_lower', 'push_pull_legs', 'push_pull']
}

/** Empfohlene Trainingshäufigkeit je Erfahrung. */
export function recommendedDays(exp: Experience): number[] {
  if (exp === 'anfaenger') return [2, 3]
  if (exp === 'fortgeschritten') return [3, 4, 6]
  return [4, 5, 6]
}

/** Empfohlene Dauer (Minuten) je Erfahrung. */
export function recommendedDuration(exp: Experience): [number, number] {
  if (exp === 'anfaenger') return [45, 60]
  if (exp === 'fortgeschritten') return [60, 90]
  return [75, 120]
}

/** Standard-Wochentage für n Trainings (0 = Mo). */
export function defaultWeekdays(n: number): number[] {
  const map: Record<number, number[]> = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  }
  return map[Math.min(7, Math.max(1, n))]
}

/** Vorlagen-Schlüssel je Trainingstag. */
export function dayKeysFor(split: SplitId, weekdays: number[]): Record<number, string> {
  const cycle = SPLITS.find((s) => s.id === split)!.cycle
  const out: Record<number, string> = {}
  ;[...weekdays].sort((a, b) => a - b).forEach((wd, i) => (out[wd] = cycle[i % cycle.length]))
  return out
}

/** Namen der Einheiten je Wochentag (für die Wochenplanung). */
export function dayNamesFor(split: SplitId, weekdays: number[]): Record<number, string> {
  const keys = dayKeysFor(split, weekdays)
  return Object.fromEntries(Object.entries(keys).map(([wd, k]) => [wd, DAY_TEMPLATES[k].name]))
}

/** Erlaubte Muskelgruppen eines Plantags (nach Name im Split) – für Migration und Ausgleich. */
export function groupsForDay(split: SplitId, name: string): VolumeGroup[] {
  const cycle = SPLITS.find((s) => s.id === split)?.cycle ?? []
  const key = cycle.find((k) => DAY_TEMPLATES[k].name === name)
  return key ? DAY_TEMPLATES[key].groups : VOLUME_GROUPS.map((g) => g.id)
}

/** Geschätzte Dauer einer Einheit in Minuten (Arbeit + Pausen + Aufwärmen). */
export function estimateMinutes(list: { sets: number; restSec: number }[]): number {
  const sec = list.reduce((sum, e) => sum + e.sets * (e.restSec + 45), 0)
  return Math.round(sec / 60 + (list.length ? 4 : 0))
}

function selection(input: PlanInput): SelectionInput {
  return { equipment: input.equipment, excluded: input.excluded, pains: input.pains, location: input.location, experience: input.experience, preferred: input.preferred, avoid: input.avoid, library: input.library }
}

/** Kandidaten für einen Platz, bestbewertete zuerst. */
function slotCandidates(slot: Slot, pool: Exercise[], sel: SelectionInput, used: Set<string>): Exercise[] {
  const fits = pool.filter((e) => slot.muscles.includes(e.primaer) && (!slot.patterns || slot.patterns.includes(e.muster)) && !used.has(e.id))
  const roles = slot.anchor ? (['grund', 'ergaenzung'] as ExerciseRole[]) : slot.roles
  const byRole = roles ? fits.filter((e) => roles.includes(roleOf(e))) : fits
  return sortByScore(byRole.length ? byRole : fits, sel, roles)
}

function buildDay(key: string, weekday: number, pool: Exercise[], input: PlanInput, sel: SelectionInput): DraftDay {
  const P = PROGRESSION_CONFIG.planning
  const tpl = DAY_TEMPLATES[key]
  const used = new Set<string>()
  const exercises: DraftExercise[] = []
  let anchors = 0
  for (const slot of tpl.slots) {
    if (exercises.length >= P.maxExercises) break
    const pick = slotCandidates(slot, pool, sel, used)[0]
    if (!pick) continue
    const anchor = !!slot.anchor && anchors < P.maxAnchors && roleOf(pick) !== 'isolation'
    if (anchor) anchors++
    used.add(pick.id)
    exercises.push(draftFor(pick, input, { anchor }))
  }
  return { name: tpl.name, weekday, groups: tpl.groups, exercises }
}

function balanceContext(pool: Exercise[], input: PlanInput, sel: SelectionInput, log: string[]) {
  const byId = new Map(input.library.map((e) => [e.id, e]))
  return {
    lookup: (id: string) => byId.get(id),
    pick: (g: VolumeGroup, day: DraftDay) => {
      const inDay = new Set(day.exercises.map((e) => e.exerciseId))
      const roles = preferredRolesFor(g)
      // sauber zielende Übungen zuerst (wenige Nebenmuskeln)
      const score = (e: Exercise) => scoreExercise(e, sel, roles) - e.sekundaer.length * 4
      return pool
        .filter((e) => primaryGroup(e) === g && !inDay.has(e.id))
        .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0]
    },
    experience: input.experience,
    focus: input.focus,
    possible: possibleGroups(pool),
    log,
  }
}

/** Zeitlimit: zu lange Einheiten verlieren Sätze bei Isolationsübungen (nicht unter 14 Sätze). */
function fitTime(week: DraftDay[], minutes: number, ctx: ReturnType<typeof balanceContext>) {
  const P = PROGRESSION_CONFIG.planning
  for (const d of week) {
    for (let guard = 0; guard < 40 && estimateMinutes(d.exercises) > minutes && daySets(d) > P.minSessionSets; guard++) {
      const v = volumeOf(week, ctx)
      const g = (e: DraftExercise) => {
        const ex = ctx.lookup(e.exerciseId)
        const pg = ex ? primaryGroup(ex) : null
        return pg ? v[pg].sets : 99
      }
      const victim = d.exercises.filter((e) => e.sets > setRange(e.role)[0]).sort((a, b) => Number(b.role === 'isolation') - Number(a.role === 'isolation') || g(b) - g(a))[0]
      if (!victim) break
      victim.sets--
    }
  }
}

function attachVariants(week: DraftDay[], pool: Exercise[], sel: SelectionInput, lookup: (id: string) => Exercise | undefined) {
  for (const d of week) {
    const ids = d.exercises.map((e) => e.exerciseId)
    for (const e of d.exercises) {
      const ex = lookup(e.exerciseId)
      e.variants = !ex || e.anchor ? [e.exerciseId] : variantsFor(ex, pool, sel, ids.filter((x) => x !== e.exerciseId))
    }
  }
}

function toGenerated(d: DraftDay, location: TrainingLocation): GeneratedDay {
  return {
    weekday: d.weekday,
    name: d.name,
    kind: 'kraft',
    location,
    exercises: d.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      sets: e.sets,
      repMin: e.repMin,
      repMax: e.repMax,
      targetRir: e.targetRir,
      restSec: e.restSec,
      role: e.role,
      anchor: !!e.anchor,
      variants: e.variants,
      ...(e.pinned ? { pinned: true } : {}),
    })),
  }
}

// ---------------------------------------------------------------------------
// Bericht: Wochenvolumen, Probleme, Vorschlag

export interface PlanReport {
  volume: WeekVolume
  ratios: Ratios
  /** Gruppen ohne erlaubte Übung (Equipment, Schmerzen, Ausschlüsse) */
  impossible: VolumeGroup[]
  problems: string[]
  /** Weiche Hinweise (Verhältnisse) – kein Grund für einen anderen Split */
  hints: string[]
  ok: boolean
  /** Änderungen durch den Ausgleich bzw. die Migration */
  log: string[]
}

export function reportFor(days: { kind: string; exercises: { exerciseId: string; sets: number }[] }[], possible: Set<VolumeGroup>, lookup: (id: string) => Exercise | undefined, log: string[] = []): PlanReport {
  const P = PROGRESSION_CONFIG.planning
  const kraft = days.filter((d) => d.kind === 'kraft')
  const volume = volumeOf(
    kraft.map((d) => ({ name: '', weekday: 0, groups: [], exercises: d.exercises as DraftExercise[] })),
    { lookup },
  )
  const r = ratios(volume)
  const problems: string[] = []
  const impossible = VOLUME_GROUPS.map((g) => g.id).filter((g) => !possible.has(g))
  for (const { id, label } of VOLUME_GROUPS) {
    if (!possible.has(id)) continue
    const st = groupStatus(volume[id], true)
    if (st === 'unter') problems.push(`${label}: ${fmtSets(volume[id].sets)} Sätze pro Woche (Ziel ${P.weeklyMin}–${P.weeklyMax})`)
    if (st === 'ueber') problems.push(`${label}: ${fmtSets(volume[id].sets)} Sätze pro Woche (mehr als ${P.weeklyMax})`)
    if (volume[id].frequency < P.minFrequency) problems.push(`${label}: nur ${volume[id].frequency}× pro Woche trainiert (Ziel ${P.minFrequency}×)`)
  }
  for (const d of kraft) if (d.exercises.length > P.maxExercises) problems.push(`Eine Einheit hat ${d.exercises.length} Übungen (max. ${P.maxExercises})`)
  const hints: string[] = []
  const ratioText = (x: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(x)
  if (r.pushPull !== null && (r.pushPull > P.balance.max || r.pushPull < P.balance.min)) hints.push(`Drücken : Ziehen = ${ratioText(r.pushPull)} : 1 (Ziel etwa 1 : 1)`)
  if (r.quadHam !== null && (r.quadHam > P.balance.max || r.quadHam < P.balance.min)) hints.push(`Quadrizeps : Beinbeuger = ${ratioText(r.quadHam)} : 1 (Ziel etwa 1 : 1)`)
  return { volume, ratios: r, impossible, problems, hints, ok: problems.length === 0, log }
}

export function generatePlanWithReport(input: PlanInput): { days: GeneratedDay[]; report: PlanReport } {
  const sel = selection(input)
  const pool = allowedExercises(sel)
  const keys = dayKeysFor(input.split, input.weekdays)
  const weekdays = [...input.weekdays].sort((a, b) => a - b)
  const week = weekdays.map((wd) => buildDay(keys[wd], wd, pool, input, sel))
  const log: string[] = []
  const ctx = balanceContext(pool, input, sel, log)
  balanceWeek(week, ctx)
  fitTime(week, input.sessionMinutes, ctx)
  for (const d of week) sortDay(d, ctx.lookup)
  attachVariants(week, pool, sel, ctx.lookup)

  const days: GeneratedDay[] = []
  week.forEach((d, i) => {
    days.push(toGenerated(d, input.location))
    if (input.mobility) days.push({ weekday: d.weekday, name: 'Mobility', kind: 'mobility', location: input.location === 'gym' ? 'zuhause' : input.location, exercises: mobilityRoutine(input, i) })
  })
  return { days, report: reportFor(days, ctx.possible, ctx.lookup, log) }
}

/** Ganzer Wochenplan. */
export function generatePlan(input: PlanInput): GeneratedDay[] {
  return generatePlanWithReport(input).days
}

/**
 * Bestehenden Plan an die Regeln anpassen (Migration): eigene Übungen bleiben, wo es geht; Einheiten mit mehr als
 * 7 Übungen werden gekürzt (Anker/Grundübungen bleiben, überversorgte Muskeln zuerst), Vorgaben folgen der Rolle,
 * das Wochenvolumen wird ausgeglichen. Fixierte Übungen bleiben unverändert.
 */
export function rebalancePlan(input: PlanInput, existing: GeneratedDay[]): { days: GeneratedDay[]; report: PlanReport } {
  const sel = selection(input)
  const pool = allowedExercises(sel)
  const log: string[] = []
  const ctx = balanceContext(pool, input, sel, log)
  const P = PROGRESSION_CONFIG.planning
  const kraft = existing.filter((d) => d.kind === 'kraft')
  const week: DraftDay[] = kraft.map((d) => {
    const exercises: DraftExercise[] = []
    let anchors = 0
    for (const e of d.exercises) {
      const ex = ctx.lookup(e.exerciseId)
      if (!ex || ex.art !== 'kraft') continue
      const role = roleOf(ex)
      // Anker: die ersten 1–2 Mehrgelenksübungen der Einheit (wie bisher an erster Stelle geplant)
      const anchor = e.anchor ?? (anchors < P.maxAnchors && role !== 'isolation' && exercises.every((x) => x.role !== 'isolation'))
      if (anchor) anchors++
      const draft = draftFor(ex, input, { anchor, pinned: e.pinned, variants: e.variants })
      exercises.push(draft)
    }
    return { name: d.name, weekday: d.weekday, groups: groupsForDay(input.split, d.name), exercises }
  })
  balanceWeek(week, ctx)
  fitTime(week, input.sessionMinutes, ctx)
  for (const d of week) sortDay(d, ctx.lookup)
  attachVariants(week, pool, sel, ctx.lookup)
  const days: GeneratedDay[] = []
  for (const d of existing) {
    if (d.kind !== 'kraft') {
      days.push(d)
      continue
    }
    const w = week.find((x) => x.weekday === d.weekday && x.name === d.name)
    if (w) days.push(toGenerated(w, d.location))
  }
  return { days, report: reportFor(days, ctx.possible, ctx.lookup, log) }
}

/**
 * Vorschlag, wenn der Split mit höchstens 7 Übungen nicht auf 10–20 Sätze je Muskel und Woche kommt:
 * andere Splits mit gleich vielen Tagen, dann ein bzw. zwei Tage mehr.
 */
export function suggestAlternative(input: PlanInput): { split: SplitId; weekdays: number[]; text: string } | null {
  const n = input.weekdays.length
  for (const days of [n, n + 1, n + 2].filter((d) => d <= 7)) {
    const splits = [...recommendedSplits(days), ...SPLITS.map((s) => s.id)].filter((s, i, a) => a.indexOf(s) === i)
    for (const split of splits) {
      if (days === n && split === input.split) continue
      const weekdays = days === n ? input.weekdays : defaultWeekdays(days)
      const { report } = generatePlanWithReport({ ...input, split, weekdays, mobility: false })
      if (report.ok) {
        const label = SPLITS.find((s) => s.id === split)!.label
        return { split, weekdays, text: days === n ? `${label} mit ${days} Tagen erreicht für alle Muskeln ${PROGRESSION_CONFIG.planning.weeklyMin}–${PROGRESSION_CONFIG.planning.weeklyMax} Sätze.` : `${label} mit ${days} statt ${n} Tagen erreicht für alle Muskeln ${PROGRESSION_CONFIG.planning.weeklyMin}–${PROGRESSION_CONFIG.planning.weeklyMax} Sätze.` }
      }
    }
  }
  return null
}

export { groupLabel }

// ---------------------------------------------------------------------------
// Mobility

/** Kurze Mobility-Einheit (Super-Satz aus 4 Übungen) für Problemzonen und Hüfte. Zählt nicht zu den 7 Übungen. */
export function mobilityRoutine(input: Pick<PlanInput, 'pains' | 'library' | 'excluded' | 'equipment'>, seed = 0): GeneratedExercise[] {
  const regions: MuscleId[] = []
  for (const p of [...input.pains].sort((a, b) => b.level - a.level)) {
    PAIN_REGIONS.find((r) => r.id === p.region)?.mobility.forEach((m) => !regions.includes(m) && regions.push(m))
  }
  for (const m of ['huefte', 'brustwirbelsaeule', 'sprunggelenk', 'schultergelenk'] as MuscleId[]) if (!regions.includes(m)) regions.push(m)
  const pool = input.library.filter((e) => e.art === 'mobility' && !input.excluded.includes(e.id) && isAvailable(e, input.equipment))
  const picks: Exercise[] = []
  // Erste Region doppelt (Hauptproblemzone), danach je eine
  const order = [regions[0], regions[1] ?? regions[0], regions[0], regions[2] ?? 'huefte']
  order.forEach((region, i) => {
    const list = pool.filter((e) => e.primaer === region && !picks.includes(e))
    if (list.length) picks.push(list[(seed + i) % list.length])
  })
  return picks.map((e) => ({ exerciseId: e.id, sets: 3, repMin: e.einheit === 'sekunden' ? 30 : 8, repMax: e.einheit === 'sekunden' ? 45 : 12, targetRir: 0, restSec: 15, superset: true }))
}
