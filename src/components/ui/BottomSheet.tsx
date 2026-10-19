import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Fast volle Höhe (Übung tauschen, Verfügbare Gewichte) */
  full?: boolean
  /** Text-Aktion oben rechts in Orange („Überspringen“, „Speichern“) */
  action?: { label: string; onClick: () => void; disabled?: boolean }
  /** Unten fixierter Bereich (Buttons) */
  footer?: ReactNode
  dismissible?: boolean
  /** Hintergrund über dem Inhalt (Standard: abdunkeln) */
  backdrop?: boolean
  label?: string
  /** Feste Höhe ab dieser Position von oben (z. B. Übungs-Sheet wie im Original bei 229 pt) */
  fixedTop?: number
}

const ANIM_MS = 240

/** Bottom-Sheet wie im Original: #0F0F0F, Radius oben 24, Griff 50 × 3 pt, zum Schließen nach unten ziehen. */
export function BottomSheet({ open, onClose, children, full, action, footer, dismissible = true, backdrop = true, label, fixedTop }: Props) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const [drag, setDrag] = useState(0)
  const start = useRef<number | null>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
    } else if (mounted) {
      setClosing(true)
      const t = setTimeout(() => {
        setMounted(false)
        setClosing(false)
        setDrag(0)
      }, ANIM_MS)
      return () => clearTimeout(t)
    }
  }, [open, mounted])

  if (!mounted) return null

  const close = () => dismissible && onClose()

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label}>
      {backdrop && (
        <div
          className="absolute inset-0 bg-black/60"
          style={{ animation: `fade-in ${ANIM_MS}ms ease-out`, opacity: closing ? 0 : 1, transition: `opacity ${ANIM_MS}ms` }}
          onClick={close}
        />
      )}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-sheet bg-surface"
        style={{
          maxHeight: full ? 'calc(100% - var(--safe-top) - 26px)' : 'calc(100% - var(--safe-top) - 40px)',
          height: full ? 'calc(100% - var(--safe-top) - 26px)' : fixedTop ? `max(calc(100% - ${fixedTop}px), 520px)` : undefined,
          transform: closing ? 'translateY(100%)' : `translateY(${drag}px)`,
          transition: start.current === null ? `transform ${ANIM_MS}ms cubic-bezier(.2,.8,.2,1)` : 'none',
          animation: `sheet-in ${ANIM_MS}ms cubic-bezier(.2,.8,.2,1)`,
        }}
      >
        <div
          className="relative flex h-[58px] shrink-0 touch-none items-center justify-center"
          onPointerDown={(e) => {
            if (!dismissible) return
            start.current = e.clientY
            ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (start.current === null) return
            setDrag(Math.max(0, e.clientY - start.current))
          }}
          onPointerUp={() => {
            if (start.current === null) return
            const d = drag
            start.current = null
            if (d > 90) onClose()
            else setDrag(0)
          }}
        >
          <span className="h-[3px] w-[50px] rounded-full bg-white" />
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[20px] font-medium text-action disabled:opacity-40"
            >
              {action.label}
            </button>
          )}
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="shrink-0 px-4 pt-3" style={{ paddingBottom: 'max(var(--safe-bottom), 16px)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** Titel in Sheets: VERSALIEN 20/900 – „ÜBUNG TAUSCHEN“, „WELLNESS-ABFRAGE“. */
export function SheetTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="px-6 pb-5">
      <h2 className="text-screen font-black uppercase tracking-[0.01em]">{children}</h2>
      {sub && <p className="mt-3 text-[17px] text-fg-2">{sub}</p>}
    </div>
  )
}
