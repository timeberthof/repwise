import { BACKUP_TABLES, db, kvSet } from '../db/db'
import { setCustomExercises } from '../data/exercises'
import { loadWeightSteps } from '../db/repo/weights'
import { today } from '../logic/dates'

/**
 * Backup-Format von Repwise (JSON). Bei Änderungen am Format:
 * BACKUP_VERSION erhöhen und in `migrate` die alte Version umwandeln, damit alte Backups lesbar bleiben.
 */
export const BACKUP_FORMAT = 'repwise-backup'
export const BACKUP_VERSION = 1

type TableName = (typeof BACKUP_TABLES)[number]

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  appVersion: string
  dbVersion: number
  exportedAt: string
  counts: Partial<Record<TableName, number>>
  tables: Partial<Record<TableName, unknown[]>>
}

/** Blobs (Fotos) werden als Data-URL gespeichert und beim Import zurückverwandelt. */
interface BlobMarker {
  __blob: string
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })
}

async function dataUrlToBlob(s: string): Promise<Blob> {
  const [head, data] = s.split(',')
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream'
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** Binärdaten (Fotos als ArrayBuffer) als Base64 */
interface BytesMarker {
  __bytes: string
}

function bytesToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function base64ToBytes(s: string): ArrayBuffer {
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

const isBuffer = (v: unknown): v is ArrayBuffer => v instanceof ArrayBuffer || Object.prototype.toString.call(v) === '[object ArrayBuffer]'

export async function encode(row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (isBuffer(v)) out[k] = { __bytes: bytesToBase64(v) } satisfies BytesMarker
    else if (v instanceof Blob) out[k] = { __blob: await blobToDataUrl(v) } satisfies BlobMarker
    else out[k] = v
  }
  return out
}

export async function decode(row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v && typeof v === 'object' && '__bytes' in (v as object)) out[k] = base64ToBytes((v as BytesMarker).__bytes)
    else if (v && typeof v === 'object' && '__blob' in (v as object)) out[k] = await dataUrlToBlob((v as BlobMarker).__blob)
    else out[k] = v
  }
  return out
}

/** Alle Daten als Backup-Objekt. */
export async function createBackup(): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {}
  const counts: BackupFile['counts'] = {}
  for (const name of BACKUP_TABLES) {
    const rows = (await db.table(name).toArray()) as Record<string, unknown>[]
    tables[name] = await Promise.all(rows.map(encode))
    counts[name] = rows.length
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, appVersion: __APP_VERSION__, dbVersion: db.verno, exportedAt: new Date().toISOString(), counts, tables }
}

export function backupFileName(date = today()): string {
  return `repwise-backup-${date}.json`
}

/** Backup-Datei erzeugen (noch nicht teilen – das muss direkt im Tipp-Handler passieren, siehe shareFile). */
export async function prepareBackupFile(): Promise<File> {
  const data = await createBackup()
  return new File([JSON.stringify(data)], backupFileName(), { type: 'application/json' })
}

export function canShareFile(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

/** iPhone: Teilen-Menü („In Dateien sichern“). Muss synchron aus einem Tipp heraus aufgerufen werden. */
export async function shareFile(file: File): Promise<boolean> {
  try {
    await navigator.share({ files: [file], title: 'Repwise-Backup' })
    await markBackupDone()
    return true
  } catch (e) {
    if ((e as Error).name === 'AbortError') return false
    throw e
  }
}

export async function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  await markBackupDone()
}

export async function markBackupDone() {
  await kvSet('backup.last', Date.now())
}

/** Ältere Backup-Versionen ins aktuelle Format bringen. */
function migrate(data: BackupFile): BackupFile {
  // Version 1 ist die erste Version – künftige Umwandlungen hier ergänzen:
  // if (data.version === 1) { …; data.version = 2 }
  return data
}

export type ParseResult = { ok: true; data: BackupFile } | { ok: false; error: string }

export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Die Datei ist kein gültiges JSON.' }
  }
  const d = raw as Partial<BackupFile>
  if (!d || d.format !== BACKUP_FORMAT || typeof d.version !== 'number' || !d.tables) return { ok: false, error: 'Das ist keine Repwise-Backup-Datei.' }
  if (d.version > BACKUP_VERSION) return { ok: false, error: `Dieses Backup stammt von einer neueren App-Version (Format ${d.version}). Bitte Repwise aktualisieren.` }
  return { ok: true, data: migrate(d as BackupFile) }
}

/** Ersetzt alle bestehenden Daten durch das Backup. */
export async function restoreBackup(data: BackupFile): Promise<void> {
  const decoded: Partial<Record<TableName, Record<string, unknown>[]>> = {}
  for (const name of BACKUP_TABLES) decoded[name] = await Promise.all(((data.tables[name] ?? []) as Record<string, unknown>[]).map(decode))
  await db.transaction('rw', BACKUP_TABLES.map((n) => db.table(n)), async () => {
    for (const name of BACKUP_TABLES) {
      await db.table(name).clear()
      const rows = decoded[name] ?? []
      if (rows.length) await db.table(name).bulkAdd(rows)
    }
  })
  await markBackupDone()
  setCustomExercises(await db.customExercises.toArray())
  await loadWeightSteps()
}

/** Alle Daten löschen (Datenbank und lokale Zwischenspeicher). */
export async function wipeAllData(): Promise<void> {
  await db.transaction('rw', BACKUP_TABLES.map((n) => db.table(n)), async () => {
    for (const name of BACKUP_TABLES) await db.table(name).clear()
  })
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('repwise.') && k !== 'repwise.sim') localStorage.removeItem(k)
  } catch {
    /* ignorieren */
  }
  setCustomExercises([])
  await loadWeightSteps()
}

export const TABLE_LABELS: Record<TableName, string> = {
  profile: 'Profil',
  body: 'Körperwerte',
  steps: 'Schritte',
  plans: 'Pläne',
  planDays: 'Plantage',
  planExercises: 'Plan-Übungen',
  sessions: 'Trainingseinheiten',
  sessionExercises: 'Übungen in Einheiten',
  sets: 'Sätze',
  adjustments: 'Anpassungsprotokoll',
  strength: 'Maximalkraft-Werte',
  cardio: 'Cardio',
  photos: 'Fortschrittsfotos',
  customExercises: 'Eigene Übungen',
  exerciseSettings: 'Übungs-Einstellungen',
  kv: 'Einstellungen',
}
