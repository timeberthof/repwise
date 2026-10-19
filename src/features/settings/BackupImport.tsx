import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { BottomSheet, SheetTitle } from '../../components/ui/BottomSheet'
import { useToast } from '../../components/ui/Toast'
import { parseBackup, restoreBackup, TABLE_LABELS, type BackupFile } from '../../lib/backup'
import { isStartwerte, type Startwerte } from '../../db/repo/startwerte'
import { Row } from './SettingsLayout'

/**
 * Datei wählen → Repwise-Backup (Vorschau, Sicherheitsabfrage, Wiederherstellen) oder,
 * wenn `onStartwerte` gesetzt ist, auch eine Startwerte-Datei (Onboarding).
 */
export function useImportFile({ onStartwerte }: { onStartwerte?: (s: Startwerte) => void } = {}): { open: () => void; element: ReactNode } {
  const navigate = useNavigate()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<BackupFile | null>(null)
  const [confirm, setConfirm] = useState(false)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const text = await f.text()
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      return toast('Import nicht möglich', 'Die Datei ist kein gültiges JSON.')
    }
    if (onStartwerte && isStartwerte(raw)) return onStartwerte(raw)
    const r = parseBackup(text)
    if (!r.ok) return toast('Import nicht möglich', onStartwerte ? 'Erwartet: Repwise-Backup oder Startwerte-Datei.' : r.error)
    setPreview(r.data)
  }

  const element = (
    <>
      <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
      <BottomSheet
        open={!!preview}
        onClose={() => setPreview(null)}
        label="Backup-Vorschau"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Abbrechen
            </Button>
            <Button onClick={() => setConfirm(true)}>Importieren</Button>
          </div>
        }
      >
        <SheetTitle sub={preview ? `Erstellt am ${new Date(preview.exportedAt).toLocaleString('de-DE')} · App ${preview.appVersion} · Format ${preview.version}` : ''}>Backup-Inhalt</SheetTitle>
        <div className="mx-4 mb-4 overflow-hidden rounded-xl bg-surface-2">
          {preview &&
            Object.entries(TABLE_LABELS)
              .filter(([k]) => (preview.counts[k as keyof typeof TABLE_LABELS] ?? 0) > 0)
              .map(([k, label], i, arr) => (
                <Row key={k} label={label} last={i === arr.length - 1}>
                  <span className="text-[15px] text-fg-2">{preview.counts[k as keyof typeof TABLE_LABELS]}</span>
                </Row>
              ))}
        </div>
      </BottomSheet>
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Daten ersetzen?"
        text="Alle Daten auf diesem Gerät werden durch das Backup ersetzt. Was seit dem Backup dazugekommen ist, geht verloren."
        confirmLabel="Ersetzen"
        onConfirm={async () => {
          if (!preview) return
          await restoreBackup(preview)
          setPreview(null)
          toast('Backup importiert')
          navigate('/', { replace: true })
        }}
      />
    </>
  )
  return { open: () => input.current?.click(), element }
}
