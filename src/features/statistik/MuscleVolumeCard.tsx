import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { weekMuscleSets } from '../../db/repo/volumeStats'
import { Icon, type IconName } from '../../components/icons/Icon'
import { PROGRESSION_CONFIG } from '../../logic/progression'
import { explainVolume, fmtSets, groupStatus, VOLUME_GROUPS, type GroupStatus } from '../../logic/volume'
import { formatDayMonth } from '../../logic/dates'
import { isoWeek } from '../../db/repo/cycle'
import { StatCard } from './StatCard'

const P = PROGRESSION_CONFIG.planning
const STATUS: Record<GroupStatus, { label: string; icon: IconName; color: string }> = {
  ok: { label: 'im Ziel', icon: 'checkCircle', color: '#5bbd52' },
  unter: { label: 'unter Ziel', icon: 'trendingDown', color: '#f0943d' },
  ueber: { label: 'über Ziel', icon: 'trendingUp', color: '#f0943d' },
  nicht_moeglich: { label: 'nicht möglich', icon: 'block', color: '#9f9f9f' },
}

/** Statistik › Training: Sätze pro Muskelgruppe diese Woche mit Zielbereich und Erklärung je Wert. */
export function MuscleVolumeCard() {
  const data = useLiveQuery(() => weekMuscleSets(), [])
  const [open, setOpen] = useState<string | null>(null)
  if (!data) return null
  const scale = Math.max(25, ...VOLUME_GROUPS.map((g) => data.planned[g.id].sets + 2))
  const pct = (x: number) => `${Math.min(100, (x / scale) * 100)}%`
  const deload = data.weekType === 'deload'

  return (
    <StatCard
      title="Sätze pro Muskelgruppe"
      sub={`KW ${isoWeek(data.start)} · ${formatDayMonth(data.start)}–${formatDayMonth(data.end)} · Ziel ${P.weeklyMin}–${P.weeklyMax} Sätze, mind. ${P.minFrequency}× pro Woche`}
    >
      <div className="px-4 pb-3">
        <p className="mt-1 text-[13px] leading-snug text-fg-2">
          Zielmuskel = 1 Satz, mitarbeitender Muskel = ½ Satz. Kräftig = erledigt, hell = noch geplant, grauer Bereich = Ziel. Tippe auf eine Zeile für die Erklärung.
          {deload ? ' Deload-Woche: bewusst ca. 45 % weniger Sätze.' : ''}
        </p>
        <div className="mt-3 flex flex-col">
          {VOLUME_GROUPS.map(({ id, label }) => {
            const done = data.done[id]
            const planned = data.planned[id]
            const possible = data.possible.has(id)
            const status = groupStatus(planned, possible)
            const st = STATUS[status]
            const expanded = open === id
            return (
              <button key={id} type="button" onClick={() => setOpen(expanded ? null : id)} className="border-b border-elevated py-[9px] text-left last:border-b-0" aria-expanded={expanded}>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-semibold text-fg">{label}</span>
                  <span className="flex items-center gap-1 text-[13px] text-fg-2">
                    <span className="tabular-nums text-fg">{fmtSets(done.sets)}</span> / {fmtSets(planned.sets)}
                    <Icon name={st.icon} size={16} style={{ color: st.color }} />
                    <span>{st.label}</span>
                  </span>
                </span>
                <span className="relative mt-[6px] block h-[10px] overflow-hidden rounded-[4px] bg-elevated">
                  {/* Zielbereich */}
                  <span className="absolute inset-y-0 bg-[#3a3a3a]" style={{ left: pct(P.weeklyMin), width: `calc(${pct(P.weeklyMax)} - ${pct(P.weeklyMin)})` }} />
                  {/* geplant (hell) und erledigt (kräftig) */}
                  <span className="absolute inset-y-[2px] left-0 rounded-[3px] bg-[#ed774d]/35" style={{ width: pct(planned.sets) }} />
                  <span className="absolute inset-y-[2px] left-0 rounded-[3px] bg-[#ed774d]" style={{ width: pct(done.sets) }} />
                </span>
                {expanded && (
                  <span className="mt-2 block text-[13px] leading-snug text-fg-2">
                    {possible ? (
                      <>
                        Erledigt: {explainVolume(done)}.<br />
                        Geplant für die ganze Woche: {explainVolume(planned)}.<br />
                        {status === 'ok' && 'Im Zielbereich – genug Reiz für Muskelaufbau, ohne zu viel Ermüdung.'}
                        {status === 'unter' && `Unter ${P.weeklyMin} Sätzen: eher zu wenig Reiz. Der Plan gleicht das beim nächsten Erstellen aus.`}
                        {status === 'ueber' && `Über ${P.weeklyMax} Sätzen: mehr bringt meist kaum mehr, erhöht aber die Ermüdung.`}
                        {planned.frequency < P.minFrequency && ` Nur ${planned.frequency}× diese Woche – Ziel sind mindestens ${P.minFrequency} Einheiten.`}
                      </>
                    ) : (
                      'Keine passende Übung möglich (Equipment, Schmerzen oder ausgeschlossene Übungen) – bewusst nicht eingeplant.'
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </StatCard>
  )
}
