import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { SubHeader } from '../../components/layout/PageHeader'
import { Icon } from '../../components/icons/Icon'
import { Chip } from '../../components/ui/Chip'
import { ExerciseGlyph } from '../../components/ui/ExerciseGlyph'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { Stepper } from '../../components/ui/Stepper'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { ActionSheet } from '../../components/ui/ActionSheet'
import { useToast } from '../../components/ui/Toast'
import { addSetAfter, ADJUSTMENT_KINDS, deleteSessionCompletely, deleteSet, editSet, sessionDetail } from '../../db/repo/journal'
import { exerciseName, getExercise } from '../../data/exercises'
import { stepFor } from '../../db/repo/weights'
import { muscleLabel } from '../../data/muskeln'
import { formatLong } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { sessionE1rm } from '../../logic/e1rm'
import { WEEK_TYPE_INFO } from '../../logic/progression'
import { WEEK_TYPE_STYLE } from '../training/weekTypeStyle'
import type { SetEntry } from '../../db/types'

/** Detailansicht einer abgeschlossenen Einheit – bearbeiten und löschen. */
export default function SessionDetailScreen() {
  const { id } = useParams()
  const sessionId = Number(id)
  const navigate = useNavigate()
  const toast = useToast()
  const data = useLiveQuery(() => sessionDetail(sessionId), [sessionId])
  const [editing, setEditing] = useState(false)
  const [setSheet, setSetSheet] = useState<SetEntry | null>(null)
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState<0 | 1 | 2>(0)

  if (data === undefined) return <div className="h-dvh bg-bg" />
  if (data === null) {
    return (
      <div className="h-dvh bg-bg">
        <SubHeader title="Training" onBack={() => navigate(-1)} />
        <p className="p-6 text-fg-2">Diese Einheit gibt es nicht mehr.</p>
      </div>
    )
  }
  const { session, exercises, adjustments, imported } = data
  const done = exercises.flatMap((e) => e.setList.filter((s) => s.done))
  const volume = Math.round(done.reduce((sum, x) => sum + (x.weight ?? 0) * x.reps, 0))
  const minutes = session.startedAt && session.endedAt ? Math.round((session.endedAt - session.startedAt) / 60000) : null
  const style = WEEK_TYPE_STYLE[session.weekType]

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <SubHeader
        title={session.name}
        onBack={() => navigate(-1)}
        right={
          <button type="button" aria-label="Menü" onClick={() => setMenu(true)} className="flex h-10 w-8 items-center justify-center">
            <Icon name="moreVert" size={28} />
          </button>
        }
      />
      <p className="mx-5 mt-4 text-[15px] text-fg-2">{formatLong(session.date)}</p>
      <div className="no-scrollbar flex gap-[10px] overflow-x-auto px-5 pt-3">
        {session.kind === 'kraft' && !session.imported && (
          <Chip icon={style.icon} tone={session.weekType === 'normal' ? undefined : style.badge}>
            {WEEK_TYPE_INFO[session.weekType].label}
          </Chip>
        )}
        {!!minutes && <Chip icon="schedule">{minutes} Minuten</Chip>}
        {editing && (
          <Chip icon="edit" tone="#f3af3d" onClick={() => setEditing(false)}>
            Bearbeiten beenden
          </Chip>
        )}
      </div>

      {session.imported ? (
        <div className="mx-5 mt-4 rounded-xl border border-elevated bg-surface px-4 py-4">
          <p className="text-[15px] text-fg-2">Aus Deiner bisherigen App übernommen. Satzdetails gibt es dafür nicht – nur die Maximalkraft dieses Tages:</p>
          {imported.map((p) => (
            <p key={p.exerciseId} className="mt-2 flex justify-between text-[15.5px]">
              <span>{exerciseName(p.exerciseId)}</span>
              <span className="text-orange">{fmt(p.e1rm)} kg</span>
            </p>
          ))}
        </div>
      ) : (
        <>
          <div className="mx-5 mt-4 grid grid-cols-3 rounded-xl border border-elevated bg-surface py-3 text-center">
            <div>
              <p className="text-[20px] font-extrabold">{fmt(volume)} kg</p>
              <p className="text-[13px] text-fg-2">Volumen</p>
            </div>
            <div>
              <p className="text-[20px] font-extrabold">{done.length}</p>
              <p className="text-[13px] text-fg-2">Sätze</p>
            </div>
            <div>
              <p className="text-[20px] font-extrabold">{exercises.length}</p>
              <p className="text-[13px] text-fg-2">Übungen</p>
            </div>
          </div>
          {session.checkin && !session.checkin.skipped && (
            <p className="mx-5 mt-3 text-[13.5px] text-fg-2">
              Check-in: Energie {session.checkin.energy ?? '–'}/10 · Schlaf {session.checkin.sleep ?? '–'}/10
              {Object.entries(session.checkin.soreness ?? {}).some(([, v]) => (v ?? 0) > 0)
                ? ` · Muskelkater ${Object.entries(session.checkin.soreness ?? {})
                    .filter(([, v]) => (v ?? 0) > 0)
                    .map(([m, v]) => `${muscleLabel(m as never)} ${v}`)
                    .join(', ')}`
                : ''}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3 px-5">
            {exercises.map((se) => {
              const ex = getExercise(se.exerciseId)
              const e1 = sessionE1rm(se.setList)
              return (
                <div key={se.id} className="rounded-xl border border-elevated bg-surface px-4 py-3">
                  <div className="flex items-center gap-3">
                    {ex && <ExerciseGlyph exercise={ex} size={40} />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] font-semibold">{ex?.name ?? se.exerciseId}</p>
                      <p className="text-[13px] text-fg-2">
                        {se.repMin}–{se.repMax} Wdh{e1 ? ` · Ø 1RM ${fmt(e1, 1)} kg` : ''}
                        {se.swappedFrom ? ` · statt ${exerciseName(se.swappedFrom)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col">
                    {se.setList.map((s) => (
                      <button key={s.id} type="button" disabled={!editing} onClick={() => setSetSheet(s)} className={`grid grid-cols-[30px_1fr_1fr_1fr_20px] items-center rounded-md py-[5px] text-left text-[15px] ${editing ? 'active:bg-white/5' : ''} ${s.done ? '' : 'text-fg-3 line-through'}`}>
                        <span className="text-fg-2">{s.index + 1}</span>
                        <span>{s.reps} Wdh</span>
                        <span>{s.weight ? `${fmt(s.weight)} kg` : '–'}</span>
                        <span className="text-fg-2">RIR {s.rir ?? '–'}</span>
                        {editing ? <Icon name="edit" size={16} className="text-fg-2" /> : <span />}
                      </button>
                    ))}
                    {editing && (
                      <button type="button" onClick={() => addSetAfter(se.id!)} className="mt-1 flex items-center gap-2 text-[14px] font-semibold text-amber">
                        <Icon name="add" size={18} /> Satz hinzufügen
                      </button>
                    )}
                  </div>
                  {se.note && <p className="mt-2 text-[13.5px] italic text-fg-2">„{se.note}“</p>}
                </div>
              )
            })}
          </div>
        </>
      )}

      {adjustments.length > 0 && (
        <>
          <p className="mx-5 mt-6 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">Anpassungen in dieser Einheit</p>
          <div className="mx-5 mt-2 flex flex-col gap-2">
            {adjustments.map((a) => (
              <div key={a.id} className="rounded-lg bg-surface px-4 py-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-amber">{ADJUSTMENT_KINDS.find((k) => k.id === a.kind)?.label ?? a.kind}</p>
                <p className="mt-1 text-[15px] font-semibold">
                  {a.exerciseId && a.field !== 'uebung' ? `${exerciseName(a.exerciseId)}: ` : ''}
                  {a.title}
                </p>
                <p className="text-[14px] text-fg-2">{a.reason}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title={session.name}
        items={[
          ...(!session.imported ? [{ label: editing ? 'Bearbeiten beenden' : 'Bearbeiten', icon: 'edit' as const, hint: 'Sätze ändern, hinzufügen oder löschen', onClick: () => setEditing(!editing) }] : []),
          { label: 'Training löschen', icon: 'delete' as const, danger: true, onClick: () => setConfirm(1) },
        ]}
      />
      <ConfirmSheet
        open={confirm === 1}
        onClose={() => setConfirm(0)}
        title="Training löschen?"
        text={`„${session.name}“ vom ${formatLong(session.date)} wird mit allen Sätzen, Maximalkraft-Werten und Protokolleinträgen gelöscht. Das lässt sich nicht rückgängig machen.`}
        confirmLabel="Löschen"
        onConfirm={async () => {
          await deleteSessionCompletely(sessionId)
          toast('Training gelöscht')
          navigate(-1)
        }}
      />
      <SetEditSheet set={setSheet} onClose={() => setSetSheet(null)} />
    </div>
  )
}

function SetEditSheet({ set, onClose }: { set: SetEntry | null; onClose: () => void }) {
  const [vals, setVals] = useState({ reps: 8, weight: 0 as number | null, rir: 2 as number | null })
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (set) setVals({ reps: set.reps, weight: set.weight, rir: set.rir })
  }, [set])
  const ex = set ? getExercise(set.exerciseId) : undefined
  const step = (ex && stepFor(ex)) || 2.5
  return (
    <>
      <BottomSheet
        open={!!set}
        onClose={onClose}
        label="Satz bearbeiten"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" icon="delete" onClick={() => setConfirm(true)}>
              Löschen
            </Button>
            <Button
              icon="check"
              onClick={async () => {
                if (set) await editSet(set.id!, vals)
                onClose()
              }}
            >
              Speichern
            </Button>
          </div>
        }
      >
        <SheetTitle sub={set ? `${exerciseName(set.exerciseId)} · Satz ${set.index + 1}` : ''}>Satz bearbeiten</SheetTitle>
        <div className="mx-6 mb-4 grid grid-cols-3 rounded-lg bg-elevated px-1 py-3 text-center">
          <div>
            <p className="text-[15px] text-fg-2">WDH</p>
            <Stepper compact value={vals.reps} onChange={(v) => setVals({ ...vals, reps: v })} min={0} max={100} />
          </div>
          <div>
            <p className="text-[15px] text-fg-2">KG</p>
            <Stepper compact value={vals.weight ?? 0} onChange={(v) => setVals({ ...vals, weight: v || null })} step={step} min={0} max={500} />
          </div>
          <div>
            <p className="text-[15px] text-fg-2">RIR</p>
            <Stepper compact value={vals.rir ?? 0} onChange={(v) => setVals({ ...vals, rir: v })} min={0} max={6} />
          </div>
        </div>
      </BottomSheet>
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Satz löschen?"
        text="Der Satz wird entfernt und die Maximalkraft dieser Einheit neu berechnet."
        confirmLabel="Löschen"
        onConfirm={async () => {
          if (set) await deleteSet(set.id!)
          onClose()
        }}
      />
    </>
  )
}
