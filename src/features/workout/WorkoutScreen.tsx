import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { SubHeader } from '../../components/layout/PageHeader'
import { Icon } from '../../components/icons/Icon'
import { Chip } from '../../components/ui/Chip'
import { Button, BottomBar } from '../../components/ui/Button'
import { ExerciseGlyph } from '../../components/ui/ExerciseGlyph'
import { ProgressSegments } from '../../components/ui/ProgressSegments'
import { ActionSheet } from '../../components/ui/ActionSheet'
import { muscleLabel } from '../../data/muskeln'
import { formatDuration } from '../../logic/dates'
import { WEEK_TYPE_INFO } from '../../logic/progression'
import { estimateMinutes } from '../../logic/planGenerator'
import type { MuscleId } from '../../db/types'
import { db } from '../../db/db'
import { addExerciseToSession, finishSession, removeExerciseFromSession, resetSession, setSessionWeekType, startSession, swapExercise } from '../../db/repo/sessions'
import { WEEK_TYPE_STYLE } from '../training/weekTypeStyle'
import { WeekTypeSheet } from '../training/WeekTypeSheet'
import { CheckinSheet } from './CheckinSheet'
import { ExerciseSheet } from './ExerciseSheet'
import { SwapSheet } from './SwapSheet'
import { prescriptionText, useWorkout, type WorkoutExercise } from './useWorkout'
import { useWakeLock } from '../../lib/wakeLock'
import { unlockAudio } from '../../lib/sound'
import { restTimer } from './restTimer'

