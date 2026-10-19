import { useEffect, useMemo, useState } from 'react'
import type { Exercise, MuscleId } from '../../db/types'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Segmented } from '../../components/ui/Segmented'
import { ExerciseGlyph } from '../../components/ui/ExerciseGlyph'
import { Icon } from '../../components/icons/Icon'
import { ActionSheet } from '../../components/ui/ActionSheet'
import { allExercises } from '../../data/exercises'
import { muscleLabel, MUSCLES } from '../../data/muskeln'
import { swapAlternatives, type EquipmentFilter } from '../../logic/swap'
import { useProfile } from '../../db/hooks'
import { CreateExerciseSheet } from './CreateExerciseSheet'

interface Props {
  open: boolean
  onClose: () => void
  current: Exercise | null
  /** Auswahl; bei Tausch folgt die Frage „Nur heute / Dauerhaft“ */
  onPick: (e: Exercise, scope: 'heute' | 'dauerhaft') => void
  mode?: 'tauschen' | 'hinzufuegen'
  defaultArt?: 'kraft' | 'mobility'
}

/** ÜBUNG TAUSCHEN (S28/S37) – Alternativen derselben Muskelgruppe, ähnlichste zuerst. */
export function SwapSheet({ open, onClose, current, onPick, mode = 'tauschen', defaultArt }: Props) {
  const profile = useProfile()
  const [art, setArt] = useState<'kraft' | 'mobility'>(current?.art ?? defaultArt ?? 'kraft')
  const [muscle, setMuscle] = useState<MuscleId | null>(current?.primaer ?? null)
  const [filter, setFilter] = useState<EquipmentFilter>('alle')
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [recommended, setRecommended] = useState(true)
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState<Exercise | null>(null)
  const [menu, setMenu] = useState<'muskel' | 'equipment' | null>(null)
  const [create, setCreate] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!open) return
    setArt(current?.art ?? defaultArt ?? 'kraft')
    setMuscle(current?.primaer ?? null)
    setQ('')
    setFilter('alle')
    setOnlyAvailable(true)
    setRecommended(true)
  }, [open, current, defaultArt])

  const list = useMemo(
    () =>
      swapAlternatives(recommended && current && current.art === art ? current : null, allExercises(), {
        filter,
        onlyAvailable,
        available: profile?.equipment ?? [],
        excluded: profile?.excludedExercises,
        query: q,
        muscle: muscle && MUSCLES[muscle].main === (art === 'mobility' ? 'Mobility' : MUSCLES[muscle].main) ? muscle : null,
        art,
      }).filter((e) => !current || e.id !== current.id),
    [current, art, filter, onlyAvailable, profile, q, muscle, recommended, version], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const muscleOptions = (Object.keys(MUSCLES) as MuscleId[]).filter((m) => (art === 'mobility' ? MUSCLES[m].main === 'Mobility' : MUSCLES[m].main !== 'Mobility'))
  const pick = (e: Exercise) => (mode === 'hinzufuegen' ? onPick(e, 'heute') : setConfirm(e))
  const accent = art === 'mobility' ? '#3e7592' : '#f3af3d'

  return (
    <>
      <BottomSheet open={open} onClose={onClose} full label={mode === 'tauschen' ? 'Übung tauschen' : 'Übung hinzufügen'}>
        <div className="relative min-h-full pb-[150px]">
          <h2 className="px-6 text-screen font-black uppercase">{mode === 'tauschen' ? 'Übung tauschen' : 'Übung hinzufügen'}</h2>
          {current && mode === 'tauschen' && (
            <div className="mx-6 mt-[30px] flex h-[110px] items-center gap-6 rounded-xl border border-elevated px-6">
              <ExerciseGlyph exercise={current} size={60} />
              <span>
                <span className="block text-[16px] text-fg-2">{muscleLabel(current.primaer)}</span>
                <span className="mt-1 block text-[19px] font-semibold">{current.name}</span>
              </span>
            </div>
          )}
          <div className="mx-6 mt-[26px] flex items-center justify-between">
            <span className="text-[19px] font-medium">Alle Übungen</span>
            <button type="button" onClick={() => setCreate(true)} className="h-[36px] rounded-md bg-elevated px-4 text-[16px] font-bold">
              Erstellen
            </button>
          </div>
          <Segmented
            className="mx-6 mt-[18px]"
            value={art}
            onChange={(v) => {
              setArt(v)
              setMuscle(null)
            }}
            options={[
              { id: 'kraft', label: 'Hypertrophie' },
              { id: 'mobility', label: 'Mobility' },
            ]}
          />
          <div className="mt-[14px] flex flex-col gap-[12px] px-6">
            {list.map((e) => (
              <button key={e.id} type="button" onClick={() => pick(e)} className="flex min-h-[104px] items-center gap-6 rounded-xl border border-elevated px-6 py-3 text-left active:opacity-80">
                <ExerciseGlyph exercise={e} size={60} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] text-fg-2">{muscleLabel(e.primaer)}</span>
                  <span className={`mt-1 block text-[20px] font-semibold leading-tight ${art === 'mobility' ? 'text-grad-blue' : 'text-grad-accent'}`}>{e.name}</span>
                </span>
              </button>
            ))}
            {!list.length && <p className="py-10 text-center text-body text-fg-2">Keine passende Übung. Ändere die Filter oder erstelle eine eigene Übung.</p>}
          </div>
        </div>
        {/* schwebende Filter + Suche */}
        <div className="pointer-events-none sticky bottom-0 -mt-[150px] bg-gradient-to-t from-surface via-surface/95 to-transparent pt-6">
          <div className="no-scrollbar pointer-events-auto flex gap-[10px] overflow-x-auto px-4">
            <button type="button" onClick={() => setRecommended((v) => !v)} className={`flex h-[40px] shrink-0 items-center gap-3 rounded-md px-4 text-[17px] ${recommended ? 'bg-surface-3' : 'border-2 border-elevated bg-surface'}`}>
              <Icon name="star" size={22} style={{ color: art === 'mobility' ? '#2c5ea9' : '#f3ae3c' }} />
              <span style={{ color: recommended ? accent : '#9f9f9f' }} className={recommended ? (art === 'mobility' ? 'text-grad-blue' : 'text-grad-accent') : ''}>
                Empfohlen
              </span>
            </button>
            <button type="button" onClick={() => setMenu('muskel')} className={`flex h-[40px] shrink-0 items-center gap-2 rounded-md px-4 text-[17px] ${muscle ? 'border-2 border-fg bg-surface' : 'bg-surface-3'}`}>
              <Icon name="person" size={22} />
              {muscle ? muscleLabel(muscle) : 'Alle Muskeln'}
            </button>
            <button type="button" onClick={() => setMenu('equipment')} className={`flex h-[40px] shrink-0 items-center gap-2 rounded-md px-4 text-[17px] ${filter !== 'alle' || !onlyAvailable ? 'border-2 border-fg bg-surface' : 'bg-surface-3'}`}>
              <Icon name="dumbbell" size={22} />
              {filter === 'mit' ? 'Mit Gerät' : filter === 'ohne' ? 'Ohne Gerät' : 'Equipment'}
            </button>
          </div>
          <div className="pointer-events-auto mx-4 mt-[10px] flex h-[50px] items-center gap-4 rounded-lg bg-elevated px-4" style={{ marginBottom: 'max(var(--safe-bottom), 16px)' }}>
            <Icon name="search" size={26} className="text-fg-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Übung suchen" className="w-full bg-transparent text-[18px] outline-none placeholder:text-fg-2" />
          </div>
        </div>
      </BottomSheet>

      <ActionSheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.name ?? ''}
        items={[
          { label: 'Nur heute', icon: 'event', hint: 'Der Plan bleibt unverändert.', onClick: () => confirm && (onPick(confirm, 'heute'), onClose()) },
          { label: 'Dauerhaft im Plan ersetzen', icon: 'swap', hint: 'Gilt ab sofort für alle Einheiten mit dieser Übung.', onClick: () => confirm && (onPick(confirm, 'dauerhaft'), onClose()) },
        ]}
      />
      <ActionSheet
        open={menu === 'muskel'}
        onClose={() => setMenu(null)}
        title="Muskelgruppe"
        items={[{ label: 'Alle Muskeln', icon: 'person' as const, onClick: () => setMuscle(null) }, ...muscleOptions.map((m) => ({ label: muscleLabel(m), icon: 'person' as const, onClick: () => setMuscle(m) }))]}
      />
      <ActionSheet
        open={menu === 'equipment'}
        onClose={() => setMenu(null)}
        title="Equipment"
        items={[
          { label: 'Alle', icon: 'list', onClick: () => setFilter('alle') },
          { label: 'Mit Gerät', icon: 'dumbbell', onClick: () => setFilter('mit') },
          { label: 'Ohne Gerät', icon: 'person', hint: 'Körpergewicht oder Widerstandsband', onClick: () => setFilter('ohne') },
          {
            label: onlyAvailable ? 'Auch nicht verfügbares Equipment zeigen' : 'Nur mein Equipment zeigen',
            icon: 'filter',
            hint: onlyAvailable ? 'Aktuell: nur Equipment aus Deinem Profil' : 'Aktuell: alle Geräte',
            onClick: () => setOnlyAvailable((v) => !v),
          },
        ]}
      />
      <CreateExerciseSheet
        open={create}
        onClose={() => setCreate(false)}
        defaults={{ art, primaer: muscle ?? current?.primaer ?? (art === 'mobility' ? 'huefte' : 'brust') }}
        onCreated={(e) => {
          setVersion((v) => v + 1)
          pick(e)
        }}
      />
    </>
  )
}
