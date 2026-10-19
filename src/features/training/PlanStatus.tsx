import type { Plan } from '../../db/types'
import { Icon } from '../../components/icons/Icon'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { OptionCard } from '../../components/ui/OptionCard'
import { db } from '../../db/db'
import { formatLong, today } from '../../logic/dates'

/** Chip „Aktiv ⌄“ im Training-Kopf (S02) – Plan-Status (DECISIONS.md, Frage 13). */
export function PlanStatusChip({ status, onClick }: { status: Plan['status']; onClick: () => void }) {
  const active = status === 'aktiv'
  return (
    <button type="button" onClick={onClick} className="flex h-[36px] items-center gap-[8px] rounded-md border border-elevated bg-surface pl-[8px] pr-[10px] normal-case">
      <span className="flex h-[23px] w-[23px] items-center justify-center rounded-[6px]" style={{ background: active ? '#142f13' : '#402b00', color: active ? '#5bbd52' : '#ffaa00' }}>
        <Icon name={active ? 'sprint' : 'pause'} size={17} />
      </span>
      <span className="text-[17px] font-normal tracking-normal">{active ? 'Aktiv' : 'Pausiert'}</span>
      <Icon name="arrowDown" size={20} className="text-fg-2" />
    </button>
  )
}

export function PlanStatusSheet({ open, onClose, plan }: { open: boolean; onClose: () => void; plan: Plan }) {
  const set = async (status: Plan['status']) => {
    await db.plans.update(plan.id!, status === 'pausiert' ? { status, pausedSince: plan.pausedSince ?? today() } : { status, pausedSince: undefined })
    onClose()
  }
  return (
    <BottomSheet open={open} onClose={onClose} label="Plan-Status">
      <SheetTitle sub="Bei Urlaub oder Krankheit pausieren: Pausierte Tage zählen nicht als verpasst. Danach steigst Du automatisch mit reduzierten Gewichten wieder ein.">Plan-Status</SheetTitle>
      <div className="flex flex-col gap-3 px-6 pb-6">
        <OptionCard title="Aktiv" description="Training läuft nach Plan." descriptionWhenSelected={false} selected={plan.status === 'aktiv'} onClick={() => set('aktiv')} />
        <OptionCard
          title="Pausiert"
          description={plan.status === 'pausiert' && plan.pausedSince ? `Pausiert seit ${formatLong(plan.pausedSince)}.` : 'Keine Trainings, die Serie bleibt erhalten.'}
          descriptionWhenSelected={false}
          selected={plan.status === 'pausiert'}
          onClick={() => set('pausiert')}
        />
      </div>
    </BottomSheet>
  )
}
