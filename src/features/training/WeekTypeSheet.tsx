import { useEffect, useState } from 'react'
import type { WeekType } from '../../db/types'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { IconTile } from '../../components/ui/IconTile'
import { Icon } from '../../components/icons/Icon'
import { WEEK_TYPE_INFO } from '../../logic/progression'
import { WEEK_TYPE_STYLE } from './weekTypeStyle'

const ORDER: WeekType[] = ['intro', 'normal', 'overreaching', 'peak', 'deload']

/** „TRAININGSTYP ANPASSEN“ (S29) – für eine Einheit oder eine ganze Woche. */
export function WeekTypeSheet({
  open,
  onClose,
  value,
  onSave,
  scope = 'training',
  autoType,
  manual,
  onReset,
  subtitle,
}: {
  open: boolean
  onClose: () => void
  value: WeekType
  onSave: (t: WeekType) => void
  scope?: 'training' | 'woche'
  /** Automatischer Typ der Woche (für „automatisch“-Hinweis) */
  autoType?: WeekType
  /** Woche ist von Hand geändert */
  manual?: boolean
  onReset?: () => void
  subtitle?: string
}) {
  const [sel, setSel] = useState(value)
  useEffect(() => {
    if (open) setSel(value)
  }, [open, value])
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="Trainingstyp anpassen"
      footer={
        <div className="flex flex-col gap-2">
          {manual && onReset && (
            <Button
              variant="secondary"
              icon="restart"
              onClick={() => {
                onReset()
                onClose()
              }}
            >
              Automatisch ({autoType ? WEEK_TYPE_INFO[autoType].label : ''})
            </Button>
          )}
          <Button
            disabled={sel === value}
            onClick={() => {
              onSave(sel)
              onClose()
            }}
          >
            Speichern
          </Button>
        </div>
      }
    >
      <SheetTitle sub={subtitle ?? (scope === 'training' ? 'Gilt nur für dieses Training.' : 'Gilt für alle Trainings dieser Woche. Die folgenden Wochen laufen normal weiter.')}>
        {scope === 'training' ? 'Trainingstyp anpassen' : 'Wochentyp anpassen'}
      </SheetTitle>
      <div className="flex flex-col gap-[12px] px-6 pb-4">
        {ORDER.map((t) => {
          const s = WEEK_TYPE_STYLE[t]
          const on = sel === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => setSel(t)}
              className="flex min-h-[82px] items-center gap-4 rounded-lg border-2 px-4 text-left"
              style={{ borderColor: on ? s.color : '#262626', background: '#0f0f0f' }}
            >
              <IconTile icon={s.icon} color={s.color} bg={s.bg} size={36} className="!h-[40px] !w-[40px] rounded-[9px]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[21px] font-semibold leading-tight">
                  {WEEK_TYPE_INFO[t].label}
                  {autoType === t && scope === 'woche' && <span className="ml-2 align-middle text-[12px] font-semibold uppercase tracking-[0.05em] text-fg-2">automatisch</span>}
                </span>
                <span className="mt-1 block text-[16.5px] leading-snug text-fg-2">{WEEK_TYPE_INFO[t].text}</span>
              </span>
              {on && (
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full" style={{ background: s.color, color: '#0f0f0f' }}>
                  <Icon name="check" size={20} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
