import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { SubHeader } from '../../components/layout/PageHeader'
import { Icon } from '../../components/icons/Icon'
import { Button } from '../../components/ui/Button'
import { Flame } from '../../components/ui/Flame'
import { ExerciseGlyph } from '../../components/ui/ExerciseGlyph'
import { BodyMap } from '../../components/ui/BodyMap'
import { useToast } from '../../components/ui/Toast'
import { db } from '../../db/db'
import { finishSummary, type FinishSummary } from '../../db/repo/sessions'
import { computeStreak, loadDoneDates } from '../../db/derived'
import { planForDate } from '../../db/repo/plan'
import { getExercise } from '../../data/exercises'
import { addDays, parseISO, today, WEEKDAYS_SHORT, weekdayIndex } from '../../logic/dates'
import { dayState } from '../../logic/streak'
import { fmt } from '../../logic/format'
import type { MuscleId } from '../../db/types'
import { SmoothStrengthChart } from '../statistik/charts'

/** Trainingsabschluss (S46–S49): Serie, Kennzahlen, trainierte Muskeln, Maximalkraft. */
export default function SummaryScreen() {
  const { id } = useParams()
  const sessionId = Number(id)
  const navigate = useNavigate()
  const toast = useToast()
  const [sum, setSum] = useState<FinishSummary | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId])
  const info = useLiveQuery(async () => {
    const profile = (await db.profile.get('me')) ?? null
    const plan = await planForDate(today())
    return { streak: await computeStreak(profile, plan), done: await loadDoneDates(), weekdays: profile?.weekdays ?? [] }
  }, [])

  useEffect(() => {
    finishSummary(sessionId).then(setSum)
  }, [sessionId])

  const confetti = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: Math.round((i * 37) % 100),
        delay: (i % 9) * 0.18,
        dx: ((i * 53) % 80) - 40,
        color: i % 3 === 0 ? '#ed774d' : '#f3ae3c',
        w: 3 + (i % 3) * 2,
      })),
    [],
  )

  if (!session || !sum || !info) return <div className="h-dvh bg-bg" />
  const day = session.date
  const days = Array.from({ length: 7 }, (_, i) => addDays(day, i - 3))
  const streak = info.streak
  const highlighted = sum.muscles as MuscleId[]

  const share = async () => {
    const lines = [
      `${session.name} · ${parseISO(session.date).toLocaleDateString('de-DE')}`,
      `${fmt(sum.movedKg)} kg bewegt · ${sum.minutes} Min · ${sum.sets} Sätze`,
      ...sum.strength.filter((s) => s.record).map((s) => `🏆 ${getExercise(s.exerciseId)?.name}: ${fmt(s.after)} kg`),
      `Serie: ${streak}`,
    ]
    try {
      if (navigator.share) await navigator.share({ title: 'Repwise', text: lines.join('\n') })
      else {
        await navigator.clipboard.writeText(lines.join('\n'))
        toast('Kopiert', 'Die Zusammenfassung liegt in der Zwischenablage.')
      }
    } catch {
      /* abgebrochen */
    }
  }

  return (
    <div className="min-h-dvh bg-bg pb-[170px]">
      <SubHeader title={session.name} onBack={() => navigate('/training')} right={<button type="button" aria-label="Teilen" onClick={share} className="flex h-10 w-10 items-center justify-center"><Icon name="share" size={30} /></button>} />

      <div className="relative overflow-hidden">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="pointer-events-none absolute top-0 rounded-[1px]"
            style={{ left: `${c.left}%`, width: c.w, height: c.w * 2, background: c.color, animation: `confetti-fall 2.6s ${c.delay}s ease-in forwards`, ['--dx' as string]: `${c.dx}px`, opacity: 0 }}
          />
        ))}
        <div className="flex flex-col items-center pt-[24px]">
          <div className="flex h-[95px] w-[95px] items-center justify-center rounded-full" style={{ background: 'radial-gradient(circle, #8e472e 0%, #6c3623 100%)', boxShadow: '0 6px 26px 4px rgba(120,52,30,0.55)', animation: 'pop-in 0.6s ease-out' }}>
            <Flame size={46} />
          </div>
          <p className="mt-[16px] text-[68px] font-black leading-none" style={{ background: 'linear-gradient(180deg,#c56340 0%,#753924 100%)', WebkitBackgroundClip: 'text', color: 'transparent', animation: 'pop-in 0.7s 0.1s ease-out both' }}>
            {streak}
          </p>
          <p className="mt-[14px] text-[22px] font-extrabold">{streak <= 1 ? 'Streak gestartet!' : 'Streak verlängert!'}</p>
        </div>

        <div className="mx-5 mt-[16px] rounded-xl border border-elevated bg-surface px-3 pb-[14px] pt-[12px]">
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const st = d === day ? 'today' : dayState(d, day, info.done, info.weekdays)
              const future = d > day
              return (
                <div key={d} className="flex flex-col items-center gap-[12px]">
                  <span className={`text-[16px] ${future ? 'text-fg-2' : 'text-fg'}`}>{WEEKDAYS_SHORT[weekdayIndex(d)]}</span>
                  {st === 'rest' ? (
                    <span className="flex h-[24px] items-center text-[16px]">{parseISO(d).getDate()}</span>
                  ) : (
                    <span className={`flex h-[24px] w-[24px] items-center justify-center rounded-xs ${st === 'today' ? 'outline outline-[4px] outline-[#3b231a]' : ''}`} style={{ background: st === 'done' || st === 'today' ? '#ed774d' : st === 'missed' ? '#828282' : '#282828', color: st === 'future' ? '#1e1e1e' : '#000' }}>
                      <Icon name={st === 'missed' ? 'close' : 'check'} size={18} />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-[18px] text-center text-[16px]">
            {streak <= 1 ? (
              <>
                Glückwunsch! Du hast deine <b className="text-orange">Streak</b> gestartet!
              </>
            ) : (
              <>
                Deine <b className="text-orange">Streak</b> steht bei {streak} Trainings!
              </>
            )}
          </p>
        </div>

        <div className="mx-5 mt-[12px] grid grid-cols-3 rounded-xl border border-elevated bg-surface px-2 py-[12px] text-center">
          <div>
            <p className="text-[21px] font-extrabold leading-tight">{fmt(sum.movedKg)} kg</p>
            <p className="text-[16px]">Bewegt</p>
          </div>
          <div>
            <p className="text-[21px] font-extrabold leading-tight">
              {Math.floor(sum.minutes / 60)}:{String(sum.minutes % 60).padStart(2, '0')} h
            </p>
            <p className="text-[16px]">Dauer</p>
          </div>
          <div>
            <p className="text-[21px] font-extrabold leading-tight">{sum.sets}</p>
            <p className="text-[16px]">Sets</p>
          </div>
        </div>
      </div>

      <div className="mx-5 mt-[16px] rounded-xl border border-elevated bg-surface px-4 py-[18px]">
        <p className="text-[19px] font-semibold">Trainierte Muskeln</p>
        <div className="mt-4 flex justify-around">
          <BodyMap highlight={highlighted} view="front" size={170} on="#ed774d" />
          <BodyMap highlight={highlighted} view="back" size={170} on="#ed774d" />
        </div>
      </div>

      {sum.strength.length > 0 && (
        <>
          <p className="mx-5 mt-[28px] flex items-center gap-3 text-flow font-semibold">
            Maximalkraft
            <button type="button" aria-label="Info" onClick={() => toast('Maximalkraft', 'Geschätztes Gewicht für eine Wiederholung: Gewicht × (1 + (Wdh + RIR) / 30), Durchschnitt über alle Sätze dieser Einheit.')}>
              <Icon name="info" size={26} />
            </button>
          </p>
          <div className="mt-[14px] flex flex-col gap-[14px] px-5">
            {sum.strength.map((s) => {
              const ex = getExercise(s.exerciseId)!
              const isOpen = open === s.exerciseId
              return (
                <div key={s.exerciseId} className="rounded-xl border border-elevated bg-surface">
                  <button type="button" onClick={() => setOpen(isOpen ? null : s.exerciseId)} className="flex w-full items-center gap-4 px-4 py-[16px] text-left">
                    <span className="flex h-[60px] w-[66px] items-center justify-center">
                      <ExerciseGlyph exercise={ex} size={52} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[19px] font-semibold">{ex.name}</span>
                      <span className="mt-1 flex items-center gap-2 whitespace-nowrap text-[14px]">
                        {s.before !== null ? `${fmt(s.before)} kg` : 'neu'}
                        <Icon name="arrowForward" size={16} style={{ color: isOpen ? '#ed774d' : '#9f9f9f' }} />
                        {fmt(s.after)} kg
                      </span>
                    </span>
                    {s.record ? (
                      <span className="flex h-[34px] shrink-0 items-center gap-[6px] rounded-full bg-[#030303] px-[10px] text-[16px]">
                        <Icon name="trophy" size={20} style={{ color: '#976723' }} />
                        {fmt(s.after)} kg
                      </span>
                    ) : (
                      <Icon name={isOpen ? 'arrowUp' : 'arrowDown'} size={28} style={{ color: isOpen ? '#ed774d' : '#9f9f9f' }} />
                    )}
                  </button>
                  {isOpen && s.history.length > 1 && (
                    <div className="px-3 pb-4">
                      <SmoothStrengthChart points={s.history} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 px-5 pt-10" style={{ paddingBottom: 'max(var(--safe-bottom), 16px)', background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.92) 35%)' }}>
        <Button variant="secondary" onClick={share}>
          Fortschritt Teilen
        </Button>
        <div className="h-[10px]" />
        <Button onClick={() => navigate('/training', { replace: true })}>Zum Training</Button>
      </div>
    </div>
  )
}
