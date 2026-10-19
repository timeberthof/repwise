/** Herzfrequenz-Zonen für Cardio-Vorschläge (siehe DECISIONS.md, Frage 10). */

export const ZONES = [
  { zone: 1, label: 'Zone 1', name: 'Regeneration', from: 0.5, to: 0.6 },
  { zone: 2, label: 'Zone 2', name: 'Grundlagenausdauer', from: 0.6, to: 0.7 },
  { zone: 3, label: 'Zone 3', name: 'Aerob', from: 0.7, to: 0.8 },
  { zone: 4, label: 'Zone 4', name: 'Schwelle', from: 0.8, to: 0.9 },
  { zone: 5, label: 'Zone 5', name: 'Maximal', from: 0.9, to: 1.0 },
] as const

export type ZoneNumber = 1 | 2 | 3 | 4 | 5

/** Maximale Herzfrequenz nach Tanaka: 208 − 0,7 × Alter (überschreibbar). */
export function hrMax(age: number, override?: number): number {
  if (override && override > 100) return override
  return Math.round(208 - 0.7 * age)
}

/** Standard-Zonengrenzen in bpm: Untergrenzen Zone 1–5 + Obergrenze Zone 5. */
export function defaultZoneBounds(max: number): number[] {
  return [...ZONES.map((z) => Math.round(max * z.from)), max]
}

/**
 * Bereich einer Zone. Eigene Grenzen (6 Werte in bpm) haben Vorrang vor der Prozent-Rechnung.
 */
export function zoneRange(zone: ZoneNumber, max: number, custom?: number[]): { min: number; max: number } {
  const b = custom && custom.length === 6 ? custom : defaultZoneBounds(max)
  return { min: b[zone - 1], max: b[zone] }
}

export function zoneText(zone: ZoneNumber, max: number, custom?: number[]): string {
  const r = zoneRange(zone, max, custom)
  return `${ZONES[zone - 1].label}: ${r.min}–${r.max} bpm`
}

/** In welcher Zone liegt ein Puls? */
export function zoneOf(bpm: number, max: number, custom?: number[]): ZoneNumber | null {
  const b = custom && custom.length === 6 ? custom : defaultZoneBounds(max)
  if (bpm < b[0]) return null
  for (let z = 5; z >= 1; z--) if (bpm >= b[z - 1]) return z as ZoneNumber
  return null
}

/** Intensität passend zur Zone (für den Cardio-Eintrag). */
export function intensityForZone(zone: ZoneNumber): 'leicht' | 'moderat' | 'intensiv' {
  return zone <= 2 ? 'leicht' : zone === 3 ? 'moderat' : 'intensiv'
}
