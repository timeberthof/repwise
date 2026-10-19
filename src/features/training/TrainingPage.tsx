import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useSearchParams } from 'react-router'
import { PageHeader } from '../../components/layout/PageHeader'
import { StreakBadge } from '../../components/ui/Flame'
import { Icon } from '../../components/icons/Icon'
import { ActionSheet } from '../../components/ui/ActionSheet'
import { useStreak, loadDoneDates } from '../../db/derived'
import { db } from '../../db/db'
import { usePlanFor } from '../../db/hooks'
import { upcomingPlan } from '../../db/repo/plan'
import { setWeekOverride, isoWeek } from '../../db/repo/cycle'
import { dayEntries, ensureSession, moveSession, skipSession, setSessionWeekType, type DayEntry } from '../../db/repo/sessions'
import { addDays, formatDate, formatLong, startOfWeek, today, weekDates, weekdayIndex, WEEKDAYS_LONG } from '../../logic/dates'
import { isLastCycleWeek, weekTypeFor, autoWeekType } from '../../logic/cycle'
import { WEEK_TYPE_INFO } from '../../logic/progression'
import { WeekStrip, type DayMarker } from './WeekStrip'
import { SessionCard } from './SessionCard'
import { WeekTypeSheet } from './WeekTypeSheet'
import { PlanStatusChip, PlanStatusSheet } from './PlanStatus'
import { MesoCard } from './MesoCard'
import { WeekOverview, type WeekData } from './WeekOverview'
import { WEEK_TYPE_STYLE } from './weekTypeStyle'
import { CardioCards } from '../cardio/CardioCards'

async function loadWeek(selected: string): Promise<WeekData & { weekStart: string }> {
  const dates = weekDates(selected)
  const days = await Promise.all(dates.map(async (d) => ({ date: d, entries: await dayEntries(d) })))
  const sessions = await db.sessions.where('date').between(dates[0], dates[6], true, true).filter((s) => s.status === 'fertig' && !s.imported).toArray()
  const stats: WeekData['stats'] = {}
  let sets = 0
  let volume = 0
  const setLists = await Promise.all(sessions.map((s) => db.sets.where('sessionId').equals(s.id!).filter((x) => x.done).toArray()))
  sessions.forEach((s, i) => {
    const done = setLists[i]
    const v = done.reduce((sum, x) => sum + (x.weight ?? 0) * x.reps, 0)
    stats[s.id!] = { sets: done.length, volume: Math.round(v), minutes: s.startedAt && s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) : null }
    if (s.kind === 'kraft') {
      sets += done.length
      volume += v
    }
  })
  return { weekStart: dates[0], days, sets, volume, stats }
}

