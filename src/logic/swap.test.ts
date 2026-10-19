import { describe, expect, it } from 'vitest'
import { swapAlternatives } from './swap'
import { LIBRARY, getExercise, isOhneGeraet } from '../data/exercises'
import { ALL_EQUIPMENT } from '../data/equipment'

const bench = getExercise('bankdruecken-multipresse')!

describe('Übung tauschen', () => {
  it('zeigt nur dieselbe Muskelgruppe, gleiches Bewegungsmuster zuerst', () => {
    const list = swapAlternatives(bench, LIBRARY, { filter: 'alle', onlyAvailable: true, available: ALL_EQUIPMENT })
    expect(list.every((e) => e.primaer === 'brust')).toBe(true)
    const firstOther = list.findIndex((e) => e.muster !== 'horizontal_druecken')
    expect(list.slice(0, firstOther).every((e) => e.muster === 'horizontal_druecken')).toBe(true)
    expect(list.slice(firstOther).some((e) => e.muster === 'horizontal_druecken')).toBe(false)
  })

  it('filtert mit und ohne Gerät', () => {
    const ohne = swapAlternatives(bench, LIBRARY, { filter: 'ohne', onlyAvailable: false, available: ALL_EQUIPMENT })
    expect(ohne.length).toBeGreaterThanOrEqual(2)
    expect(ohne.every(isOhneGeraet)).toBe(true)
    const mit = swapAlternatives(bench, LIBRARY, { filter: 'mit', onlyAvailable: false, available: ALL_EQUIPMENT })
    expect(mit.some(isOhneGeraet)).toBe(false)
  })

  it('zeigt standardmäßig nur verfügbares Equipment', () => {
    const list = swapAlternatives(bench, LIBRARY, { filter: 'alle', onlyAvailable: true, available: ['kurzhantel', 'bank'] })
    expect(list.every((e) => e.equipment.every((q) => q === 'koerpergewicht' || q === 'kurzhantel' || q === 'bank'))).toBe(true)
    expect(list.map((e) => e.id)).toContain('kurzhantel-bankdruecken')
  })

  it('sucht über alle Muskelgruppen', () => {
    const list = swapAlternatives(bench, LIBRARY, { filter: 'alle', onlyAvailable: false, available: ALL_EQUIPMENT, query: 'curl' })
    expect(list.some((e) => e.primaer === 'bizeps')).toBe(true)
  })
})
