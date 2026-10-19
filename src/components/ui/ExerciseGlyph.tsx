import type { EquipmentId, Exercise } from '../../db/types'

/**
 * Eigene, schlichte Geräte-Symbole statt der 3D-Bilder des Originals.
 * Gezeichnet in einem 64er-Raster, Strichfarbe hellgrau.
 */
type Kind = EquipmentId | 'mobility'

const S = '#c8c8c8'
const F = '#5a5a5a'

function glyph(kind: Kind) {
  switch (kind) {
    case 'langhantel':
    case 'sz_stange':
      return (
        <>
          <rect x="4" y="30" width="56" height="4" rx="2" fill={S} />
          <rect x="9" y="20" width="6" height="24" rx="2" fill={F} stroke={S} strokeWidth="2" />
          <rect x="49" y="20" width="6" height="24" rx="2" fill={F} stroke={S} strokeWidth="2" />
          <rect x="16" y="24" width="4" height="16" rx="1.5" fill={S} />
          <rect x="44" y="24" width="4" height="16" rx="1.5" fill={S} />
        </>
      )
    case 'kurzhantel':
      return (
        <g transform="rotate(-35 32 32)">
          <rect x="20" y="30" width="24" height="4" rx="2" fill={S} />
          <rect x="11" y="22" width="9" height="20" rx="3" fill={F} stroke={S} strokeWidth="2" />
          <rect x="44" y="22" width="9" height="20" rx="3" fill={F} stroke={S} strokeWidth="2" />
        </g>
      )
    case 'kettlebell':
      return (
        <>
          <path d="M24 22a8 8 0 1 1 16 0" fill="none" stroke={S} strokeWidth="4" />
          <path d="M18 38c0-10 6-15 14-15s14 5 14 15c0 7-5 12-14 12s-14-5-14-12Z" fill={F} stroke={S} strokeWidth="2.5" />
        </>
      )
    case 'maschine':
      return (
        <>
          <rect x="10" y="8" width="18" height="48" rx="2" fill="none" stroke={S} strokeWidth="2.5" />
          {[14, 20, 26, 32, 38].map((y) => (
            <rect key={y} x="13" y={y} width="12" height="4" rx="1" fill={F} />
          ))}
          <path d="M28 12h20M48 12v26M38 38h16M42 46h8v10" fill="none" stroke={S} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="36" y="36" width="18" height="5" rx="2" fill={S} />
        </>
      )
    case 'kabelzug':
      return (
        <>
          <path d="M16 6v52M48 6v52M16 6h32" fill="none" stroke={S} strokeWidth="2.5" />
          <circle cx="32" cy="12" r="4" fill={F} stroke={S} strokeWidth="2" />
          <path d="M32 16v24" stroke={S} strokeWidth="1.5" />
          <path d="M24 42h16" stroke={S} strokeWidth="3.5" strokeLinecap="round" />
          {[46, 50, 54].map((y) => (
            <rect key={y} x="20" y={y} width="8" height="3" rx="1" fill={F} />
          ))}
        </>
      )
    case 'multipresse':
      return (
        <>
          <path d="M14 6v52M50 6v52" stroke={S} strokeWidth="3" />
          <rect x="8" y="24" width="48" height="4" rx="2" fill={S} />
          <rect x="4" y="18" width="5" height="16" rx="1.5" fill={F} stroke={S} strokeWidth="1.5" />
          <rect x="55" y="18" width="5" height="16" rx="1.5" fill={F} stroke={S} strokeWidth="1.5" />
          <rect x="20" y="44" width="24" height="5" rx="2" fill={F} />
        </>
      )
    case 'klimmzugstange':
      return (
        <>
          <path d="M8 8h48" stroke={S} strokeWidth="4" strokeLinecap="round" />
          <circle cx="32" cy="22" r="5" fill={F} stroke={S} strokeWidth="2" />
          <path d="M24 9l4 10M40 9l-4 10M32 27v16M32 43l-6 13M32 43l6 13" fill="none" stroke={S} strokeWidth="3" strokeLinecap="round" />
        </>
      )
    case 'dipbarren':
      return (
        <>
          <path d="M8 26h20M36 26h20M12 26v30M24 26v30M40 26v30M52 26v30" stroke={S} strokeWidth="3" strokeLinecap="round" />
        </>
      )
    case 'bank':
      return <path d="M8 30h48M14 30v20M50 30v20M10 50h8M46 50h8" stroke={S} strokeWidth="4" strokeLinecap="round" fill="none" />
    case 'widerstandsband':
      return <path d="M14 32c0-14 36-14 36 0s-36 14-36 0Z" fill="none" stroke="#e9a63a" strokeWidth="5" />
    case 'mobility':
      return (
        <>
          <circle cx="20" cy="18" r="5" fill={F} stroke={S} strokeWidth="2" />
          <path d="M22 23l8 12 14-2M30 35l-6 14M44 33l12 12M22 26l-8 8" fill="none" stroke={S} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 54h52" stroke={F} strokeWidth="3" strokeLinecap="round" />
        </>
      )
    case 'koerpergewicht':
    default:
      return (
        <>
          <circle cx="32" cy="12" r="6" fill={F} stroke={S} strokeWidth="2" />
          <path d="M32 18v20M32 24l-12 8M32 24l12 8M32 38l-8 18M32 38l8 18" fill="none" stroke={S} strokeWidth="3.5" strokeLinecap="round" />
        </>
      )
  }
}

export function glyphKind(ex: Exercise): Kind {
  if (ex.art === 'mobility') return 'mobility'
  const main = ex.equipment.find((e) => e !== 'bank') ?? ex.equipment[0]
  return main
}

export function ExerciseGlyph({ exercise, size = 64, kind }: { exercise?: Exercise; size?: number; kind?: Kind }) {
  const k = kind ?? (exercise ? glyphKind(exercise) : 'koerpergewicht')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ flexShrink: 0 }}>
      {glyph(k)}
    </svg>
  )
}