export function TrainingPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const streak = useStreak()
  const [selected, setSelected] = useState(today())
  const plan = usePlanFor(selected)
  const nextPlan = useLiveQuery(() => upcomingPlan(today()), [])
  const [menuFor, setMenuFor] = useState<DayEntry | null>(null)
  const [typeFor, setTypeFor] = useState<DayEntry | null>(null)
  const [moveFor, setMoveFor] = useState<DayEntry | null>(null)
  const [weekMenu, setWeekMenu] = useState(false)
  const [weekType, setWeekType] = useState(false)
  const [status, setStatus] = useState(false)

  // Sprung aus der Zyklusübersicht: /training?d=JJJJ-MM-TT
  useEffect(() => {
    const d = params.get('d')
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setSelected(d)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const loaded = useLiveQuery(() => loadWeek(selected), [selected, plan?.id, plan?.weekOverrides, plan?.status])
  // Während eine andere Woche lädt, nicht die alte Woche anzeigen
  const week = loaded && loaded.weekStart === startOfWeek(selected) ? loaded : undefined
  const entries = week?.days.find((d) => d.date === selected)?.entries
  const done = useLiveQuery(loadDoneDates, [])
  const markers: Record<string, DayMarker> = {}
  for (const d of week?.days ?? []) {
    markers[d.date] = {
      kraft: d.entries.some((e) => e.kind === 'kraft' && e.session?.status !== 'uebersprungen'),
      mobility: d.entries.some((e) => e.kind === 'mobility' && e.session?.status !== 'uebersprungen'),
      done: !!done?.has(d.date),
    }
  }

  const open = async (e: DayEntry) => {
    const st = e.session?.status
    if (st === 'fertig' || e.session?.imported) return navigate(`/verlauf/${e.session!.id}`)
    if (e.session?.id) return navigate(`/workout/${e.session.id}`)
    if (!e.planDay?.id) return
    if (e.date > today()) return navigate(`/vorschau/${e.date}/${e.planDay.id}`)
    navigate(`/workout/${await ensureSession(e.date, e.planDay.id)}`)
  }

  const t = today()
  const weekStart = startOfWeek(selected)
  const isCurrentWeek = weekStart === startOfWeek(t)
  const mode: 'vergangen' | 'aktuell' | 'kommend' = isCurrentWeek ? 'aktuell' : weekStart < startOfWeek(t) ? 'vergangen' : 'kommend'
  const wt = plan && selected >= plan.startDate ? weekTypeFor(plan, selected) : null
  const lastWeek = plan && !nextPlan && isCurrentWeek ? isLastCycleWeek(plan, t) : false
  const jumpWeek = (n: number) => setSelected(n === 0 ? t : addDays(weekStart, n * 7 + (weekdayIndex(selected) ?? 0)))

  return (
    <div className="min-h-full bg-bg">
      <PageHeader
        title={
          <span className="flex items-center gap-[18px]">
            Training
            {plan && <PlanStatusChip status={plan.status} onClick={() => setStatus(true)} />}
          </span>
        }
        tone="surface"
        right={<StreakBadge value={streak} />}
      >
        <div className="flex h-[44px] items-center justify-between px-4">
          <span className="text-[17px] font-light text-fg-2">{formatLong(selected)}</span>
          <span className="flex items-center gap-2">
            {selected !== t && (
              <button type="button" onClick={() => setSelected(t)} className="h-[30px] rounded-md border border-elevated px-3 text-[14px] font-semibold text-fg">
                Heute
              </button>
            )}
            <button type="button" aria-label="Wochenmenü" onClick={() => setWeekMenu(true)} className="-mr-1 flex h-8 w-10 items-center justify-center text-fg">
              <Icon name="moreHoriz" size={30} />
            </button>
          </span>
        </div>
        <div className="flex items-center gap-2 px-2 pb-[10px]">
          <button type="button" aria-label="Vorherige Woche" onClick={() => jumpWeek(-1)} className="flex h-10 w-10 items-center justify-center text-fg">
            <Icon name="chevronLeft" size={20} />
          </button>
          <button type="button" onClick={() => navigate('/zyklus')} className="min-w-0 flex-1 text-center" aria-label="Zyklusübersicht öffnen">
            <span className="block truncate text-[15px] font-semibold">
              KW {isoWeek(weekStart)} · {formatDate(weekStart).slice(0, 6)}–{formatDate(addDays(weekStart, 6))}
            </span>
            <span className="block truncate text-[13px] text-fg-2">
              {wt && plan ? (
                <>
                  Woche {(wt.index % plan.cycleWeeks) + 1} von {plan.cycleWeeks} ·{' '}
                  <span style={{ color: WEEK_TYPE_STYLE[wt.type].badge }}>{WEEK_TYPE_INFO[wt.type].label}</span>
                  {wt.manual ? ' (manuell)' : ''}
                  {mode === 'kommend' ? ' · Vorschau' : mode === 'vergangen' ? ' · vergangen' : ''}
                </>
              ) : plan ? (
                `Plan startet am ${formatLong(plan.startDate)}`
              ) : (
                'Kein Plan'
              )}
            </span>
          </button>
          <button type="button" aria-label="Nächste Woche" onClick={() => jumpWeek(1)} className="flex h-10 w-10 items-center justify-center text-fg">
            <Icon name="chevronRight" size={20} />
          </button>
        </div>
        <WeekStrip selected={selected} onSelect={setSelected} markers={markers} />
      </PageHeader>

      <div className="flex flex-col gap-4 px-4 pt-4">
        {lastWeek && <MesoCard onOptimize={() => navigate('/zyklus/planen')} />}
        {week && <WeekOverview key={weekStart} data={week} selected={selected} onSelect={setSelected} mode={mode} />}
        {entries?.map((e) => (
          <SessionCard key={e.key} entry={e} stats={e.session?.id ? week?.stats[e.session.id] : undefined} onOpen={() => open(e)} onMenu={() => setMenuFor(e)} />
        ))}
        {entries && !entries.length && (
          <div className="rounded-xl border border-elevated bg-surface px-4 py-6 text-center text-body text-fg-2">
            {plan && selected < plan.startDate ? `Dein Plan startet am ${formatLong(plan.startDate)}.` : 'Ruhetag – Zeit für Erholung.'}
          </div>
        )}
        <CardioCards date={selected} />
        <button type="button" onClick={() => navigate(`/cardio/neu?datum=${selected}`)} className="flex h-[66px] items-center gap-[22px] rounded-xl border border-elevated bg-surface px-4 text-left active:opacity-80">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-tile">
            <Icon name="add" size={24} />
          </span>
          <span className="text-[20px] font-semibold">Aktivität hinzufügen</span>
        </button>
        <button type="button" onClick={() => navigate('/verlauf')} className="flex h-[66px] items-center gap-[22px] rounded-xl border border-elevated bg-surface px-4 text-left active:opacity-80">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-tile">
            <Icon name="bookmark" size={20} />
          </span>
          <span className="text-[20px] font-semibold">Gespeicherte Trainings</span>
        </button>
      </div>

      <ActionSheet
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor?.name ?? ''}
        items={
          menuFor
            ? [
                ...(menuFor.kind === 'kraft' && menuFor.session?.status !== 'fertig' && menuFor.date >= t
                  ? [{ label: 'Trainingstyp ändern', icon: 'tune' as const, hint: 'Nur für diese Einheit', onClick: () => setTypeFor(menuFor) }]
                  : []),
                ...(menuFor.planDay && menuFor.session?.status !== 'fertig'
                  ? [
                      { label: 'Auf anderen Tag verschieben', icon: 'eventRepeat' as const, onClick: () => setMoveFor(menuFor) },
                      {
                        label: menuFor.session?.status === 'uebersprungen' ? 'Doch trainieren' : 'Überspringen',
                        icon: 'skipNext' as const,
                        onClick: async () => {
                          if (menuFor.session?.status === 'uebersprungen') await db.sessions.update(menuFor.session.id!, { status: 'geplant' })
                          else await skipSession(menuFor.date, menuFor.planDay!.id!)
                        },
                      },
                    ]
                  : []),
                { label: menuFor.date > t && !menuFor.session ? 'Vorschau öffnen' : 'Öffnen', icon: 'arrowForward' as const, onClick: () => open(menuFor) },
              ]
            : []
        }
      />

      <WeekTypeSheet
        open={!!typeFor}
        onClose={() => setTypeFor(null)}
        value={typeFor?.weekType ?? 'normal'}
        onSave={async (type) => {
          if (!typeFor?.planDay) return
          const id = typeFor.session?.id ?? (await ensureSession(typeFor.date, typeFor.planDay.id!))
          await setSessionWeekType(id, type)
        }}
      />

      <ActionSheet
        open={weekMenu}
        onClose={() => setWeekMenu(false)}
        title={`KW ${isoWeek(weekStart)}`}
        items={[
          ...(plan && wt && mode !== 'vergangen'
            ? [
                { label: 'Wochentyp ändern', icon: 'tune' as const, hint: `Woche ${(wt.index % plan.cycleWeeks) + 1} von ${plan.cycleWeeks}: ${WEEK_TYPE_INFO[wt.type].label}${wt.manual ? ' (manuell)' : ' (automatisch)'}`, onClick: () => setWeekType(true) },
                ...(wt.type === 'deload' ? [{ label: 'Deload überspringen', icon: 'skipNext' as const, hint: 'Durch eine normale Woche ersetzen', onClick: () => setWeekOverride(plan, wt.index, 'normal') }] : []),
                ...(wt.manual ? [{ label: `Auf automatisch zurücksetzen (${WEEK_TYPE_INFO[autoWeekType(wt.index, plan.cycleWeeks)].label})`, icon: 'restart' as const, onClick: () => setWeekOverride(plan, wt.index, null) }] : []),
              ]
            : []),
          { label: 'Zyklusübersicht', icon: 'calendar' as const, onClick: () => navigate('/zyklus') },
          { label: 'Trainingsplan bearbeiten', icon: 'settings' as const, onClick: () => navigate('/einstellungen/trainingsplan') },
          { label: 'Zu heute springen', icon: 'today' as const, onClick: () => setSelected(t) },
        ]}
      />

      {plan && wt && (
        <WeekTypeSheet
          open={weekType}
          onClose={() => setWeekType(false)}
          scope="woche"
          value={wt.type}
          manual={wt.manual}
          autoType={autoWeekType(wt.index, plan.cycleWeeks)}
          onReset={() => setWeekOverride(plan, wt.index, null)}
          onSave={(type) => setWeekOverride(plan, wt.index, type)}
        />
      )}

      <ActionSheet
        open={!!moveFor}
        onClose={() => setMoveFor(null)}
        title="Verschieben auf"
        items={[...weekDates(selected), ...weekDates(addDays(selected, 7))]
          .filter((d) => d !== moveFor?.date && d >= t)
          .slice(0, 8)
          .map((d) => ({
            label: `${WEEKDAYS_LONG[weekdayIndex(d)]}${d === t ? ' (heute)' : ''}`,
            hint: formatLong(d),
            icon: 'event' as const,
            onClick: async () => {
              if (moveFor?.planDay) {
                await moveSession(moveFor.date, moveFor.planDay.id!, d)
                setSelected(d)
              }
            },
          }))}
      />

      {plan && <PlanStatusSheet open={status} onClose={() => setStatus(false)} plan={plan} />}
    </div>
  )
}
