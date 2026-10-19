import type { MuscleId } from '../../db/types'

/**
 * Eigene, schlichte Körperkarte (vorne/hinten) statt der 3D-Silhouetten des Originals.
 * Hervorgehobene Muskeln werden hell gefüllt.
 */
type Shape = { m: MuscleId; d: string }

const ell = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0`
const pair = (m: MuscleId, cx: number, cy: number, rx: number, ry: number): Shape[] => [
  { m, d: ell(50 - cx, cy, rx, ry) },
  { m, d: ell(50 + cx, cy, rx, ry) },
]

const FRONT: Shape[] = [
  ...pair('vordere_schulter', 16, 44, 6, 6.5),
  ...pair('mittlere_schulter', 20, 41, 4, 5),
  { m: 'brust', d: 'M37 46h12v12c-4 2-9 2-12-1Z M51 46h12v11c-3 3-8 3-12 1Z' },
  { m: 'bauch', d: 'M42 61h16v30c-5 3-11 3-16 0Z' },
  ...pair('bizeps', 25, 62, 4.5, 9),
  ...pair('unterarme', 29, 86, 4, 10),
  ...pair('quadrizeps', 8, 124, 6.5, 19),
  ...pair('adduktoren', 3, 112, 2.5, 10),
  ...pair('waden', 8, 166, 4.5, 14),
  { m: 'huefte', d: ell(50, 98, 14, 5) },
  ...pair('sprunggelenk', 8, 186, 4, 3),
  ...pair('fuesse', 8, 194, 6, 3),
  ...pair('schultergelenk', 18, 40, 4, 4),
]

const BACK: Shape[] = [
  { m: 'nacken', d: 'M43 32h14l6 10H37Z' },
  ...pair('hintere_schulter', 17, 45, 6, 6),
  { m: 'ruecken', d: 'M37 44h26l-3 32c-6 4-14 4-20 0Z' },
  { m: 'brustwirbelsaeule', d: 'M48 42h4v34h-4Z' },
  { m: 'unterer_ruecken', d: 'M42 79h16v12H42Z' },
  ...pair('trizeps', 25, 62, 4.5, 9),
  ...pair('unterarme', 29, 86, 4, 10),
  ...pair('gesaess', 6, 102, 7.5, 8),
  ...pair('abduktoren', 13, 98, 3, 6),
  ...pair('beinbeuger', 8, 129, 6, 17),
  ...pair('waden', 8, 164, 5, 13),
  ...pair('sprunggelenk', 8, 186, 4, 3),
]

const SILHOUETTE =
  'M50 4a10 10 0 1 1 0 20a10 10 0 1 1 0-20Z M44 26h12v6l12 4 10 6 4 14 4 30-6 2-6-26-2 30-6 2v12l2 58 2 12h-10l-4-60-2-20-2 20-4 60H36l2-12 2-58V112l-6-2-2-30-6 26-6-2 4-30 4-14 10-6 12-4Z'

export function BodyMap({ highlight, view = 'front', size = 90, dim = '#2a2a2a', on = '#d9d9d9', base = '#1a1a1a' }: { highlight: MuscleId[]; view?: 'front' | 'back'; size?: number; dim?: string; on?: string; base?: string }) {
  const shapes = view === 'front' ? FRONT : BACK
  return (
    <svg viewBox="0 0 100 200" width={size / 2} height={size} aria-hidden>
      <path d={SILHOUETTE} fill={base} />
      {shapes.map((s, i) => (
        <path key={i} d={s.d} fill={highlight.includes(s.m) ? on : dim} />
      ))}
    </svg>
  )
}

/** Vorder- oder Rückansicht, je nachdem wo der Muskel liegt. */
export function viewFor(m: MuscleId): 'front' | 'back' {
  return BACK.some((s) => s.m === m) && !FRONT.some((s) => s.m === m) ? 'back' : 'front'
}
