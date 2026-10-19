/**
 * Harte Grenzen pro Einheit und Ausgleich des Wochenvolumens.
 *
 * - höchstens 7 Übungen pro Einheit, 2–4 Arbeitssätze pro Übung, 14–22 Sätze pro Einheit
 * - je Muskelgruppe 10–20 anteilige Sätze pro Woche, mindestens 2× pro Woche
 * - Drücken : Ziehen und Quadrizeps : Beinbeuger etwa 1 : 1
 *
 * Alle Schritte ändern nur innerhalb der Grenzen (Sätze steigen nie über das Wochenmaximum,
 * ersetzte Übungen werden nicht erneut ersetzt) – der Ausgleich endet deshalb immer.
 */
import type { Exercise, ExerciseRole, Experience, MuscleId } from '../db/types'
import { PROGRESSION_CONFIG, type ProgressionConfig } from './progression'
import { contributions, groupLabel, groupOfMuscle, primaryGroup, ratios, weekVolume, PULL_GROUPS, PUSH_GROUPS, VOLUME_GROUPS, type VolumeGroup, type WeekVolume } from './volume'
import { orderRank, prescriptionForRole, roleOf, setRange } from './roles'

export interface DraftExercise {
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  targetRir: number
  restSec: number
  role: ExerciseRole
  anchor?: boolean
  pinned?: boolean
  /** Durch den Ausgleich hinzugefügt oder eingesetzt – wird nicht erneut ersetzt */
  balanced?: boolean
  superset?: boolean
  variants?: string[]
}

export interface DraftDay {
  name: string
  weekday: number
  /** Muskelgruppen, die an diesem Tag trainiert werden dürfen (aus dem Split) */
  groups: VolumeGroup[]
  exercises: DraftExercise[]
}

export interface BalanceContext {
  lookup: (id: string) => Exercise | undefined
  /** Beste neue Übung für eine Gruppe an diesem Tag (nicht schon in der Einheit) */
  pick: (group: VolumeGroup, day: DraftDay) => Exercise | undefined
  experience: Experience
  focus: MuscleId[]
  /** Gruppen, für die es überhaupt eine erlaubte Übung gibt (Equipment, Schmerzen, Ausschlüsse) */
  possible: Set<VolumeGroup>
  cfg?: ProgressionConfig
  /** Protokoll der Änderungen (für das Anpassungsprotokoll) */
  log?: string[]
}

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)
/** Satzgrenzen der Rolle (Grund 3–4, Ergänzung 2–4, Isolation 2–3) */
const lo = (e: { role?: ExerciseRole }) => setRange(e.role)[0]
const hi = (e: { role?: ExerciseRole }) => setRange(e.role)[1]
export const daySets = (d: DraftDay) => sum(d.exercises.map((e) => e.sets))

export function volumeOf(week: DraftDay[], ctx: Pick<BalanceContext, 'lookup' | 'cfg'>): WeekVolume {
  return weekVolume(
    week.map((d) => d.exercises),
    ctx.lookup,
    ctx.cfg ?? PROGRESSION_CONFIG,
  )
}

/** Neue Übung mit den Vorgaben ihrer Rolle. */
export function draftFor(ex: Exercise, ctx: Pick<BalanceContext, 'experience' | 'focus'>, extra: Partial<DraftExercise> = {}): DraftExercise {
  const p = prescriptionForRole(ex, ctx.experience, ctx.focus.includes(ex.primaer))
  return { exerciseId: ex.id, ...p, ...extra }
}

/** Reihenfolge: Grundübungen → Ergänzung → Isolation (Arme, Waden, Bauch, hintere Schulter am Ende). */
export function sortDay(day: DraftDay, lookup: (id: string) => Exercise | undefined) {
  const rank = (e: DraftExercise) => {
    const ex = lookup(e.exerciseId)
    return ex ? orderRank(ex, e.role, e.anchor) : 9
  }
  day.exercises = day.exercises.map((e, i) => ({ e, i })).sort((a, b) => rank(a.e) - rank(b.e) || a.i - b.i).map((x) => x.e)
}

// ---------------------------------------------------------------------------
// Einheit auf höchstens 7 Übungen kürzen

