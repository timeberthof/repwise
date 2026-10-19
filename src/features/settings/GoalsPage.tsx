import { db } from '../../db/db'
import { useProfile } from '../../db/hooks'
import { useCalories } from '../../db/derived'
import { useLiveQuery } from 'dexie-react-hooks'
import { GoalOptions, recommendedGoals } from '../flow/steps/GoalStep'
import { ActivityOptions } from '../flow/steps/ChoiceSteps'
import { CaloriesResult } from '../flow/steps/BodySteps'
import { Section, SettingsLayout } from './SettingsLayout'

/** Ziele & Kalorien: Ziel und Aktivität ändern, Rechenweg anzeigen. */
export function GoalsPage() {
  const profile = useProfile()
  const cal = useCalories()
  const bf = useLiveQuery(async () => (await db.body.where('kind').equals('bodyfat').sortBy('date')).at(-1)?.value ?? null, [])
  if (!profile) return <SettingsLayout title="Ziele & Kalorien">{null}</SettingsLayout>
  return (
    <SettingsLayout title="Ziele & Kalorien">
      <div className="px-4">{cal && <CaloriesResult result={cal} />}</div>
      <Section title="Ziel" hint="⚠ = laut Deinem Körperfettanteil weniger passend.">
        <div className="-mt-[26px]">
          <GoalOptions value={profile.goal} onChange={(goal) => db.profile.update('me', { goal })} recommended={recommendedGoals(bf ?? null, profile.sex)} />
        </div>
      </Section>
      <Section title="Aktivität im Alltag">
        <div className="-mt-[24px]">
          <ActivityOptions value={profile.activity} onChange={(activity) => db.profile.update('me', { activity })} work={profile.workPosition} onWork={(workPosition) => db.profile.update('me', { workPosition })} />
        </div>
      </Section>
    </SettingsLayout>
  )
}
