import type { EquipmentId, TrainingLocation } from '../db/types'

export interface EquipmentMeta {
  id: EquipmentId
  label: string
  /** „Ohne Gerät“ im Sinne des Übungstauschs: Körpergewicht oder Band. */
  ohneGeraet: boolean
}

export const EQUIPMENT: EquipmentMeta[] = [
  { id: 'langhantel', label: 'Langhantel', ohneGeraet: false },
  { id: 'sz_stange', label: 'SZ-Stange', ohneGeraet: false },
  { id: 'kurzhantel', label: 'Kurzhanteln', ohneGeraet: false },
  { id: 'kettlebell', label: 'Kettlebell', ohneGeraet: false },
  { id: 'maschine', label: 'Maschinen', ohneGeraet: false },
  { id: 'kabelzug', label: 'Kabelzug', ohneGeraet: false },
  { id: 'multipresse', label: 'Multipresse', ohneGeraet: false },
  { id: 'klimmzugstange', label: 'Klimmzugstange', ohneGeraet: false },
  { id: 'dipbarren', label: 'Dip-Barren', ohneGeraet: false },
  { id: 'bank', label: 'Hantelbank', ohneGeraet: false },
  { id: 'widerstandsband', label: 'Widerstandsband', ohneGeraet: true },
  { id: 'koerpergewicht', label: 'Körpergewicht', ohneGeraet: true },
]

export const ALL_EQUIPMENT: EquipmentId[] = EQUIPMENT.map((e) => e.id)

export const equipmentLabel = (id: EquipmentId) => EQUIPMENT.find((e) => e.id === id)?.label ?? id

/** Vorauswahl je Trainingsort. */
export function defaultEquipmentFor(location: TrainingLocation): EquipmentId[] {
  if (location === 'gym') return ALL_EQUIPMENT
  if (location === 'zuhause') return ['kurzhantel', 'widerstandsband', 'koerpergewicht', 'bank']
  return ['koerpergewicht']
}