/**
 * Entfernt Übungen, bis die Einheit höchstens `maxExercises` hat: Anker, Grundübungen und fixierte Übungen bleiben;
 * zuerst fallen Übungen für nicht gezählte oder überversorgte Muskeln. Ihre Sätze werden auf die übrigen Übungen verteilt
 * (höchstens 4 je Übung, höchstens 22 je Einheit, keine Gruppe über 20).
 */
export function trimDay(day: DraftDay, week: DraftDay[], ctx: BalanceContext): string[] {
  const cfg = ctx.cfg ?? PROGRESSION_CONFIG
  const P = cfg.planning
  const removed: string[] = []
  while (day.exercises.length > P.maxExercises) {
    const v = volumeOf(week, ctx)
    const score = (e: DraftExercise) => {
      const ex = ctx.lookup(e.exerciseId)
      if (!ex) return 10_000
      const g = primaryGroup(ex)
      let s = e.role === 'isolation' ? 20 : e.role === 'ergaenzung' ? 10 : -500
      if (!g) s += 1000
      else {
        const after = v[g].sets - e.sets
        s += after - P.weeklyMin
        if (v[g].sets > P.weeklyMax) s += 100
      }
      if (e.anchor || e.pinned) s -= 2000
      return s
    }
    const victim = [...day.exercises].sort((a, b) => score(b) - score(a))[0]
    day.exercises = day.exercises.filter((e) => e !== victim)
    removed.push(victim.exerciseId)
    ctx.log?.push(`${day.name}: „${ctx.lookup(victim.exerciseId)?.name ?? victim.exerciseId}“ gestrichen (höchstens ${P.maxExercises} Übungen)`)
    // Sätze umverteilen – bevorzugt auf Übungen unterversorgter Gruppen
    for (let k = 0; k < victim.sets; k++) {
      const vol = volumeOf(week, ctx)
      const target = day.exercises
        .filter((e) => canAddSet(day, e, vol, ctx))
        .sort((a, b) => groupNeed(a, vol, ctx) - groupNeed(b, vol, ctx) || a.sets - b.sets)[0]
      if (!target) break
      target.sets++
    }
  }
  return removed
}

/** Wie weit die Hauptgruppe der Übung noch unter dem Ziel liegt (kleiner = dringender). */
function groupNeed(e: DraftExercise, v: WeekVolume, ctx: BalanceContext): number {
  const ex = ctx.lookup(e.exerciseId)
  const g = ex ? primaryGroup(ex) : null
  return g ? v[g].sets - (ctx.cfg ?? PROGRESSION_CONFIG).planning.weeklyMin : 999
}

function canAddSet(day: DraftDay, e: DraftExercise, v: WeekVolume, ctx: BalanceContext): boolean {
  const P = (ctx.cfg ?? PROGRESSION_CONFIG).planning
  if (e.sets >= hi(e) || daySets(day) >= P.planSessionSets) return false
  const ex = ctx.lookup(e.exerciseId)
  if (!ex) return false
  for (const [g, f] of contributions(ex)) if (v[g].sets + f > P.weeklyMax + 1e-9) return false
  return true
}

/** Würde die Einheit ohne diese Übung für ihre Gruppe noch als Trainingstag zählen? */
function dayStillCounts(day: DraftDay, without: DraftExercise, g: VolumeGroup, ctx: BalanceContext): boolean {
  const P = (ctx.cfg ?? PROGRESSION_CONFIG).planning
  let s = 0
  for (const e of day.exercises) {
    if (e === without) continue
    const ex = ctx.lookup(e.exerciseId)
    s += (ex ? contributions(ex).get(g) ?? 0 : 0) * e.sets
  }
  return s >= P.frequencySets - 1e-9
}

// ---------------------------------------------------------------------------
// Wochenvolumen ausgleichen

