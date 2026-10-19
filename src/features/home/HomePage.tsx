import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { PageHeader, HeaderIconButton } from '../../components/layout/PageHeader'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { StreakBadge } from '../../components/ui/Flame'
import { useStreak } from '../../db/derived'
import { HintCarousel } from './HintCarousel'
import { useHints, type Hint } from './useHints'
import { CaloriesTile, StepsTile, TrainingsTile, WeighInTile } from './HabitTiles'
import { StepsSheet } from '../body/StepsSheet'
import { WeightSheet } from '../body/WeightSheet'
import { db, kvGet, kvSet } from '../../db/db'
import { addDays, today } from '../../logic/dates'
import { getSettings } from '../../db/settings'

export function HomePage() {
  const navigate = useNavigate()
  const streak = useStreak()
  const hints = useHints()
  const [steps, setSteps] = useState(false)
  const [weight, setWeight] = useState(false)

  // Beim Öffnen einmal täglich nach den Schritten von gestern fragen, falls sie fehlen.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const profile = await db.profile.get('me')
      if (!profile?.onboardingDone) return
      if (!(await getSettings()).askSteps) return
      const yesterday = addDays(today(), -1)
      const asked = await kvGet<string | null>('steps.askedOn', null)
      const entry = await db.steps.get(yesterday)
      if (!entry && asked !== today() && !cancelled) {
        await kvSet('steps.askedOn', today())
        setSteps(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onHint = (h: Hint) => {
    if (h.action === 'zyklus') navigate('/zyklus/planen')
    if (h.action === 'schritte') setSteps(true)
    if (h.action === 'backup') navigate('/einstellungen/daten')
    if (h.action === 'gewicht') setWeight(true)
    if (h.action === 'training') navigate('/training')
  }

  return (
    <div className="min-h-full bg-bg">
      <PageHeader
        title="Dashboard"
        right={
          <>
            <StreakBadge value={streak} onClick={() => navigate('/training')} />
            <HeaderIconButton icon="settings" label="Einstellungen" onClick={() => navigate('/einstellungen')} />
          </>
        }
      />

      <SectionLabel className="mt-[43px]">Willkommen zurück</SectionLabel>
      <div className="mt-[12px]">{hints && <HintCarousel hints={hints} onAction={onHint} />}</div>

      <SectionLabel className="mt-[27px]">Gewohnheiten</SectionLabel>
      <div className="mt-[11px] grid grid-cols-2 gap-2 px-5">
        <StepsTile onOpen={() => setSteps(true)} />
        <CaloriesTile />
        <WeighInTile onOpen={() => setWeight(true)} />
        <TrainingsTile />
      </div>

      <StepsSheet open={steps} onClose={() => setSteps(false)} />
      <WeightSheet open={weight} onClose={() => setWeight(false)} />
    </div>
  )
}
