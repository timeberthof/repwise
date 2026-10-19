import { useState } from 'react'
import type { AdjustmentNote } from '../../db/types'
import { Icon } from '../../components/icons/Icon'

/**
 * Hinweisbox im Orange-Verlauf wie „✨ Satzzahl angepasst“ (S35).
 * Zeigt jede automatische Anpassung mit kurzem Grund; optional mit „Rückgängig“.
 */
export function AdjustmentBox({ note, onUndo, className = '' }: { note: AdjustmentNote; onUndo?: () => void; className?: string }) {
  return (
    <div className={`rounded-lg p-[1.5px] ${className}`} style={{ background: 'linear-gradient(135deg, #e9a63a 0%, #ed774d 100%)' }}>
      <div className="rounded-[15px] px-4 pb-[14px] pt-[14px]" style={{ background: 'linear-gradient(180deg, #241607 0%, #24120a 100%)' }}>
        <div className="flex items-center gap-3">
          <Icon name="wand" size={24} gradient={['#f3af3d', '#ed774d']} />
          <span className="flex-1 text-[18px] font-semibold text-[#f2a23c]">{note.title}</span>
          {onUndo && (
            <button type="button" onClick={onUndo} className="shrink-0 text-label font-semibold text-[#f0943d] underline underline-offset-2">
              Rückgängig
            </button>
          )}
        </div>
        <p className="mt-2 text-[16px] leading-snug text-[#f0943d]">{note.reason}</p>
      </div>
    </div>
  )
}

/** Kompakte Zeile im Übungs-Sheet; aufklappbar zu den vollständigen Hinweisen. */
export function AdjustmentStrip({ notes, onUndo }: { notes: AdjustmentNote[]; onUndo?: (n: AdjustmentNote) => void }) {
  const [open, setOpen] = useState(false)
  if (!notes.length) return null
  if (open) {
    return (
      <div className="flex flex-col gap-2">
        {notes.map((n, i) => (
          <AdjustmentBox key={i} note={n} onUndo={onUndo ? () => onUndo(n) : undefined} />
        ))}
        <button type="button" onClick={() => setOpen(false)} className="self-center text-label text-fg-2">
          Weniger anzeigen
        </button>
      </div>
    )
  }
  const first = notes[0]
  return (
    <button type="button" onClick={() => setOpen(true)} className="w-full rounded-lg p-[1.5px] text-left" style={{ background: 'linear-gradient(135deg, #e9a63a 0%, #ed774d 100%)' }}>
      <span className="flex items-center gap-3 rounded-[15px] px-4 py-[11px]" style={{ background: 'linear-gradient(180deg, #241607 0%, #24120a 100%)' }}>
        <Icon name="wand" size={22} gradient={['#f3af3d', '#ed774d']} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold text-[#f2a23c]">{first.title}</span>
          <span className="block truncate text-[13.5px] text-[#f0943d]">{first.reason}</span>
        </span>
        {notes.length > 1 && <span className="shrink-0 rounded-full bg-[#3a240f] px-2 text-[13px] text-[#f2a23c]">+{notes.length - 1}</span>}
        <Icon name="arrowDown" size={22} className="shrink-0 text-[#f0943d]" />
      </span>
    </button>
  )
}
