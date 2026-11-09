/**
 * Wöchentlicher Check-in: Körpergewicht (Pflicht) und Fortschrittsfoto.
 *
 * - fällig, wenn es noch keinen Check-in gibt oder der letzte mindestens 7 Tage zurückliegt
 * - das Gewicht landet in derselben Tabelle wie alle bisherigen Gewichtswerte (Verlauf bleibt vollständig)
 * - „Später“ beim Foto: Gewicht ist gespeichert, die Foto-Abfrage erscheint beim nächsten Start erneut,
 *   bis es für diesen Check-in ein Foto gibt (auch ein Foto, das in „Körper“ hinzugefügt wird, zählt)
 */
import { db } from '../db'
import type { ISODate, ProgressPhoto, WeeklyCheckin } from '../types'
import { diffDays, today } from '../../logic/dates'

export const CHECKIN_INTERVAL_DAYS = 7

export interface CheckinStatus {
  /** Ein neuer Check-in ist fällig (Gewicht + Foto) */
  due: boolean
  last: WeeklyCheckin | null
  /** Letzter Check-in ohne Foto – Foto noch offen */
  photoPending: WeeklyCheckin | null
  /** Tage bis zum nächsten Check-in (0 = heute) */
  nextInDays: number
}

export async function lastCheckin(): Promise<WeeklyCheckin | null> {
  const list = await db.checkins.toArray()
  return list.sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))[0] ?? null
}

/** Gibt es ein Foto ab dem Tag des Check-ins? */
async function hasPhotoSince(c: WeeklyCheckin): Promise<boolean> {
  if (c.photoId && (await db.photos.get(c.photoId))) return true
  return (await db.photos.where('date').aboveOrEqual(c.date).count()) > 0
}

export async function checkinStatus(date: ISODate = today()): Promise<CheckinStatus> {
  const last = await lastCheckin()
  if (!last) return { due: true, last: null, photoPending: null, nextInDays: 0 }
  const since = diffDays(last.date, date)
  const due = since >= CHECKIN_INTERVAL_DAYS
  const photoPending = !due && !(await hasPhotoSince(last)) ? last : null
  return { due, last, photoPending, nextInDays: Math.max(0, CHECKIN_INTERVAL_DAYS - since) }
}

/** Gewicht des Check-ins speichern (Pflicht). Ein zweiter Check-in am selben Tag ersetzt den ersten. */
export async function saveCheckin(weight: number, date: ISODate = today()): Promise<number> {
  if (!(weight > 0)) throw new Error('Körpergewicht fehlt')
  const value = Math.round(weight * 10) / 10
  return db.transaction('rw', [db.checkins, db.body], async () => {
    const entry = await db.body.where('[kind+date]').equals(['weight', date]).first()
    if (entry?.id) await db.body.update(entry.id, { value, source: 'app' })
    else await db.body.add({ date, kind: 'weight', value, source: 'app' })
    const existing = await db.checkins.where('date').equals(date).first()
    if (existing?.id) {
      await db.checkins.update(existing.id, { weight: value })
      return existing.id
    }
    return (await db.checkins.add({ date, weight: value, createdAt: Date.now() })) as number
  })
}

/** Foto zum Check-in speichern (Datum = Tag der Aufnahme). */
export async function attachCheckinPhoto(checkinId: number, photo: Pick<ProgressPhoto, 'data' | 'thumbData' | 'mime' | 'width' | 'height'>, date: ISODate = today()): Promise<number> {
  const c = await db.checkins.get(checkinId)
  if (!c) throw new Error('Check-in nicht gefunden')
  return db.transaction('rw', [db.photos, db.checkins], async () => {
    const id = (await db.photos.add({ ...photo, date, pose: 'vorne', weight: c.weight, checkinId, createdAt: Date.now() })) as number
    await db.checkins.update(checkinId, { photoId: id })
    return id
  })
}
