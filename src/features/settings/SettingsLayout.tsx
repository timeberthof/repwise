import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { SubHeader } from '../../components/layout/PageHeader'

/** Gemeinsamer Rahmen der Einstellungs-Unterseiten. */
export function SettingsLayout({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh bg-bg pb-24">
      <SubHeader title={title} onBack={() => navigate('/einstellungen')} />
      <div className="pt-2">{children}</div>
      {footer && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-5 pt-6" style={{ paddingBottom: 'max(var(--safe-bottom), 16px)', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.95) 35%)' }}>
          {footer}
        </div>
      )}
    </div>
  )
}

export function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <section className="mt-[26px]">
      <p className="px-6 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">{title}</p>
      <div className="mx-4 mt-[10px]">{children}</div>
      {hint && <p className="mx-6 mt-2 text-[13px] leading-snug text-fg-2">{hint}</p>}
    </section>
  )
}

export function Row({ label, sub, children, onClick, last }: { label: ReactNode; sub?: ReactNode; children?: ReactNode; onClick?: () => void; last?: boolean }) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[16.5px]">{label}</span>
        {sub && <span className="mt-[1px] block text-[13px] leading-snug text-fg-2">{sub}</span>}
      </span>
      {children}
    </>
  )
  const cls = `flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left ${last ? '' : 'border-b border-elevated'}`
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} active:bg-white/5`}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

export function Group({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl bg-surface">{children}</div>
}
