import { useNavigate } from 'react-router'
import { PageHeader, HeaderIconButton } from '../../components/layout/PageHeader'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { StreakBadge } from '../../components/ui/Flame'
import { useStreak } from '../../db/derived'
import { runningSession } from '../../db/repo/sessions'
import { HintCarousel } from './HintCarousel'
import { useHints, type Hint } from './useHints'
import { TrainingsTile, WeightTile } from './HabitTiles'

export function HomePage() {
  const navigate = useNavigate()
  const streak = useStreak()
  const hints = useHints()

  const onHint = async (h: Hint) => {
    if (h.action === 'backup') navigate('/einstellungen/daten')
    if (h.action === 'koerper') navigate('/koerper')
    if (h.action === 'training') navigate('/training')
    if (h.action === 'workout') {
      const r = await runningSession()
      navigate(r ? `/workout/${r.id}` : '/training')
    }
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

      <SectionLabel className="mt-[27px]">Überblick</SectionLabel>
      <div className="mt-[11px] grid grid-cols-2 gap-2 px-5">
        <TrainingsTile />
        <WeightTile />
      </div>
    </div>
  )
}
