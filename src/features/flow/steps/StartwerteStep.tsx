import type { Startwerte } from '../../../db/repo/startwerte'
import { exerciseName } from '../../../data/exercises'
import { formatDate } from '../../../logic/dates'
import { fmt } from '../../../logic/format'
import { Toggle } from '../../../components/ui/Toggle'
import { Button } from '../../../components/ui/Button'

/** Startwerte bestätigen (aus der Statistik übernommen); fehlende werden im ersten Training kalibriert. */
export function StartwerteReview({ data, use, onUse, onLoad }: { data: Startwerte | null; use: boolean; onUse: (v: boolean) => void; onLoad?: () => void }) {
  if (!data) {
    return (
      <>
        <div className="mt-[30px] rounded-xl bg-surface p-5 text-body">
          Keine Startwerte geladen. Kein Problem: Die ersten Sätze jeder Übung dienen zur Kalibrierung, danach passt Repwise das Gewicht automatisch an.
        </div>
        {onLoad && (
          <Button variant="secondary" icon="upload" className="mt-4" onClick={onLoad}>
            Startwerte-Datei laden
          </Button>
        )}
      </>
    )
  }
  const rows = Object.entries(data.maximalkraft)
    .map(([id, list]) => {
      const last = list[list.length - 1]
      const best = Math.max(...list.map((p) => p[1]))
      return { id, name: exerciseName(id), last: last[1], date: last[0], best, ww: data.arbeitsgewichte[id]?.gewicht }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  return (
    <>
      <div className="mt-[22px] flex items-center justify-between rounded-xl bg-surface px-[18px] py-[14px]">
        <div>
          <p className="text-[17px] font-semibold">Startwerte übernehmen</p>
          <p className="text-label text-fg-2">Stand {formatDate(data.stand)} · {rows.length} Übungen · {data.trainings.length} Trainings</p>
        </div>
        <Toggle checked={use} onChange={onUse} label="Startwerte übernehmen" />
      </div>
      <div className={`mt-3 overflow-hidden rounded-xl bg-surface ${use ? '' : 'opacity-40'}`}>
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-elevated px-[18px] py-[10px] text-section font-semibold uppercase tracking-[0.05em] text-fg-2">
          <span>Übung</span>
          <span className="text-right">Max. Ø</span>
          <span className="w-[54px] text-right">Gewicht</span>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-elevated px-[18px] py-[10px] last:border-b-0">
            <span className="min-w-0">
              <span className="block truncate text-[15.5px] font-semibold">{r.name}</span>
              <span className="block text-[12.5px] text-fg-2">zuletzt {formatDate(r.date)} · Bestwert {fmt(r.best)}</span>
            </span>
            <span className="text-right text-[15.5px] font-semibold text-orange">{fmt(r.last)}</span>
            <span className="w-[54px] text-right text-[15.5px] text-fg-2">{r.ww ? `${fmt(r.ww)} kg` : '–'}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-label leading-snug text-fg-2">
        „Max. Ø“ = geschätzte Maximalkraft für eine Wiederholung, Durchschnitt der letzten Einheit. Übungen ohne Arbeitsgewicht starten mit einer vorsichtigen Schätzung – die ersten Sätze dienen zur Kalibrierung.
      </p>
    </>
  )
}
