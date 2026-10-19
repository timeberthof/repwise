import type { ReactNode } from 'react'
import { Icon } from '../../components/icons/Icon'
import { ProgressSegments } from '../../components/ui/ProgressSegments'
import { Button } from '../../components/ui/Button'

interface Props {
  step: number
  total: number
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
  onBack?: () => void
  onClose?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  /** Inhalt unten zentriert (z. B. Schieberegler wie bei „Wie war Dein Schlaf?“) */
  bottomContent?: ReactNode
  /** „✨ EMPFOHLEN“-Legende über dem Button */
  legend?: boolean
  hideButton?: boolean
}

/**
 * Gemeinsames Layout für Onboarding und Zyklusplanung (S17–S26):
 * ✕ bzw. ‹, Fortschritt aus Segmenten, Titel 24/700, Untertitel grau, Button „Weiter“ unten.
 */
export function FlowLayout({ step, total, title, subtitle, children, onBack, onClose, onNext, nextLabel = 'Weiter', nextDisabled, bottomContent, legend, hideButton }: Props) {
  return (
    <div className="flex h-dvh flex-col bg-bg">
      <div className="flex h-14 shrink-0 items-center gap-4 pl-3 pr-3" style={{ marginTop: 'var(--safe-top)' }}>
        {step === 0 || !onBack ? (
          <button type="button" aria-label="Schließen" onClick={onClose} className="flex h-11 w-11 items-center justify-center text-fg" style={{ visibility: onClose ? 'visible' : 'hidden' }}>
            <Icon name="close" size={30} />
          </button>
        ) : (
          <button type="button" aria-label="Zurück" onClick={onBack} className="flex h-11 w-11 items-center justify-center text-fg">
            <Icon name="chevronLeft" size={26} />
          </button>
        )}
        <ProgressSegments total={total} current={step} />
      </div>

      {/* Kinder schrumpfen nicht (shrink-0): sonst würden Listen mit overflow-hidden auf Bildschirmhöhe gestaucht und ließen sich nicht scrollen */}
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 [&>*]:shrink-0">
        <h1 className="mt-[24px] text-flow font-bold leading-[1.2] tracking-[-0.005em]">{title}</h1>
        {subtitle && <p className="mt-[8px] text-body font-light leading-[1.38] text-fg-2">{subtitle}</p>}
        {children}
        {bottomContent && <div className="mt-auto pt-6">{bottomContent}</div>}
      </div>

      {!hideButton && (
        <div className="shrink-0 px-5 pt-2" style={{ paddingBottom: 'max(var(--safe-bottom), 16px)' }}>
          {legend && <RecommendedLegend className="mb-[40px]" />}
          <Button onClick={onNext} disabled={nextDisabled}>
            {nextLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

export function RecommendedLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Icon name="wand" size={18} gradient={['#f3af3d', '#ed774d']} />
      <span className="text-grad-accent text-[15px] font-medium uppercase tracking-[0.03em] underline decoration-[#ed774d] underline-offset-4">Empfohlen</span>
    </div>
  )
}

/** Info-Karte wie „Neuer Plan startet am …“ (S17). */
export function InfoCard({ icon, title, text }: { icon: Parameters<typeof Icon>[0]['name']; title: ReactNode; text: ReactNode }) {
  return (
    <div className="flex gap-4 rounded-xl bg-surface px-5 py-[18px]">
      <Icon name={icon} size={28} className="mt-[2px] text-fg" />
      <div>
        <p className="text-[17px] font-bold leading-snug">{title}</p>
        <p className="mt-1 text-[15.5px] leading-snug text-fg">{text}</p>
      </div>
    </div>
  )
}