export function balanceWeek(week: DraftDay[], ctx: BalanceContext): void {
  const cfg = ctx.cfg ?? PROGRESSION_CONFIG
  const P = cfg.planning
  const name = (id: string) => ctx.lookup(id)?.name ?? id

  for (const d of week) if (d.exercises.length > P.maxExercises) trimDay(d, week, ctx)
  // Sätze in die Grenzen 2–4 bringen
  for (const d of week) for (const e of d.exercises) e.sets = Math.min(hi(e), Math.max(lo(e), e.sets))

  const all = () => week.flatMap((d) => d.exercises.map((e) => ({ d, e })))
  const groupOf = (e: DraftExercise) => {
    const ex = ctx.lookup(e.exerciseId)
    return ex ? primaryGroup(ex) : null
  }

  const isFocus = (g: VolumeGroup | null) => !!g && ctx.focus.some((m) => groupOfMuscle(m) === g)

  for (let iter = 0; iter < 400; iter++) {
    let v = volumeOf(week, ctx)
    let changed = false

    // 0) Einheiten über 22 Sätzen zuerst kürzen (Isolation, überversorgte Gruppen zuerst)
    for (const d of week) {
      if (daySets(d) <= P.planSessionSets) continue
      const c = [...d.exercises].filter((e) => e.sets > lo(e)).sort((a, b) => Number(b.role === 'isolation') - Number(a.role === 'isolation') || groupNeed(b, v, ctx) - groupNeed(a, v, ctx))[0]
      if (c) {
        c.sets--
        changed = true
        break
      }
    }
    if (changed) continue

    const deficits = VOLUME_GROUPS.map((g) => g.id)
      .filter((g) => ctx.possible.has(g) && (v[g].sets < P.weeklyMin - 1e-9 || v[g].frequency < P.minFrequency))
      .sort((a, b) => v[a].sets - v[b].sets)

    // a) Unterversorgung: Sätze bei Übungen dieser Gruppe erhöhen
    for (const g of deficits) {
      if (v[g].sets >= P.weeklyMin - 1e-9) continue
      const c = all()
        .filter(({ d, e }) => groupOf(e) === g && canAddSet(d, e, v, ctx))
        .sort((a, b) => daySets(a.d) - daySets(b.d) || a.e.sets - b.e.sets)[0]
      if (c) {
        c.e.sets++
        changed = true
        break
      }
    }
    if (changed) continue

    // a') Einheit voll: einen Satz von einer überversorgten Übung derselben Einheit umverteilen
    for (const g of deficits) {
      if (v[g].sets >= P.weeklyMin - 1e-9) continue
      for (const { d, e } of all().filter((x) => groupOf(x.e) === g && x.e.sets < hi(x.e))) {
        const exG = ctx.lookup(e.exerciseId)
        if (!exG || [...contributions(exG)].some(([gg, f]) => v[gg].sets + f > P.weeklyMax + 1e-9)) continue
        const donor = d.exercises
          .filter((x) => x !== e && x.sets > lo(x) && !x.pinned)
          .map((x) => ({ x, need: groupNeed(x, v, ctx) }))
          .filter(({ x, need }) => need >= 1 && !isFocus(groupOf(x)))
          .sort((a, b) => b.need - a.need)[0]
        if (donor) {
          donor.x.sets--
          e.sets++
          changed = true
          break
        }
      }
      if (changed) break
    }
    if (changed) continue

    // a'') Erhöhung scheitert nur an einem mitarbeitenden Muskel am Wochenmaximum (z. B. hintere Schulter → Rücken):
    //      dort einen Satz bei einer Übung mit diesem Zielmuskel abgeben
    for (const g of deficits) {
      if (v[g].sets >= P.weeklyMin - 1e-9) continue
      for (const { e } of all().filter((x) => groupOf(x.e) === g && x.e.sets < hi(x.e) && daySets(x.d) < P.planSessionSets)) {
        const exG = ctx.lookup(e.exerciseId)
        if (!exG) continue
        const blockers = [...contributions(exG)].filter(([gg, f]) => gg !== g && v[gg].sets + f > P.weeklyMax + 1e-9).map(([gg]) => gg)
        if (!blockers.length) continue
        const donors = blockers.map((b) =>
          all()
            .filter((y) => y.e !== e && groupOf(y.e) === b && y.e.sets > lo(y.e) && v[b].sets - 1 >= P.weeklyMin - 1e-9)
            .sort((p, q) => Number(q.e.role === 'isolation') - Number(p.e.role === 'isolation') || Number(!q.e.anchor) - Number(!p.e.anchor) || q.e.sets - p.e.sets)[0],
        )
        if (donors.some((x) => !x)) continue
        for (const x of donors) x!.e.sets--
        e.sets++
        changed = true
        break
      }
      if (changed) break
    }
    if (changed) continue

    // b) Übung ergänzen (freier Platz) oder eine Isolationsübung einer überversorgten Gruppe ersetzen.
    //    Bevorzugt an Tagen, an denen die Gruppe noch nicht trainiert wird.
    for (const g of deficits) {
      const existing = all().filter((x) => groupOf(x.e) === g)
      const allAtMax = existing.every((x) => x.e.sets >= hi(x.e))
      const days = week
        .filter((d) => d.groups.includes(g))
        .filter((d) => !dayTrains(d, g, ctx) || (v[g].sets < P.weeklyMin - 1e-9 && allAtMax))
        .sort((a, b) => Number(dayTrains(a, g, ctx)) - Number(dayTrains(b, g, ctx)) || daySets(a) - daySets(b))
      for (const d of days) {
        const ex = ctx.pick(g, d)
        if (!ex) continue
        const room = P.planSessionSets - daySets(d)
        if (d.exercises.length < P.maxExercises && room >= P.minSetsPerExercise) {
          const add = draftFor(ex, ctx, { balanced: true })
          add.sets = Math.min(add.sets, room)
          d.exercises.push(add)
          ctx.log?.push(`${d.name}: „${ex.name}“ ergänzt (${groupLabel(g)} zu wenig trainiert)`)
          changed = true
          break
        }
        const victim = d.exercises
          .filter((e) => e.role === 'isolation' && !e.anchor && !e.pinned && !e.balanced && groupOf(e) !== g && !isFocus(groupOf(e)))
          .map((e) => {
            const pg = groupOf(e)
            if (!pg) return { e, surplus: Infinity }
            const afterSets = v[pg].sets - e.sets
            const freqDrop = dayStillCounts(d, e, pg, ctx) ? 0 : 1
            const ok = afterSets >= P.weeklyMin - 1e-9 && v[pg].frequency - freqDrop >= P.minFrequency
            return { e, surplus: ok ? afterSets - P.weeklyMin : -1 }
          })
          .filter((x) => x.surplus >= 0)
          .sort((a, b) => b.surplus - a.surplus)[0]
        if (victim) {
          const repl = draftFor(ex, ctx, { balanced: true, sets: victim.e.sets })
          repl.sets = Math.min(hi(repl), Math.max(lo(repl), victim.e.sets))
          d.exercises[d.exercises.indexOf(victim.e)] = repl
          ctx.log?.push(`${d.name}: „${name(victim.e.exerciseId)}“ → „${ex.name}“ (${groupLabel(g)} zu wenig trainiert)`)
          changed = true
          break
        }
      }
      if (changed) break
    }
    if (changed) continue

    // c) Überversorgung: Sätze senken (Isolation zuerst)
    for (const g of VOLUME_GROUPS.map((x) => x.id)) {
      if (v[g].sets <= P.weeklyMax + 1e-9) continue
      const c = all()
        .filter(({ e }) => groupOf(e) === g && e.sets > lo(e))
        .sort((a, b) => Number(b.e.role === 'isolation') - Number(a.e.role === 'isolation') || Number(!b.e.anchor) - Number(!a.e.anchor) || b.e.sets - a.e.sets || daySets(b.d) - daySets(a.d))[0]
      // sonst eine Übung, bei der die Gruppe mitarbeitet – solange deren Zielmuskel im Ziel bleibt
      const helper = c
        ? undefined
        : all()
            .filter(({ e }) => {
              const ex = ctx.lookup(e.exerciseId)
              const pg = groupOf(e)
              return !!ex && pg !== null && pg !== g && (contributions(ex).get(g) ?? 0) > 0 && e.sets > lo(e) && v[pg].sets - 1 >= P.weeklyMin - 1e-9
            })
            .sort((a, b) => groupNeed(b.e, v, ctx) - groupNeed(a.e, v, ctx))[0]
      const target = c ?? helper
      if (target) {
        target.e.sets--
        changed = true
        break
      }
    }
    if (changed) continue

    // d) Sätze je Einheit: mindestens 14
    for (const d of week) {
      const t = daySets(d)
      if (t < P.minSessionSets) {
        const c = [...d.exercises].filter((e) => canAddSet(d, e, v, ctx)).sort((a, b) => groupNeed(a, v, ctx) - groupNeed(b, v, ctx) || a.sets - b.sets)[0]
        if (c) {
          c.sets++
          changed = true
          break
        }
        if (d.exercises.length < P.maxExercises) {
          const g = d.groups.filter((x) => ctx.possible.has(x) && v[x].sets + P.minSetsPerExercise <= P.weeklyMax).sort((a, b) => v[a].sets - v[b].sets)[0]
          const ex = g ? ctx.pick(g, d) : undefined
          if (ex) {
            const add = draftFor(ex, ctx, { balanced: true })
            add.sets = Math.min(add.sets, P.planSessionSets - t)
            d.exercises.push(add)
            changed = true
            break
          }
        }
      }
    }
    if (changed) continue

    // e) Gleichgewicht: die schwächere Seite bekommt Sätze dazu; geht das nicht, verliert die stärkere Seite Sätze
    //    (nie unter 10 je Gruppe, 14 je Einheit, 2 je Übung)
    v = volumeOf(week, ctx)
    const r = ratios(v)
    const addTo = (groups: VolumeGroup[]) => {
      const c = all()
        .filter(({ d, e }) => {
          const g = groupOf(e)
          return g !== null && groups.includes(g) && canAddSet(d, e, v, ctx)
        })
        .sort((a, b) => groupNeed(a.e, v, ctx) - groupNeed(b.e, v, ctx))[0]
      if (c) c.e.sets++
      return !!c
    }
    const removeFrom = (groups: VolumeGroup[]) => {
      const c = all()
        .filter(({ d, e }) => {
          const g = groupOf(e)
          // Schwerpunkt-Muskeln geben nur ab, solange sie deutlich über dem Minimum bleiben
          const floor = P.weeklyMin + (isFocus(g) ? 4 : 0)
          return g !== null && groups.includes(g) && e.sets > lo(e) && v[g].sets - 1 >= floor - 1e-9 && daySets(d) - 1 >= P.minSessionSets
        })
        .sort((a, b) => Number(b.e.role === 'isolation') - Number(a.e.role === 'isolation') || groupNeed(b.e, v, ctx) - groupNeed(a.e, v, ctx))[0]
      if (c) c.e.sets--
      return !!c
    }
    if (r.pushPull !== null && r.pushPull > P.balance.max) changed = addTo(PULL_GROUPS) || removeFrom(PUSH_GROUPS)
    else if (r.pushPull !== null && r.pushPull < P.balance.min) changed = addTo(PUSH_GROUPS) || removeFrom(PULL_GROUPS)
    if (!changed && r.quadHam !== null && r.quadHam > P.balance.max) changed = addTo(['beinbeuger']) || removeFrom(['quadrizeps'])
    else if (!changed && r.quadHam !== null && r.quadHam < P.balance.min) changed = addTo(['quadrizeps']) || removeFrom(['beinbeuger'])
    if (!changed) break
  }
  for (const d of week) sortDay(d, ctx.lookup)
}

function dayTrains(d: DraftDay, g: VolumeGroup, ctx: BalanceContext): boolean {
  const P = (ctx.cfg ?? PROGRESSION_CONFIG).planning
  let s = 0
  for (const e of d.exercises) {
    const ex = ctx.lookup(e.exerciseId)
    s += (ex ? contributions(ex).get(g) ?? 0 : 0) * e.sets
  }
  return s >= P.frequencySets - 1e-9
}

/** Satzgrenzen einer Einheit prüfen (für Tests und manuelle Änderungen). */
export function checkDayLimits(exercises: { sets: number }[], cfg: ProgressionConfig = PROGRESSION_CONFIG): string[] {
  const P = cfg.planning
  const problems: string[] = []
  if (exercises.length > P.maxExercises) problems.push(`${exercises.length} Übungen (max. ${P.maxExercises})`)
  for (const e of exercises) if (e.sets < P.minSetsPerExercise || e.sets > P.maxSetsPerExercise) problems.push(`${e.sets} Sätze (erlaubt ${P.minSetsPerExercise}–${P.maxSetsPerExercise})`)
  return problems
}

export { roleOf }
