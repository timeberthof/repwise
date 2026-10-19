import type { ActivityLevel, Goal } from '../db/types'

export const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; text: string; factor: number }[] = [
  { id: 'wenig', label: 'Wenig aktiv', text: 'Überwiegend sitzend, kaum Bewegung im Alltag', factor: 1.2 },
  { id: 'leicht', label: 'Leicht aktiv', text: 'Etwas Bewegung, 1–3 Trainings pro Woche', factor: 1.375 },
  { id: 'moderat', label: 'Moderat aktiv', text: 'Regelmäßig aktiv, 3–5 Trainings pro Woche', factor: 1.55 },
  { id: 'sehr', label: 'Sehr aktiv', text: 'Täglich Training oder körperliche Arbeit', factor: 1.725 },
  { id: 'extrem', label: 'Extrem aktiv', text: 'Harte körperliche Arbeit plus Training', factor: 1.9 },
]

export const GOALS: { id: Goal; label: string; text: string; adjust: number }[] = [
  { id: 'rekomposition', label: 'Rekomposition', text: 'Leichtes Defizit: Fett verlieren und gleichzeitig Muskeln aufbauen', adjust: -0.1 },
  { id: 'fett_verlieren', label: 'Fett verlieren', text: 'Moderates bis hohes Kaloriendefizit zur schnellen Fettreduktion', adjust: -0.2 },
  { id: 'muskelaufbau', label: 'Muskeln aufbauen', text: 'Leichter Überschuss für maximalen Muskelaufbau', adjust: 0.1 },
  { id: 'halten', label: 'Gewicht halten', text: 'Kalorien auf Höhe des Verbrauchs', adjust: 0 },
]

export interface CalorieInput {
  sex: 'm' | 'w'
  weightKg: number
  heightCm: number
  age: number
  activity: ActivityLevel
  goal: Goal
}

export interface CalorieResult {
  bmr: number
  tdee: number
  target: number
  factor: number
  adjust: number
  steps: { label: string; formula: string; value: string }[]
}

const r0 = (n: number) => Math.round(n)
const de = (n: number, d = 0) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: d }).format(n)

/** Grundumsatz nach Mifflin-St-Jeor, Gesamtumsatz über Aktivitätsfaktor, Ziel über Zu-/Abschlag. */
export function calculateCalories(i: CalorieInput): CalorieResult {
  const sexConst = i.sex === 'm' ? 5 : -161
  const bmr = 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.age + sexConst
  const factor = ACTIVITY_LEVELS.find((a) => a.id === i.activity)?.factor ?? 1.55
  const tdee = bmr * factor
  const adjust = GOALS.find((g) => g.id === i.goal)?.adjust ?? 0
  const target = tdee * (1 + adjust)
  const goalLabel = GOALS.find((g) => g.id === i.goal)?.label ?? ''
  const activityLabel = ACTIVITY_LEVELS.find((a) => a.id === i.activity)?.label ?? ''
  return {
    bmr: r0(bmr),
    tdee: r0(tdee),
    target: r0(target),
    factor,
    adjust,
    steps: [
      {
        label: 'Grundumsatz (Mifflin-St-Jeor)',
        formula: `10 × ${de(i.weightKg, 1)} kg + 6,25 × ${de(i.heightCm)} cm − 5 × ${i.age} Jahre ${i.sex === 'm' ? '+ 5' : '− 161'}`,
        value: `${de(r0(bmr))} kcal`,
      },
      {
        label: `Gesamtumsatz (${activityLabel})`,
        formula: `${de(r0(bmr))} kcal × ${de(factor, 3)}`,
        value: `${de(r0(tdee))} kcal`,
      },
      {
        label: `Zielkalorien (${goalLabel})`,
        formula: adjust === 0 ? `${de(r0(tdee))} kcal ± 0 %` : `${de(r0(tdee))} kcal ${adjust > 0 ? '+' : '−'} ${de(Math.abs(adjust) * 100)} %`,
        value: `${de(r0(target))} kcal`,
      },
    ],
  }
}
