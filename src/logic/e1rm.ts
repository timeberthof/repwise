/**
 * Maximalkraft (geschätztes 1-Wiederholungs-Maximum) wie im Original:
 * Gewicht × (1 + (Wiederholungen + RIR) / 30)  – Epley-Formel mit Reserve-Wiederholungen.
 * Wert je Einheit = Durchschnitt über alle erledigten Arbeitssätze (siehe DECISIONS.md, Frage 2).
 */
export function e1rmSet(weight: number, reps: number, rir: number | null | undefined): number {
  if (!weight || weight <= 0 || reps <= 0) return 0
  return weight * (1 + (reps + (rir ?? 0)) / 30)
}

export interface SetLike {
  weight: number | null
  reps: number
  rir: number | null
  done: boolean
}

export function sessionE1rm(sets: SetLike[]): number | null {
  const values = sets.filter((s) => s.done && s.weight && s.weight > 0 && s.reps > 0).map((s) => e1rmSet(s.weight!, s.reps, s.rir))
  if (!values.length) return null
  return round2(values.reduce((a, b) => a + b, 0) / values.length)
}

/** Umkehrung: Arbeitsgewicht für eine Ziel-Wiederholungszahl. */
export function weightForReps(e1rm: number, reps: number, rir: number): number {
  return e1rm / (1 + (reps + rir) / 30)
}

export const round2 = (n: number) => Math.round(n * 100) / 100
