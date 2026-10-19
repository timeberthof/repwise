import type { ReactNode } from 'react'
import { BottomSheet, SheetTitle } from './BottomSheet'
import { Button } from './Button'

/** Sicherheitsabfrage als Sheet. */
export function ConfirmSheet({
  open,
  onClose,
  title,
  text,
  confirmLabel,
  onConfirm,
  danger = true,
}: {
  open: boolean
  onClose: () => void
  title: string
  text: ReactNode
  confirmLabel: string
  onConfirm: () => void
  danger?: boolean
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label={title}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={() => {
              onClose()
              onConfirm()
            }}
            className={danger ? '!bg-danger !text-fg' : ''}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <SheetTitle>{title}</SheetTitle>
      <div className="px-6 pb-4 text-[17px] leading-snug text-fg">{text}</div>
    </BottomSheet>
  )
}