/** Workout-Übersicht (S27) und laufendes Training (S33/S35/S45). */
export default function WorkoutScreen() {
  const { id } = useParams()
  const sessionId = Number(id)
  const navigate = useNavigate()
  const data = useWorkout(sessionId)
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [checkin, setCheckin] = useState(false)
  const [typeSheet, setTypeSheet] = useState(false)
  const [swapFor, setSwapFor] = useState<WorkoutExercise | null>(null)
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState(false)
  const [cardMenu, setCardMenu] = useState<WorkoutExercise | null>(null)
  const [, tick] = useState(0)

  const running = data?.session.status === 'laeuft'
  useWakeLock(!!running)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  const muscles = useMemo(() => {
    const ms: MuscleId[] = []
    for (const it of data?.items ?? []) if (!ms.includes(it.exercise.primaer)) ms.push(it.exercise.primaer)
    return ms
  }, [data?.items])

  if (data === undefined) return <div className="h-dvh bg-bg" />
  if (data === null) {
    return (
      <div className="h-dvh bg-bg">
        <SubHeader title="Training" onBack={() => navigate('/training')} />
        <p className="p-6 text-fg-2">Diese Einheit gibt es nicht mehr.</p>
      </div>
    )
  }

  const { session, items } = data
  const finished = session.status === 'fertig'
  const current = session.currentExercise ?? 0
  const openItem = openIdx !== null ? items[openIdx] ?? null : null
  const minutes = session.estMinutes ?? estimateMinutes(items)
  const allDone = items.length > 0 && items.every((i) => i.sets_.length > 0 && i.doneCount >= i.sets_.length)
  const isMobility = session.kind === 'mobility'

  const start = async (c: Parameters<typeof startSession>[1]) => {
    unlockAudio()
    setCheckin(false)
    await startSession(sessionId, c)
    setOpenIdx(openIdx ?? 0)
  }

  const finish = async () => {
    restTimer.skip()
    await finishSession(sessionId)
    navigate(`/workout/${sessionId}/abschluss`, { replace: true })
  }

  const next = async () => {
    const idx = openIdx ?? current
    const nextIdx = items.findIndex((it, i) => i > idx && it.doneCount < Math.max(it.sets, 1))
    const target = nextIdx >= 0 ? nextIdx : items.findIndex((it) => it.doneCount < Math.max(it.sets, 1))
    if (target < 0) return finish()
    await db.sessions.update(sessionId, { currentExercise: target })
    setOpenIdx(null)
    setTimeout(() => setOpenIdx(target), 260)
  }

  const weekStyle = WEEK_TYPE_STYLE[session.weekType]

  return (
    <div className="min-h-dvh bg-bg pb-32">
      <SubHeader
        title={session.name}
        onBack={() => navigate('/training')}
        right={
          !finished && (
            <>
              <button type="button" aria-label="Check-in" onClick={() => setCheckin(true)} className="flex h-10 w-8 items-center justify-center text-fg-2">
                <Icon name="thermostat" size={30} />
              </button>
              <button type="button" aria-label="Menü" onClick={() => setMenu(true)} className="flex h-10 w-8 items-center justify-center text-fg">
                <Icon name="moreVert" size={28} />
              </button>
            </>
          )
        }
      >
        {running && (
          <div className="px-[20px] pb-[14px]">
            <ProgressSegments total={items.length} current={current} done={items.filter((i) => i.doneCount >= i.sets && i.sets_.length).length} accent />
            <div className="mt-[14px] flex items-center justify-between">
              <span className="flex items-baseline gap-3">
                <span className="text-[13px] uppercase tracking-[0.12em] text-fg-2">Zeit</span>
                <span className="text-[24px] font-extrabold tabular-nums">{formatDuration(Date.now() - (session.startedAt ?? Date.now()))}</span>
              </span>
              <span className="flex items-baseline gap-3">
                <span className="text-[13px] uppercase tracking-[0.12em] text-fg-2">Übung</span>
                <span className="text-[24px] font-extrabold">
                  {Math.min(current + 1, items.length)} / {items.length}
                </span>
              </span>
            </div>
          </div>
        )}
      </SubHeader>

      <div className="no-scrollbar flex gap-[10px] overflow-x-auto px-5 pt-[20px]">
        {!isMobility && (
          <Chip icon={weekStyle.icon} tone={session.weekType === 'normal' ? undefined : weekStyle.badge} onClick={() => !finished && setTypeSheet(true)}>
            {WEEK_TYPE_INFO[session.weekType].label}
          </Chip>
        )}
        <Chip icon="schedule">{minutes} Minuten</Chip>
        <Chip icon="location">{session.location === 'gym' ? 'Im Gym' : session.location === 'zuhause' ? 'Zu Hause' : 'Ohne Geräte'}</Chip>
      </div>

      <div className="mt-[20px] flex flex-col gap-4 px-5">
        {isMobility ? (
          <div className="rounded-xl border border-elevated bg-surface pb-2">
            <div className="flex items-center justify-between px-[18px] pt-5">
              <span className="text-[19px] font-semibold">Super-Satz ({items.length})</span>
              <Icon name="edit" size={24} />
            </div>
            {items.map((it, i) => (
              <ExerciseRow key={it.id} it={it} onOpen={() => setOpenIdx(i)} onSwap={() => setSwapFor(it)} onMenu={() => setCardMenu(it)} finished={finished} plain />
            ))}
          </div>
        ) : (
          items.map((it, i) => (
            <ExerciseRow key={it.id} it={it} active={running && i === current} onOpen={() => setOpenIdx(i)} onSwap={() => setSwapFor(it)} onMenu={() => setCardMenu(it)} finished={finished} />
          ))
        )}
      </div>

      {!finished && (
        <BottomBar>
          {running ? (
            <>
              <Button variant="secondary" icon="check" onClick={finish} className="flex-1">
                Beenden
              </Button>
              <Button icon="play" className="flex-1" onClick={() => (allDone ? finish() : setOpenIdx(current))}>
                {allDone ? 'Abschließen' : 'Weiter'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" icon="add" className="flex-1" onClick={() => setAdding(true)}>
                Hinzufügen
              </Button>
              <Button icon="play" className="flex-1" onClick={() => (unlockAudio(), setCheckin(true))}>
                Starten
              </Button>
            </>
          )}
        </BottomBar>
      )}

      <ExerciseSheet
        open={openIdx !== null}
        onClose={() => setOpenIdx(null)}
        session={session}
        item={openItem}
        isLast={items.filter((it, i) => i !== openIdx && it.doneCount < Math.max(it.sets, 1)).length === 0}
        onStart={() => setCheckin(true)}
        onNext={next}
        onFinish={finish}
      />
      <CheckinSheet
        open={checkin}
        onClose={() => setCheckin(false)}
        muscles={isMobility ? [] : muscles}
        initial={session.checkin}
        onDone={async (c) => {
          if (running) {
            setCheckin(false)
            await db.sessions.update(sessionId, { checkin: c })
            const { recomputeSession } = await import('../../db/repo/sessions')
            await recomputeSession(sessionId)
          } else await start(c)
        }}
      />
      <WeekTypeSheet open={typeSheet} onClose={() => setTypeSheet(false)} value={session.weekType} onSave={(t) => setSessionWeekType(sessionId, t)} />
      <SwapSheet open={!!swapFor} onClose={() => setSwapFor(null)} current={swapFor?.exercise ?? null} onPick={(e, scope) => swapFor && swapExercise(swapFor.id!, e.id, scope)} />
      <SwapSheet
        open={adding}
        onClose={() => setAdding(false)}
        current={null}
        mode="hinzufuegen"
        defaultArt={isMobility ? 'mobility' : 'kraft'}
        onPick={async (e) => {
          setAdding(false)
          await addExerciseToSession(sessionId, e.id)
        }}
      />
      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title={session.name}
        items={[
          { label: 'Übung hinzufügen', icon: 'add', onClick: () => setAdding(true) },
          ...(!isMobility ? [{ label: 'Trainingstyp ändern', icon: 'tune' as const, onClick: () => setTypeSheet(true) }] : []),
          { label: 'Check-in ändern', icon: 'thermostat', onClick: () => setCheckin(true) },
          ...(running ? [{ label: 'Training abschließen', icon: 'check' as const, onClick: finish }] : []),
          ...(running ? [{ label: 'Training zurücksetzen', icon: 'restart' as const, danger: true, hint: 'Eingetragene Sätze werden gelöscht.', onClick: () => resetSession(sessionId) }] : []),
        ]}
      />
      <ActionSheet
        open={!!cardMenu}
        onClose={() => setCardMenu(null)}
        title={cardMenu?.exercise.name ?? ''}
        items={[
          { label: 'Übung tauschen', icon: 'swap', onClick: () => cardMenu && setSwapFor(cardMenu) },
          ...(cardMenu && cardMenu.doneCount === 0 ? [{ label: 'Aus diesem Training entfernen', icon: 'delete' as const, danger: true, onClick: () => cardMenu && removeExerciseFromSession(cardMenu.id!) }] : []),
        ]}
      />
    </div>
  )
}

function ExerciseRow({ it, onOpen, onSwap, onMenu, active, finished, plain }: { it: WorkoutExercise; onOpen: () => void; onSwap: () => void; onMenu: () => void; active?: boolean; finished?: boolean; plain?: boolean }) {
  const done = it.sets_.length > 0 && it.doneCount >= it.sets_.length
  const highlight = it.adjustments.find((a) => a.kind !== 'manuell' && a.kind !== 'wochentyp' && a.field === 'weight')
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onContextMenu={(e) => (e.preventDefault(), onMenu())}
      className={`flex min-h-[108px] items-center gap-[14px] py-[16px] pl-[16px] pr-[10px] active:opacity-80 ${plain ? '' : 'rounded-xl border bg-surface'} ${active ? 'border-[#3a3a3a]' : 'border-elevated'}`}
      style={plain ? undefined : { background: 'linear-gradient(90deg, #151515 0%, #0f0f0f 45%)' }}
    >
      <span className="flex h-[64px] w-[78px] shrink-0 items-center justify-center">
        <ExerciseGlyph exercise={it.exercise} size={52} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-light text-fg-2">{muscleLabel(it.exercise.primaer)}</span>
        <span className="mt-[3px] block text-[18.5px] font-semibold leading-[1.2]">{it.exercise.name}</span>
        <span className="mt-[5px] block text-[15px] font-light text-fg-2">{prescriptionText(it)}</span>
        {highlight && !finished && (
          <span className="mt-[5px] flex items-center gap-1 text-[13.5px] text-amber">
            <Icon name="wand" size={16} gradient={['#f3af3d', '#ed774d']} />
            <span className="truncate">{highlight.reason.split(',')[0]}</span>
          </span>
        )}
      </span>
      {done ? (
        <Icon name="checkCircle" size={30} style={{ color: '#5bbd52' }} />
      ) : (
        !finished && (
          <button
            type="button"
            aria-label="Übung tauschen"
            onClick={(e) => {
              e.stopPropagation()
              onSwap()
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-fg"
          >
            <Icon name="swap" size={30} />
          </button>
        )
      )}
    </div>
  )
}
