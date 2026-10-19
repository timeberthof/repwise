import { describe, expect, it } from 'vitest'
import { LIBRARY, isOhneGeraet } from './exercises'
import { MUSCLES, MAIN_GROUPS } from './muskeln'
import { EQUIPMENT } from './equipment'
import startwerte from './startwerte.beispiel.json'

const kraft = LIBRARY.filter((e) => e.art === 'kraft')

describe('Übungsbibliothek', () => {
  it('hat mindestens 120 Kraftübungen', () => {
    expect(kraft.length).toBeGreaterThanOrEqual(120)
  })

  it('hat eindeutige IDs und gültige Felder', () => {
    const ids = new Set<string>()
    const equipmentIds = new Set(EQUIPMENT.map((e) => e.id))
    for (const e of LIBRARY) {
      expect(ids.has(e.id), `doppelte ID ${e.id}`).toBe(false)
      ids.add(e.id)
      expect(MUSCLES[e.primaer], `${e.id}: primaer`).toBeDefined()
      for (const s of e.sekundaer) expect(MUSCLES[s], `${e.id}: sekundaer ${s}`).toBeDefined()
      for (const q of e.equipment) expect(equipmentIds.has(q), `${e.id}: equipment ${q}`).toBe(true)
      expect(e.hinweise.length, `${e.id}: hinweise`).toBeGreaterThan(10)
      expect([1, 2, 3]).toContain(e.schwierigkeit)
    }
  })

  it('deckt jede große Muskelgruppe mit mehreren Geräten und ≥ 2 Übungen ohne Gerät ab', () => {
    for (const group of MAIN_GROUPS) {
      const list = kraft.filter((e) => MUSCLES[e.primaer].main === group)
      const equipment = new Set(list.map((e) => e.equipment[0]))
      expect(list.length, group).toBeGreaterThanOrEqual(6)
      expect(equipment.size, `${group}: Gerätevielfalt`).toBeGreaterThanOrEqual(3)
      expect(list.filter(isOhneGeraet).length, `${group}: ohne Gerät`).toBeGreaterThanOrEqual(2)
    }
  })

  it('enthält alle Übungen aus den Screenshots', () => {
    const names = [
      'Bankdrücken an der Multipresse',
      'Sitzendes Kurzhantel Schulterdrücken',
      'Butterfly',
      'Trizepsdrücken',
      'Kurzhantel-Shrugs',
      'Bankdrücken',
      'Bankdrücken im Untergriff',
      'Brustpresse',
      'Kurzhantel-Schrägbankdrücken',
      'Kabelrudern',
      'Latzug',
      'Sitzendes Seitheben',
      'Butterfly Reverse',
      'Cable Curls',
      'Kurzhantel-Kreuzheben mit gestreckten Beinen',
      'Beinstrecker',
      'Adduktorenmaschine',
      'Bauchpresse',
      'Negativ-Crunches (Zusatzgewicht)',
      'Negativ-Sit Ups (Zusatzgewicht)',
      'Beinpresse',
      'Beinbeuger im Liegen',
      'Hüftöffner',
      'Wadenheben mit gebeugten Knien',
      'Tiefer Squat Stretch',
      'Einbeinstand',
      '90/90 Sitz',
      '90/90 Sitz mit Abstützen',
      '90/90 Sitz mit Rotation',
      'Adductor Rock',
    ]
    const have = new Set(LIBRARY.map((e) => e.name))
    for (const n of names) expect(have.has(n), n).toBe(true)
  })

  it('Startwerte verweisen nur auf bekannte Übungen', () => {
    const ids = new Set(LIBRARY.map((e) => e.id))
    for (const id of Object.keys(startwerte.maximalkraft)) expect(ids.has(id), id).toBe(true)
    for (const id of Object.keys(startwerte.arbeitsgewichte)) expect(ids.has(id), id).toBe(true)
  })
})
