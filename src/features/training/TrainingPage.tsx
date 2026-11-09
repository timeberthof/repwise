import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { PageHeader } from '../../components/layout/PageHeader'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { StreakBadge } from '../../components/ui/Flame'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/icons/Icon'
import { useToast } from '../../components/ui/Toast'
import { db } from '../../db/db'
import { useStreak } from '../../db/derived'
import { listTemplates } from '../../db/repo/templates'
import { runningSession, startWorkout } from '../../db/repo/sessions'
import { exerciseName } from '../../data/exercises'
import { WEEKDAYS_SHORT, formatDayMonth, today, weekdayIndex } from '../../logic/dates'
import { weekStart } from '../../logic/streak'
import { fmt } from '../../logic/format'
import { CARDIO_ACTIVITIES } from '../cardio/activities'

/** Trainings dieser Woche (Mo–So) mit Sätzen und Volumen. */
async function thisWeek() {
  const from = weekStart(today())
  const sessions = (await db.sessions.where('date').aboveOrEqual(from).toArray()).filter((s) => s.status === 'fertig' && s.kind === 'kraft').sort((a, b) => a.date.localeCompare(b.date) || (a.startedAt ?? 0) - (b.startedAt ?? 0))
  const out = []
  for (const s of sessions) {
    const sets = (await db.sets.where('sessionId').equals(s.id!).toArray()).filter((x) => x.done)
    out.push({ s, sets: sets.length, volume: sets.reduce((a, x) => a + (x.weight ?? 0) * x.reps, 0) })
  }
  const cardio = (await db.cardio.where('date').aboveOrEqual(from).toArray()).sort((a, b) => a.date.localeCompare(b.date))
  return { kraft: out, cardio }
}

/** Training: laufendes Training fortsetzen, aus einer eigenen Vorlage oder leer starten, Übersicht der Woche. */
export function TrainingPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const streak = useStreak()
  const running = useLiveQuery(async () => (await runningSession()) ?? null, [])
  const templates = useLiveQuery(() => listTemplates(), [])
  const week = useLiveQuery(thisWeek, [])

  const start = async (name: string, exerciseIds: string[]) => {
    if (running) {
      toast('Es läuft bereits ein Training', 'Beende es zuerst oder setze es fort.')
      navigate(`/workout/${running.id}`)
      return
    }
    const id = await startWorkout({ name, exerciseIds })
    navigate(`/workout/${id}`)
  }

  return (
    <div className="min-h-full bg-bg">
      <PageHeader title="Training" right={<StreakBadge value={streak} />} />

      {running && (
        <button type="button" onClick={() => navigate(`/workout/${running.id}`)} className="mx-5 mt-5 flex w-[calc(100%-40px)] items-center gap-3 rounded-xl border border-[#ed774d] bg-[#2a150d] px-4 py-4 text-left">
          <Icon name="play" size={28} className="text-[#ed774d]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[18px] font-semibold">{running.name} läuft</span>
            <span className="block text-[14px] text-fg-2">Seit {running.startedAt ? new Date(running.startedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '–'} Uhr · tippen zum Fortsetzen</span>
          </span>
          <Icon name="chevronRight" size={24} />
        </button>
      )}

      <SectionLabel className="mt-[30px]" right={<button type="button" onClick={() => navigate('/vorlagen')} className="text-[15px] font-semibold text-fg-2">Bearbeiten</button>}>
        Training starten
      </SectionLabel>
      <div className="mt-3 grid grid-cols-2 gap-2 px-5">
        {templates?.map((t) => (
          <button key={t.id} type="button" onClick={() => start(t.name, t.exerciseIds)} className="min-h-[104px] rounded-xl border border-elevated bg-surface px-4 py-3 text-left active:opacity-80">
            <span className="block text-[18px] font-semibold">{t.name}</span>
            <span className="mt-1 block text-[13px] text-fg-2">{t.exerciseIds.length} Übungen</span>
            <span className="mt-1 line-clamp-2 block text-[12.5px] leading-snug text-fg-3">{t.exerciseIds.map(exerciseName).join(' · ')}</span>
          </button>
        ))}
        <button type="button" onClick={() => start('Training', [])} className="flex min-h-[104px] flex-col justify-center rounded-xl border border-dashed border-fg-3 px-4 py-3 text-left active:opacity-80">
          <Icon name="add" size={24} />
          <span className="mt-1 block text-[16px] font-semibold">Leeres Training</span>
          <span className="block text-[12.5px] text-fg-2">Übungen selbst hinzufügen</span>
        </button>
      </div>
      {templates && !templates.length && (
        <p className="mx-6 mt-3 text-[13.5px] leading-snug text-fg-2">
          Lege unter „Bearbeiten“ eigene Vorlagen an (z. B. Push und Pull) – dann startest Du mit einem Tipp.
        </p>
      )}

      <SectionLabel className="mt-[30px]">Diese Woche</SectionLabel>
      <div className="mt-3 flex flex-col gap-2 px-5">
        {week && !week.kraft.length && !week.cardio.length && <p className="rounded-xl bg-surface px-4 py-4 text-[15px] text-fg-2">Diese Woche noch kein Training.</p>}
        {week?.kraft.map(({ s, sets, volume }) => (
          <button key={s.id} type="button" onClick={() => navigate(`/verlauf/${s.id}`)} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left">
            <span className="w-[44px] text-center">
              <span className="block text-[13px] text-fg-2">{WEEKDAYS_SHORT[weekdayIndex(s.date)]}</span>
              <span className="block text-[16px] font-semibold">{formatDayMonth(s.date)}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold">{s.name}</span>
              <span className="block text-[13.5px] text-fg-2">
                {sets} Sätze · {fmt(Math.round(volume))} kg bewegt
              </span>
            </span>
            <Icon name="chevronRight" size={22} className="text-fg-2" />
          </button>
        ))}
        {week?.cardio.map((c) => (
          <button key={c.id} type="button" onClick={() => navigate(`/cardio/${c.id}`)} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left">
            <span className="w-[44px] text-center">
              <span className="block text-[13px] text-fg-2">{WEEKDAYS_SHORT[weekdayIndex(c.date)]}</span>
              <span className="block text-[16px] font-semibold">{formatDayMonth(c.date)}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold">{c.activityText || CARDIO_ACTIVITIES.find((a) => a.id === c.activity)?.label || 'Cardio'}</span>
              <span className="block text-[13.5px] text-fg-2">{c.durationMin} Min{c.avgHr ? ` · Ø ${c.avgHr} bpm` : ''}</span>
            </span>
            <Icon name="chevronRight" size={22} className="text-fg-2" />
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 px-5">
        <Button variant="secondary" icon="add" onClick={() => navigate('/cardio/neu')}>
          Cardio eintragen
        </Button>
        <Button variant="secondary" icon="history" onClick={() => navigate('/verlauf')}>
          Gespeicherte Trainings
        </Button>
        <Button variant="secondary" icon="list" onClick={() => navigate('/uebungen')}>
          Meine Übungen
        </Button>
      </div>
    </div>
  )
}
