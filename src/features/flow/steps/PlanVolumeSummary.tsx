import { Icon } from '../../../components/icons/Icon'
import { PROGRESSION_CONFIG } from '../../../logic/progression'
import { explainVolume, fmtSets, groupStatus, VOLUME_GROUPS } from '../../../logic/volume'
import type { PlanReport } from '../../../logic/planGenerator'
import type { SplitId } from '../../../db/types'

const P = PROGRESSION_CONFIG.planning

/**
 * Wochenvolumen eines Plans (normale Woche): Sätze je Muskelgruppe mit Ziel 10–20,
 * Hinweise zu Verhältnissen und ggf. ein Vorschlag, wenn der Split mit max. 7 Übungen nicht reicht.
 */
export function PlanVolumeSummary({
  report,
  suggestion,
  onApply,
  impossibleReason,
}: {
  report: PlanReport
  suggestion?: { split: SplitId; weekdays: number[]; text: string } | null
  onApply?: (s: { split: SplitId; weekdays: number[] }) => void
  impossibleReason?: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl bg-surface">
        {VOLUME_GROUPS.map(({ id, label }, i) => {
          const v = report.volume[id]
          const possible = !report.impossible.includes(id)
          const st = groupStatus(v, possible)
          const ok = st === 'ok' && v.frequency >= P.minFrequency
          return (
            <div key={id} className={`flex items-center justify-between gap-3 px-4 py-[9px] ${i < VOLUME_GROUPS.length - 1 ? 'border-b border-elevated' : ''}`}>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold">{label}</span>
                <span className="block text-[12.5px] leading-snug text-fg-2">{possible ? explainVolume(v) : (impossibleReason ?? 'keine passende Übung möglich')}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[15px] tabular-nums">
                {possible ? fmtSets(v.sets) : '–'}
                <Icon name={!possible ? 'block' : ok ? 'checkCircle' : 'warning'} size={18} style={{ color: !possible ? '#9f9f9f' : ok ? '#5bbd52' : '#f0943d' }} />
              </span>
            </div>
          )
        })}
      </div>
      <p className="px-1 text-[13px] leading-snug text-fg-2">
        Sätze pro Woche (normale Woche), anteilig gezählt: Zielmuskel = 1, mitarbeitender Muskel = ½. Ziel {P.weeklyMin}–{P.weeklyMax} Sätze, mindestens {P.minFrequency}× pro Woche, höchstens {P.maxExercises} Übungen pro Einheit.
      </p>
      {[...report.problems, ...report.hints].length > 0 && (
        <div className="rounded-xl border border-[#4a3216] bg-[#1f1609] px-4 py-3 text-[13.5px] leading-snug text-[#f0b46a]">
          {[...report.problems, ...report.hints].map((p) => (
            <p key={p}>• {p}</p>
          ))}
        </div>
      )}
      {suggestion && (
        <div className="rounded-xl bg-surface px-4 py-3">
          <p className="text-[15px] font-semibold">Vorschlag</p>
          <p className="mt-1 text-[13.5px] leading-snug text-fg-2">
            Mit höchstens {P.maxExercises} Übungen pro Einheit reicht der aktuelle Split nicht für alle Muskeln. {suggestion.text}
          </p>
          {onApply && (
            <button type="button" onClick={() => onApply(suggestion)} className="mt-3 h-[36px] rounded-md bg-fg px-4 text-[14px] font-bold text-fg-inverse">
              Vorschlag übernehmen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
