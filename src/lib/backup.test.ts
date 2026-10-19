import { beforeAll, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { setNow } from '../logic/dates'
import startwerte from '../data/startwerte.beispiel.json'
import { isStartwerte, profileDefaults, type Startwerte } from '../db/repo/startwerte'
import { emptyDraft, finishOnboarding } from '../features/onboarding/draft'
import { BACKUP_VERSION, backupFileName, createBackup, decode, encode, parseBackup, restoreBackup, wipeAllData } from './backup'
import { getSettings, updateSettings } from '../db/settings'

const s = startwerte as unknown as Startwerte

describe('Backup', () => {
  beforeAll(async () => {
    setNow(new Date(2026, 9, 18, 10, 0))
    await db.delete()
    await db.open()
    await finishOnboarding(emptyDraft({ ...profileDefaults(s), onboardingDone: false, createdAt: 0 }, 80, 18, true), s)
    await db.cardio.add({ date: '2026-10-18', activity: 'laufen', durationMin: 30, zone: 2, targetHrMin: 116, targetHrMax: 135, intensity: 'leicht', avgHr: 128 })
    await db.photos.add({ date: '2026-10-18', pose: 'vorne', data: new Uint8Array([1, 2, 3, 4]).buffer, thumbData: new Uint8Array([9]).buffer, mime: 'image/jpeg' })
    await updateSettings({ stepGoal: 9000 })
  })

  it('exportiert alle Tabellen mit Version und Dateiname', async () => {
    const b = await createBackup()
    expect(b.format).toBe('repwise-backup')
    expect(b.version).toBe(BACKUP_VERSION)
    expect(b.counts.sessions).toBeGreaterThan(20)
    expect(b.counts.photos).toBe(1)
    expect(backupFileName('2026-10-18')).toBe('repwise-backup-2026-10-18.json')
  })

  it('Export → alles löschen → Import stellt die Daten wieder her', async () => {
    const before = { sessions: await db.sessions.count(), strength: await db.strength.count(), cardio: await db.cardio.count() }
    const text = JSON.stringify(await createBackup())
    await wipeAllData()
    expect(await db.sessions.count()).toBe(0)
    expect(await db.profile.get('me')).toBeUndefined()
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    await restoreBackup(parsed.data)
    expect(await db.sessions.count()).toBe(before.sessions)
    expect(await db.strength.count()).toBe(before.strength)
    expect(await db.cardio.count()).toBe(before.cardio)
    expect((await db.profile.get('me'))?.birthDate).toBe('1996-05-01')
    const photo = (await db.photos.toArray())[0]
    expect(Array.from(new Uint8Array(photo.data))).toEqual([1, 2, 3, 4])
    expect(photo.mime).toBe('image/jpeg')
    expect((await getSettings()).stepGoal).toBe(9000)
  })

  it('wandelt Fotos (Blobs) verlustfrei um', async () => {
    const row = { id: 1, blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' }), note: 'x' }
    const enc = await encode(row)
    expect(JSON.stringify(enc)).toContain('data:image/jpeg;base64,AQIDBA==')
    const dec = await decode(JSON.parse(JSON.stringify(enc)))
    expect(dec.blob).toBeInstanceOf(Blob)
    expect((dec.blob as Blob).size).toBe(4)
    expect((dec.blob as Blob).type).toBe('image/jpeg')
    expect(dec.note).toBe('x')
  })

  it('erkennt Startwerte-Dateien und unterscheidet sie von Backups', async () => {
    expect(isStartwerte(startwerte)).toBe(true)
    expect(isStartwerte(await createBackup())).toBe(false)
    expect(isStartwerte({ profil: {} })).toBe(false)
  })

  it('lehnt fremde oder zu neue Dateien ab', () => {
    expect(parseBackup('kein json').ok).toBe(false)
    expect(parseBackup(JSON.stringify({ format: 'anders' })).ok).toBe(false)
    const r = parseBackup(JSON.stringify({ format: 'repwise-backup', version: 99, tables: {} }))
    expect(r.ok).toBe(false)
  })
})
