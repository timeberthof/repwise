import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { SubHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/icons/Icon'
import { exerciseName } from '../../data/exercises'
import { listTemplates, reorderTemplates } from '../../db/repo/templates'

/** Eigene Vorlagen (z. B. Push, Pull): Liste, Reihenfolge, öffnen zum Bearbeiten. */
export default function TemplatesPage() {
  const navigate = useNavigate()
  const list = useLiveQuery(() => listTemplates(), [])
  const move = (i: number, dir: -1 | 1) => {
    if (!list) return
    const ids = list.map((t) => t.id!)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    void reorderTemplates(ids)
  }
  return (
    <div className="min-h-dvh bg-bg pb-28">
      <SubHeader title="Vorlagen" onBack={() => navigate(-1)} />
      <p className="mx-6 mt-3 text-[13.5px] leading-snug text-fg-2">Eine Vorlage ist eine Liste Deiner Übungen. Beim Start eines Trainings werden nur die Übungen übernommen – Gewichte und Wiederholungen trägst Du selbst ein.</p>
      <div className="mt-4 flex flex-col gap-3 px-4">
        {list && !list.length && <p className="py-10 text-center text-body text-fg-2">Noch keine Vorlage.</p>}
        {list?.map((t, i) => (
          <div key={t.id} className="flex items-stretch gap-2">
            <button type="button" onClick={() => navigate(`/vorlagen/${t.id}`)} className="min-w-0 flex-1 rounded-xl border border-elevated bg-surface px-4 py-3 text-left">
              <span className="flex items-center justify-between">
                <span className="text-[18px] font-semibold">{t.name}</span>
                <span className="text-[14px] text-fg-2">{t.exerciseIds.length} Übungen</span>
              </span>
              <span className="mt-1 line-clamp-2 block text-[13.5px] text-fg-2">{t.exerciseIds.map(exerciseName).join(' · ') || 'Noch keine Übungen'}</span>
            </button>
            <span className="flex flex-col justify-center gap-1">
              <button type="button" aria-label="Nach oben" disabled={i === 0} onClick={() => move(i, -1)} className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-3 disabled:opacity-30">
                <Icon name="arrowUp" size={20} />
              </button>
              <button type="button" aria-label="Nach unten" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-3 disabled:opacity-30">
                <Icon name="arrowDown" size={20} />
              </button>
            </span>
          </div>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 px-5" style={{ paddingBottom: 'max(var(--safe-bottom), 16px)' }}>
        <Button icon="add" onClick={() => navigate('/vorlagen/neu')}>
          Neue Vorlage
        </Button>
      </div>
    </div>
  )
}
