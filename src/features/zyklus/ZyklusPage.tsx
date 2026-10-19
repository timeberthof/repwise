import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { SubHeader } from '../../components/layout/PageHeader'
import { Icon } from '../../components/icons/Icon'
import { IconTile } from '../../components/ui/IconTile'
import { Badge } from '../../components/ui/Chip'
import { Button } from '../../components/ui/Button'
import { ActionSheet } from '../../components/ui/ActionSheet'
import { usePlanFor } from '../../db/hooks'
import { upcomingPlan } from '../../db/repo/plan'
import { cycleWeeks, setWeekOverride, type CycleWeek } from '../../db/repo/cycle'
import { addDays, formatDate, formatLong, today } from '../../logic/dates'
import { weekIndex } from '../../logic/cycle'
import { WEEK_TYPE_INFO } from '../../logic/progression'
import { WEEK_TYPE_STYLE } from '../training/weekTypeStyle'
import { WeekTypeSheet } from '../training/WeekTypeSheet'

/** Zyklusübersicht: 6 Wochen mit Wochentyp, manuelle Änderungen, nächster Zyklus. */
export default function ZyklusPage() {
  const navigate = useNavigate()
  const plan = usePlanFor(today())
  const next = useLiveQuery(() => upcomingPlan(today()), [])
  const [cycleNo, setCycleNo] = useState<number | null>(null)
  const [menu, setMenu] = useState<CycleWeek | null>(null)
  const [edit, setEdit] = useState<CycleWeek | null>(null)

  const curIdx = plan ? Math.max(0, weekIndex(plan, today())) : 0
  const currentCycle = plan ? Math.floor(curIdx / plan.cycleWeeks) : 0
  useEffect(() => {
    if (plan && cycleNo === null) setCycleNo(currentCycle)
  }, [plan, cycleNo, currentCycle])
  const shown = cycleNo ?? currentCycle
  const weeks = useLiveQuery(() => (plan ? cycleWeeks(plan, shown) : Promise.resolve([] as CycleWeek[])), [plan, shown])

  if (!plan) return <div className="h-dvh bg-bg" />
  const cur = weeks?.find((w) => w.status === 'aktuell')
  const nextWeek = weeks?.find((w) => w.index === curIdx + 1)
  const cycleStart = addDays(plan.startDate, shown * plan.cycleWeeks * 7)
  const cycleEnd = addDays(cycleStart, plan.cycleWeeks * 7 - 1)
  const nextCycleStart = addDays(cycleEnd, 1)

  return (
    <div className="min-h-dvh bg-bg pb-16">
      <SubHeader title="Zyklus" onBack={() => navigate(-1)} />

      <div className="mx-4 mt-4 rounded-xl border border-elevated bg-surface px-4 py-4">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Vorheriger Zyklus" disabled={shown <= 0} onClick={() => setCycleNo(shown - 1)} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-elevated disabled:opacity-30">
            <Icon name="chevronLeft" size={18} />
          </button>
          <div className="text-center">
            <p className="text-[19px] font-semibold">Zyklus {shown + 1}</p>
            <p className="text-[14px] text-fg-2">
              {formatDate(cycleStart)} – {formatDate(cycleEnd)}
            </p>
          </div>
          <button type="button" aria-label="Nächster Zyklus" onClick={() => setCycleNo(shown + 1)} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-elevated">
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
        {shown === currentCycle && cur && (
          <div className="mt-4 rounded-lg bg-surface-2 px-4 py-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.05em] text-fg-2">Aktuell</p>
            <p className="mt-1 text-[18px] font-semibold">
              Woche {cur.number} von {plan.cycleWeeks} · {WEEK_TYPE_INFO[cur.type].label}
              {cur.manual && <span className="ml-2 align-middle text-[12px] font-semibold uppercase text-amber">manuell</span>}
            </p>
            <p className="mt-1 text-[14px] text-fg-2">
              {nextWeek ? `Als Nächstes: ${WEEK_TYPE_INFO[nextWeek.type].label} ab ${formatLong(nextWeek.start)}` : `Als Nächstes: neuer Zyklus ab ${formatLong(nextCycleStart)} (beginnt mit Intro)`}
            </p>
          </div>
        )}
        {shown !== currentCycle && (
          <button type="button" onClick={() => setCycleNo(currentCycle)} className="mt-3 w-full text-center text-[14px] font-semibold text-amber">
            Zum aktuellen Zyklus
          </button>
        )}
      </div>

      <div className="mx-4 mt-4 flex flex-col gap-[10px]">
        {weeks?.map((w) => {
          const s = WEEK_TYPE_STYLE[w.type]
          return (
            <button
              key={w.index}
              type="button"
              onClick={() => setMenu(w)}
              className={`flex items-center gap-4 rounded-xl border bg-surface px-4 py-[14px] text-left active:opacity-80 ${w.status === 'aktuell' ? 'border-orange' : 'border-elevated'} ${w.status === 'vergangen' ? 'opacity-70' : ''}`}
            >
              <IconTile icon={s.icon} color={s.color} bg={s.bg} size={36} className="!h-[40px] !w-[40px]" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[17px] font-semibold">Woche {w.number}</span>
                  <span className="text-[17px] font-semibold" style={{ color: s.badge }}>
                    {WEEK_TYPE_INFO[w.type].label}
                  </span>
                  {w.manual && <Badge color="#f3af3d">Manuell</Badge>}
                </span>
                <span className="mt-[2px] block text-[13.5px] text-fg-2">
                  KW {w.kw} · {formatDate(w.start).slice(0, 6)}–{formatDate(w.end).slice(0, 6)}
                  {w.manual ? ` · automatisch: ${WEEK_TYPE_INFO[w.auto].label}` : ''}
                </span>
                <span className="mt-[2px] block text-[13.5px] text-fg-2">
                  {w.status === 'vergangen' ? `${w.done} von ${w.planned} Einheiten absolviert` : w.status === 'aktuell' ? `läuft · ${w.done} von ${w.planned} absolviert` : `Vorschau · ${w.planned} Einheiten geplant`}
                </span>
              </span>
              <Icon name="chevronRight" size={22} className="text-fg-2" />
            </button>
          )
        })}
      </div>

      <div className="mx-4 mt-5 rounded-xl bg-surface px-4 py-4 text-[14px] leading-snug text-fg-2">
        <p className="font-semibold text-fg">So funktioniert der Zyklus</p>
        <p className="mt-1">
          6 Wochen: Intro → Normal → Normal → Overreaching → Peak Week → Deload. Danach beginnt automatisch der nächste Zyklus. Eine Änderung gilt nur für diese eine Woche – alle anderen Wochen und der Start des nächsten Zyklus bleiben unverändert.
        </p>
      </div>

      <div className="mx-4 mt-4">
        {next ? (
          <div className="rounded-xl border border-elevated bg-surface px-4 py-4 text-[15px]">
            <p className="font-semibold">Neuer Plan steht bereit</p>
            <p className="mt-1 text-fg-2">Startet am {formatLong(next.startDate)} mit einer Intro-Woche.</p>
          </div>
        ) : (
          <Button icon="chevronRight" onClick={() => navigate('/zyklus/planen')}>
            Nächsten Zyklus planen
          </Button>
        )}
      </div>

      <ActionSheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu ? `Woche ${menu.number} · ${WEEK_TYPE_INFO[menu.type].label}` : ''}
        items={
          menu
            ? [
                { label: 'Woche ansehen', icon: 'event' as const, hint: `${formatDate(menu.start)} – ${formatDate(menu.end)}`, onClick: () => navigate(`/training?d=${menu.start <= today() && today() <= menu.end ? today() : menu.start}`) },
                ...(menu.status !== 'vergangen'
                  ? [
                      { label: 'Wochentyp ändern', icon: 'tune' as const, onClick: () => setEdit(menu) },
                      ...(menu.type === 'deload' ? [{ label: 'Deload überspringen', icon: 'skipNext' as const, hint: 'Durch eine normale Woche ersetzen', onClick: () => setWeekOverride(plan, menu.index, 'normal') }] : []),
                      ...(menu.manual ? [{ label: `Auf automatisch zurücksetzen (${WEEK_TYPE_INFO[menu.auto].label})`, icon: 'restart' as const, onClick: () => setWeekOverride(plan, menu.index, null) }] : []),
                    ]
                  : []),
              ]
            : []
        }
      />
      <WeekTypeSheet
        open={!!edit}
        onClose={() => setEdit(null)}
        scope="woche"
        value={edit?.type ?? 'normal'}
        autoType={edit?.auto}
        manual={edit?.manual}
        onReset={() => edit && setWeekOverride(plan, edit.index, null)}
        onSave={(t) => edit && setWeekOverride(plan, edit.index, t)}
        subtitle={edit ? `Woche ${edit.number} (${formatDate(edit.start)} – ${formatDate(edit.end)}). Die folgenden Wochen laufen normal weiter.` : undefined}
      />
    </div>
  )
}
