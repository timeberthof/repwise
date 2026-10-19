import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Group, Row, Section, SettingsLayout } from './SettingsLayout'
import { Icon } from '../../components/icons/Icon'

const STEPS: { title: string; text: string }[] = [
  { title: 'Installieren', text: 'Die Repwise-Adresse in Safari öffnen → unten auf „Teilen“ (Quadrat mit Pfeil) → „Zum Home-Bildschirm“ → „Hinzufügen“.' },
  { title: 'Immer über das Symbol starten', text: 'Nur die App auf dem Home-Bildschirm hat einen eigenen, dauerhaften Speicher. In einem normalen Safari-Tab siehst Du andere (leere) Daten.' },
  { title: 'Backup machen', text: 'Einstellungen → Daten → „Backup erstellen“ → „Teilen / In Dateien sichern“ → z. B. iCloud Drive. Repwise erinnert alle 14 Tage daran.' },
  { title: 'Backup wiederherstellen', text: 'Einstellungen → Daten → „Backup importieren“ → Datei in „Dateien“ auswählen → Vorschau prüfen → „Importieren“. Die Daten auf dem Gerät werden ersetzt. Nach einer Neuinstallation geht das direkt im ersten Schritt („Daten importieren“).' },
  { title: 'Vorsicht beim Löschen', text: 'Wird das Repwise-Symbol vom Home-Bildschirm gelöscht, löscht iOS auch alle Daten der App. Vorher ein Backup machen.' },
  { title: 'Updates', text: 'Ist eine neue Version veröffentlicht, erscheint oben „Neue Version verfügbar“ → „Neu laden“. Deine Daten bleiben erhalten. Erscheint nichts: App ganz schließen (nach oben wischen) und neu öffnen.' },
  { title: 'Offline', text: 'Nach dem ersten Öffnen funktioniert Repwise komplett ohne Internet.' },
]

/** Über die App: Name, Version, Kurzanleitung fürs iPhone. */
export function AboutPage() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  return (
    <SettingsLayout title="Über die App">
      <div className="mx-4 mt-4 flex items-center gap-4 rounded-xl bg-surface px-4 py-5">
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" className="h-[64px] w-[64px] rounded-[15px]" />
        <div>
          <p className="text-[24px] font-black">Repwise</p>
          <p className="text-[14px] text-fg-2">
            Version {__APP_VERSION__} · {__BUILD_DATE__}
          </p>
          <p className="text-[13px] text-fg-2">Persönliches Krafttraining mit automatischer Anpassung</p>
        </div>
      </div>

      <Section title="Anleitung fürs iPhone">
        <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3 text-left text-[16px] font-semibold">
          {open ? 'Anleitung ausblenden' : 'Anleitung anzeigen'}
          <Icon name={open ? 'arrowUp' : 'arrowDown'} size={22} className="text-fg-2" />
        </button>
        {open && (
          <ol className="mt-2 flex flex-col gap-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-xl bg-surface px-4 py-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-orange text-[14px] font-bold text-fg-inverse">{i + 1}</span>
                <span>
                  <span className="block text-[16px] font-semibold">{s.title}</span>
                  <span className="mt-[2px] block text-[14.5px] leading-snug text-fg-2">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Daten & Datenschutz" hint="Repwise speichert alles nur lokal auf diesem Gerät (IndexedDB). Es gibt kein Konto, keine Cloud und keine Weitergabe von Daten.">
        <Group>
          <Row label="Daten & Backup" onClick={() => navigate('/einstellungen/daten')} last>
            <Icon name="chevronRight" size={20} className="text-fg-2" />
          </Row>
        </Group>
      </Section>

      <Section title="Lizenzen" hint="Schrift: Montserrat (SIL Open Font License). Symbole: Material Symbols (Apache 2.0). Diagramme: Recharts (MIT). Datenbank: Dexie (Apache 2.0).">
        <div />
      </Section>
    </SettingsLayout>
  )
}
