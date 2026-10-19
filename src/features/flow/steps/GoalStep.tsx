import type { Goal } from '../../../db/types'
import { GOALS } from '../../../logic/calories'
import { OptionCard } from '../../../components/ui/OptionCard'
import { Icon } from '../../../components/icons/Icon'

/** Empfohlene Ziele nach Körperfettanteil (Männer; Frauen +8 Prozentpunkte). */
export function recommendedGoals(bodyFat: number | null, sex: 'm' | 'w'): Goal[] {
  if (bodyFat === null) return ['rekomposition', 'fett_verlieren', 'muskelaufbau', 'halten']
  const bf = sex === 'w' ? bodyFat - 8 : bodyFat
  if (bf >= 20) return ['rekomposition', 'fett_verlieren']
  if (bf >= 12) return ['rekomposition', 'muskelaufbau']
  return ['muskelaufbau', 'halten']
}

/** Verlauf Muskelmasse / Körperfett über 90 Tage je Ziel (Illustration wie in S21). */
const CURVES: Record<Goal, { muscle: string; fat: string }> = {
  fett_verlieren: {
    muscle: 'M0 92 C 60 92, 110 92, 160 90 S 260 80, 330 79 S 470 78, 560 78 S 690 72, 750 70',
    fat: 'M0 92 C 60 98, 110 100, 150 101 S 230 120, 270 128 S 350 146, 400 146 S 500 136, 560 140 S 680 164, 750 178',
  },
  rekomposition: {
    muscle: 'M0 92 C 80 90, 150 84, 220 76 S 380 66, 470 60 S 640 52, 750 46',
    fat: 'M0 92 C 80 95, 160 102, 240 108 S 400 116, 480 122 S 640 130, 750 136',
  },
  muskelaufbau: {
    muscle: 'M0 92 C 80 86, 150 76, 230 66 S 400 50, 480 42 S 650 28, 750 20',
    fat: 'M0 92 C 100 90, 200 88, 300 86 S 500 82, 600 80 S 700 78, 750 76',
  },
  halten: {
    muscle: 'M0 92 C 100 91, 200 89, 300 88 S 500 86, 600 85 S 700 84, 750 84',
    fat: 'M0 92 C 100 93, 200 94, 300 95 S 500 96, 600 97 S 700 98, 750 98',
  },
}

export function GoalChart({ goal }: { goal: Goal }) {
  const c = CURVES[goal]
  return (
    <div className="relative mt-[22px]">
      <p className="text-center text-[15px] font-medium uppercase tracking-[0.03em] text-[#e8913d]">Muskelmasse</p>
      <svg viewBox="0 0 750 190" className="mt-1 w-full" aria-hidden>
        <path d="M0 92 H750" stroke="#f3f3f3" strokeWidth="2" />
        <path d={c.muscle} fill="none" stroke="#f0913d" strokeWidth="5" strokeLinecap="round" />
        <path d={c.fat} fill="none" stroke="#5bbd52" strokeWidth="5" strokeLinecap="round" />
        <text x="690" y="80" fill="#f3f3f3" fontSize="26" textAnchor="middle" fontFamily="Montserrat">
          90 Tage
        </text>
      </svg>
      <p className="text-center text-[15px] font-medium uppercase tracking-[0.03em] text-green">Körperfett</p>
    </div>
  )
}

export function GoalOptions({ value, onChange, recommended }: { value: Goal; onChange: (g: Goal) => void; recommended: Goal[] }) {
  return (
    <div className="mt-[26px] flex flex-col gap-[10px]">
      {GOALS.map((g) => (
        <OptionCard
          key={g.id}
          title={g.label}
          description={g.text}
          selected={value === g.id}
          onClick={() => onChange(g.id)}
          right={!recommended.includes(g.id) ? <Icon name="warning" size={24} style={{ color: '#fbea4e' }} /> : undefined}
        />
      ))}
    </div>
  )
}
