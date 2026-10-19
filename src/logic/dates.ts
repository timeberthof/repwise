import type { ISODate } from '../db/types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Heute als JJJJ-MM-TT. Für Tests über setNow überschreibbar. */
let nowOverride: Date | null = null
export function setNow(d: Date | null) {
  nowOverride = d
}
export function now(): Date {
  return nowOverride ? new Date(nowOverride) : new Date()
}
export function today(): ISODate {
  return toISO(now())
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Tage von a bis b (b − a). */
export function diffDays(a: ISODate, b: ISODate): number {
  const ms = parseISO(b).getTime() - parseISO(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** 0 = Montag … 6 = Sonntag */
export function weekdayIndex(s: ISODate): number {
  return (parseISO(s).getDay() + 6) % 7
}

export function startOfWeek(s: ISODate): ISODate {
  return addDays(s, -weekdayIndex(s))
}

export function weekDates(s: ISODate): ISODate[] {
  const start = startOfWeek(s)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export const WEEKDAYS_LETTER = ['M', 'D', 'M', 'D', 'F', 'S', 'S']
export const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const MONTHS_SHORT = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.']
const MONTHS_AXIS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const MONTHS_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

/** „15. Okt. 2026“ */
export function formatLong(s: ISODate): string {
  const d = parseISO(s)
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** „15.10.2026“ */
export function formatDate(s: ISODate): string {
  const d = parseISO(s)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** „15.10“ (Achsen im Trainingsabschluss) */
export function formatDayMonth(s: ISODate): string {
  const d = parseISO(s)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`
}

/** [„Okt“, „15“] – zweizeilige Achsenbeschriftung der Statistik */
export function axisLabel(s: ISODate): [string, string] {
  const d = parseISO(s)
  return [MONTHS_AXIS[d.getMonth()], String(d.getDate())]
}

export function monthLabel(s: ISODate): string {
  const d = parseISO(s)
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

export function relativeDayLabel(s: ISODate): string {
  const diff = diffDays(s, today())
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Gestern'
  if (diff === -1) return 'Morgen'
  return formatDate(s)
}

/** Alter in vollen Jahren am Stichtag. */
export function ageOn(birthDate: ISODate, on: ISODate = today()): number {
  const b = parseISO(birthDate)
  const d = parseISO(on)
  let age = d.getFullYear() - b.getFullYear()
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) age--
  return age
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${pad(m)} : ${pad(s)}`
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec))
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}
