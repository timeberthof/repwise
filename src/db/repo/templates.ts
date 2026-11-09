/** Eigene Trainingsvorlagen: Name + Übungsliste (keine Zielwerte). */
import { db } from '../db'
import type { WorkoutTemplate } from '../types'

export async function listTemplates(): Promise<WorkoutTemplate[]> {
  return (await db.templates.toArray()).sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
}

export async function saveTemplate(input: { id?: number; name: string; exerciseIds: string[] }): Promise<number> {
  const name = input.name.trim()
  if (!name) throw new Error('Name fehlt')
  const exerciseIds = [...new Set(input.exerciseIds)]
  if (input.id) {
    await db.templates.update(input.id, { name, exerciseIds })
    return input.id
  }
  const order = (await db.templates.count()) + 1
  return (await db.templates.add({ name, exerciseIds, order, createdAt: Date.now() })) as number
}

export async function deleteTemplate(id: number) {
  await db.templates.delete(id)
}

/** Reihenfolge der Vorlagen ändern (Liste der IDs in neuer Reihenfolge). */
export async function reorderTemplates(ids: number[]) {
  await db.transaction('rw', db.templates, async () => {
    for (const [i, id] of ids.entries()) await db.templates.update(id, { order: i + 1 })
  })
}
