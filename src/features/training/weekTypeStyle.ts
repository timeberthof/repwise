import type { IconName } from '../../components/icons/Icon'
import type { WeekType } from '../../db/types'

/** Farben und Icons der Trainingstypen (gemessen in S29). */
export const WEEK_TYPE_STYLE: Record<WeekType, { icon: IconName; color: string; bg: string; badge: string }> = {
  intro: { icon: 'flag', color: '#ffe900', bg: '#403a00', badge: '#ffe900' },
  normal: { icon: 'calendar', color: '#f3f3f3', bg: '#3d3d3d', badge: '#9f9f9f' },
  overreaching: { icon: 'trendingUp', color: '#ffaa00', bg: '#402b00', badge: '#ffaa00' },
  peak: { icon: 'stackedLine', color: '#ff6e40', bg: '#401c10', badge: '#ff6e40' },
  deload: { icon: 'batteryBolt', color: '#15c150', bg: '#053014', badge: '#5ac060' },
}
