import { BottomSheet, SheetTitle } from './BottomSheet'
import { Icon, type IconName } from '../icons/Icon'

export interface ActionItem {
  label: string
  icon: IconName
  onClick: () => void
  danger?: boolean
  hint?: string
}

/** Menü als Bottom-Sheet (für ⋮ und •••). */
export function ActionSheet({ open, onClose, title, items }: { open: boolean; onClose: () => void; title: string; items: ActionItem[] }) {
  return (
    <BottomSheet open={open} onClose={onClose} label={title}>
      <SheetTitle>{title}</SheetTitle>
      <div className="mx-4 mb-6 overflow-hidden rounded-xl bg-surface-2">
        {items.map((it, i) => (
          <button
            key={it.label}
            type="button"
            onClick={() => {
              onClose()
              it.onClick()
            }}
            className={`flex w-full items-center gap-4 px-4 py-[15px] text-left active:bg-white/5 ${i < items.length - 1 ? 'border-b border-elevated' : ''} ${it.danger ? 'text-danger' : 'text-fg'}`}
          >
            <Icon name={it.icon} size={24} className={it.danger ? '' : 'text-fg-2'} />
            <span className="flex-1">
              <span className="block text-[17px] font-semibold">{it.label}</span>
              {it.hint && <span className="block text-label text-fg-2">{it.hint}</span>}
            </span>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
