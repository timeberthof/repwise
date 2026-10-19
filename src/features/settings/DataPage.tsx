import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { kvGet } from '../../db/db'
import { Button } from '../../components/ui/Button'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { Icon } from '../../components/icons/Icon'
import { useToast } from '../../components/ui/Toast'
import { backupFileName, canShareFile, downloadFile, prepareBackupFile, shareFile, wipeAllData } from '../../lib/backup'
import { fmt } from '../../logic/format'
import { Group, Row, Section, SettingsLayout } from './SettingsLayout'
import { useImportFile } from './BackupImport'

/** Daten: Speicherstatus, Backup exportieren/importieren, alles löschen. */
export function DataPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [wipe, setWipe] = useState<0 | 1 | 2>(0)
  const importFile = useImportFile()
  const lastBackup = useLiveQuery(() => kvGet<number | null>('backup.last', null), [])

  const refreshStorage = async () => {
    setPersisted((await navigator.storage?.persisted?.()) ?? null)
    const e = await navigator.storage?.estimate?.()
    if (e?.usage !== undefined && e.quota) setUsage({ usage: e.usage, quota: e.quota })
  }
  useEffect(() => {
    refreshStorage()
  }, [])

  const mb = (b: number) => (b < 1024 * 1024 ? `${fmt(Math.max(1, Math.round(b / 1024)))} KB` : `${fmt(b / 1024 / 1024, 1)} MB`)
  const sinceDays = lastBackup ? Math.floor((Date.now() - lastBackup) / 86_400_000) : null

  return (
    <SettingsLayout title="Daten">
      <Section
        title="Speicher"
        hint="Alle Daten liegen nur auf diesem Gerät. „Dauerhaft“ heißt: Safari löscht sie nicht von selbst, wenn der Speicher knapp wird. Auf dem iPhone die App immer über das Symbol auf dem Home-Bildschirm starten."
      >
        <Group>
          <Row label="Dauerhafter Speicher" sub={persisted === null ? 'Wird von diesem Browser nicht unterstützt' : persisted ? 'Aktiv – Daten werden nicht automatisch gelöscht' : 'Nicht bestätigt'}>
            {persisted ? (
              <Icon name="verified" size={24} style={{ color: '#5bbd52' }} />
            ) : (
              persisted === false && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await navigator.storage.persist().catch(() => false)
                    await refreshStorage()
                    toast(ok ? 'Speicher ist dauerhaft' : 'Nicht bestätigt', ok ? undefined : 'Füge Repwise zum Home-Bildschirm hinzu und öffne die App von dort.')
                  }}
                  className="h-[34px] rounded-md bg-fg px-3 text-[14px] font-bold text-fg-inverse"
                >
                  Anfordern
                </button>
              )
            )}
          </Row>
          <Row label="Belegt" sub={usage ? `von ca. ${mb(usage.quota)} verfügbar` : undefined} last>
            <span className="text-[15px] text-fg-2">{usage ? mb(usage.usage) : '–'}</span>
          </Row>
        </Group>
      </Section>

      <Section title="Backup" hint={`Sichert Profil, Trainings, Zyklus, Anpassungsprotokoll, Cardio, Schritte, Einstellungen und Fortschrittsfotos in einer Datei. ${sinceDays === null ? 'Noch kein Backup erstellt.' : sinceDays === 0 ? 'Letztes Backup: heute.' : `Letztes Backup: vor ${sinceDays} ${sinceDays === 1 ? 'Tag' : 'Tagen'}.`}`}>
        {!file ? (
          <Button
            icon="download"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                setFile(await prepareBackupFile())
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Backup wird erstellt…' : 'Backup erstellen'}
          </Button>
        ) : (
          <div className="rounded-xl bg-surface p-4">
            <p className="text-[16px] font-semibold">{file.name}</p>
            <p className="text-[13px] text-fg-2">{mb(file.size)} · bereit</p>
            <div className="mt-3 flex flex-col gap-2">
              {canShareFile(file) && (
                <Button
                  icon="share"
                  onClick={() =>
                    shareFile(file)
                      .then((ok) => ok && toast('Backup gesichert'))
                      .catch(() => toast('Teilen nicht möglich', 'Nutze „Herunterladen“.'))
                  }
                >
                  Teilen / In Dateien sichern
                </Button>
              )}
              <Button variant={canShareFile(file) ? 'secondary' : 'primary'} icon="download" onClick={() => downloadFile(file).then(() => toast('Backup heruntergeladen', file.name))}>
                Herunterladen
              </Button>
            </div>
          </div>
        )}
        <div className="mt-3">
          <Button variant="secondary" icon="upload" onClick={importFile.open}>
            Backup importieren
          </Button>
        </div>
      </Section>

      <Section title="Löschen">
        <Button variant="secondary" icon="deleteForever" className="!text-[#ff6b5f]" onClick={() => setWipe(1)}>
          Alle Daten löschen
        </Button>
      </Section>

      {importFile.element}
      <ConfirmSheet
        open={wipe === 1}
        onClose={() => setWipe(0)}
        title="Alle Daten löschen?"
        text={`Profil, Trainings, Verlauf, Cardio, Fotos und Einstellungen werden von diesem Gerät gelöscht. Erstelle vorher ein Backup („${backupFileName()}“).`}
        confirmLabel="Weiter"
        onConfirm={() => setTimeout(() => setWipe(2), 300)}
      />
      <ConfirmSheet
        open={wipe === 2}
        onClose={() => setWipe(0)}
        title="Wirklich alles löschen?"
        text="Das lässt sich nicht rückgängig machen. Danach startet Repwise mit dem Onboarding."
        confirmLabel="Endgültig löschen"
        onConfirm={async () => {
          await wipeAllData()
          navigate('/', { replace: true })
        }}
      />
    </SettingsLayout>
  )
}
