import type { CardioActivity } from '../../db/types'
import type { IconName } from '../../components/icons/Icon'

export const CARDIO_ACTIVITIES: { id: CardioActivity; label: string; icon: IconName }[] = [
  { id: 'laufen', label: 'Laufen', icon: 'run' },
  { id: 'radfahren', label: 'Radfahren', icon: 'bike' },
  { id: 'gehen', label: 'Gehen', icon: 'walk' },
  { id: 'schwimmen', label: 'Schwimmen', icon: 'pool' },
  { id: 'rudern', label: 'Rudern', icon: 'rowing' },
  { id: 'crosstrainer', label: 'Crosstrainer', icon: 'heartMonitor' },
  { id: 'wandern', label: 'Wandern', icon: 'hiking' },
  { id: 'sonstiges', label: 'Sonstiges', icon: 'add' },
]
