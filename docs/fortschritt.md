# Fortschritt

## Phase 0 – Analyse (15.10.2026) ✅ wartet auf Bestätigung

- 44 Screenshots gesichtet, nach Aufnahmezeit als S01–S44 geordnet.
- `docs/screens.md`: jeder Screen mit Zweck, Elementen, Navigation; Liste fehlender Screens.
- `docs/design.md`: Farben pixelgenau gemessen, Typografie (Montserrat), Abstände, Radien, Komponenten.
- `statistik-werte.md` (heute in `privat/`, nicht im Repository): alle ausgelesenen Werte (16 Übungsverläufe, Körper-, Ernährungs- und Profildaten).
  Kontrolle: angezeigte Differenzen stimmen bei allen 16 Übungen mit den abgelesenen Werten überein.
- `docs/offene-fragen.md`: offene Fragen inkl. 3 Namensvorschlägen.

**Nachtrag 18.10.2026:** 5 neue Screenshots (Pausentimer, Trainingsabschluss) als S45–S49 eingearbeitet
(screens.md, design.md). Bedeutung der Statistik-Werte geklärt („Maximalkraft“), neuere Werte vom
15./17.10. in statistik-werte.md ergänzt (u. a. Beinpresse 221 kg, Butterfly 108,87 kg).

Antworten am 18.10.2026 erhalten → `DECISIONS.md`.

## Phase 1 – Projekt, Design-System, Navigation, Datenmodell, Bibliothek (18.10.2026) ✅

- Git 2.55 und Node.js 24 LTS installiert, Projekt in `D:\Projekte\fittness`, Screenshots nach `screenshots/` sortiert.
- Vite 8, React 19, TypeScript, Tailwind 4 (Tokens aus `docs/design.md`), Dexie, vite-plugin-pwa, Recharts, Vitest, Playwright (WebKit).
- Datenmodell `src/db/types.ts` / `src/db/db.ts`, Startwerte-Import `src/db/repo/startwerte.ts`.
- Übungsbibliothek `src/data/uebungen.json` (158 Kraft, 27 Mobility); Test prüft ≥ 120, Gerätevielfalt, ≥ 2 ohne Gerät je Gruppe und alle Übungen aus den Screenshots.
- Logik: `progression.ts` (alle Regeln + Schwellenwerte), Maximalkraft, Kalorien, HF-Zonen, Zyklus, Serie – **50 Unit-Tests grün**.
- UI: Tab-Pager (wischbar), Tab-Leiste, Kopfzeilen, Sheets, Toast, Slider, Stepper, Optionskarten u. a.; Dashboard mit Hinweis-Karussell, Schritte-, Kalorien-, Weigh-In- und Trainings-Kachel; Schritte-Abfrage für gestern; Gewicht eintragen.
- Visueller Vergleich: `npm run shots` + `scripts/compare.ps1` → `screenshots/vergleich/`.
  Dashboard-Abweichungen behoben: Kopf (Flamme/Zahl/Zahnrad), Kachel-Schriftgrößen, Tab-Beschriftung, Karteninhalt oben ausgerichtet.
  Bewusste Unterschiede: 3 statt 4 Tabs (keine Ernährung), Kachel „Kalorien“ zeigt das Tagesziel, kein Mobility-Test.

## Phase 2 – Onboarding und Planerstellung (18.10.2026) ✅

- Planerzeugung `src/logic/planGenerator.ts`: Split-Vorlagen (Push|Pull wie im Original, PPL, Upper|Lower, Ganzkörper), Volumen nach Erfahrung, Dauer, Schwerpunkte, Equipment, Ausschlüsse, Schmerzen; Mobility-Super-Satz je Trainingstag. 9 Unit-Tests.
- Onboarding mit 17 Schritten im Layout der Zyklusplanung, vorbelegt mit den Startwerten, inkl. Kalorienbedarf mit Rechenweg und Startwerte-Bestätigung.
- Vergleich mit dem Original (S20–S24): Titelgröße, Optionskarten-Höhe, Legende „EMPFOHLEN“, Körperfett-Layout und Wochenplanung angeglichen. Statt 3D-Modell eine schlichte Silhouette.
- Erzeugter Plan für Dich: Push (Bankdrücken MP, KH-Schulterdrücken, Beinpresse, Trizepsdrücken, Butterfly, Seitheben, Beinstrecker, Adduktoren) / Pull (Latzug, Kabelrudern, KH-Kreuzheben, Cable Curls, Butterfly Reverse, Beinbeuger, Bauchpresse), 6 × pro Woche, je ~75 Min, plus Mobility für Sprunggelenk/Füße/Hüfte.

## Phase 3 – Training durchführen (18.10.2026) ✅

- Training-Tab (S02): Kopf mit Plan-Status-Chip „Aktiv ⌄“ und Serie, Datum + „•••“ (Wochentyp, Plan bearbeiten, Heute), wischbare Wochenleiste mit Haken und Einheiten-Pillen, Mesozyklus-Karte in der letzten Zykluswoche, Einheiten-Karten mit Badge/⋮ (Trainingstyp, Verschieben, Überspringen), Aktivität hinzufügen, Gespeicherte Trainings.
- Workout (S27/S29–S35/S45): Übersicht, Trainingstyp, Check-in (3 Fragen), Übungs-Sheet mit Satz-Tabelle, Steppern, Notizen, Sätze/Wiederholungen/Verfügbare Gewichte, ⚙-Einstellungen, Pausentimer mit Ton + Wake Lock, Übung tauschen (heute/dauerhaft), Übung hinzufügen/erstellen.
- Abschluss (S46–S49): Serie mit Konfetti, Wochenreihe, Kennzahlen, trainierte Muskeln (eigene Körperkarte), Maximalkraft mit Rekord-Pokal und aufklappbarem Verlauf, Teilen.
- Datenlogik `src/db/repo/sessions.ts` (Einheiten anlegen, Vorgaben berechnen, Sätze, Tausch, Abschluss) – 6 Datenbank-Tests inkl. Progression +2,5 kg nach erreichtem oberem Ende; `src/logic/swap.ts` – 4 Tests. **69 Tests grün.**
- Playwright: kompletter Durchlauf eines Push-Trainings bis zum Abschluss automatisiert (`tests/phase3.screens.ts`).

## Phase 4 – Statistik, Zyklus, Wochen, Verlauf (18.10.2026) ✅

- Pläne gelten ab ihrem Startdatum (`planForDate`); ein neuer Zyklus-Plan wird vorab für den nächsten Zyklus angelegt.
- Statistik mit Unter-Tabs Training · Körper · Cardio; **Übungs-Detailseite** mit Diagramm (Maximalkraft/Gewicht/Wdh/Volumen), Zeitraum, Ø-Werten, Bestwerten und allen Einheiten mit Sätzen.
- **Zyklusübersicht** `/zyklus` (6 Wochen, Typ, Status, manuell ändern/zurücksetzen, Deload überspringen) und **Zyklusplanung** `/zyklus/planen` (S17–S26, Stagnations-Varianten).
- **Wochen blättern** im Training-Tab mit Kopfzeile (KW, Zeitraum, Zykluswoche, Typ), Wochenübersicht (geplant vs. erledigt/verpasst) und **Vorschau** zukünftiger Einheiten mit voraussichtlichen Gewichten.
- **Verlauf** `/verlauf` mit Detailansicht (bearbeiten, löschen) und **Anpassungsprotokoll** (Filter nach Übung und Art).
- Tests: 75 grün (u. a. Zyklus-Änderung inkl. Protokoll, Neuberechnung, Detailwerte, Bearbeiten/Löschen). Playwright: `tests/phase4.screens.ts`.
- Hinweis: WebKit unter Windows ist bei IndexedDB langsam (Verlauf ~1 s) – Verlauf nutzt deshalb gebündelte Abfragen.

## Phase 5 – Cardio, Einstellungen, Fortschrittsfotos (18.10.2026) ✅

- **Cardio-Eintrag** mit Zielzone aus dem Alter, allen Pflicht- und optionalen Feldern; Cardio-Statistik mit Dauer/Woche, Ø-Puls und Verteilung nach Aktivität.
- **Einstellungen:** Profil (mit Gewichtsverlauf), Ziele & Kalorien (Rechenweg), Trainingsplan (Entwurf → „Plan neu erstellen“, Gewichtssprünge), Zyklus-Link, Cardio (HFmax, Zonengrenzen), Schritte, Hinweise, Daten (Speicherstatus, Backup, Löschen), Über die App (Version, iPhone-Anleitung).
- **Fortschrittsfotos:** Aufnehmen/Galerie, Verkleinern, Ansicht/Datum/Gewicht/Notiz, Galerie nach Monat, Vollbild, Vergleich, Löschen.
- **Backup** (Export/Import/Löschen) bereits umgesetzt, Feinschliff in Phase 6.
- Tests: 79 grün (u. a. Backup-Rundlauf inkl. Fotos). Playwright: `tests/phase5.screens.ts`.

## Phase 6 – PWA, Backup, Veröffentlichung (18.10.2026) ✅ (Hochladen auf GitHub: eigener Schritt, siehe ANLEITUNG-IPHONE.md)

- **Icons** in allen Größen (`public/icons/`, Skript `scripts/app-icons.mjs`), Manifest unter `/repwise/`, iOS-Meta-Tags, Update-Hinweis mit Prüfung beim Zurückkehren in die App.
- **Persönliche Daten** aus dem Repository entfernt (`privat/`, Beispieldaten für Tests); kein Build enthält sie. Import der Startwerte und Wiederherstellen eines Backups direkt im ersten Onboarding-Schritt.
- **Backup-Import** als gemeinsame Komponente (Einstellungen → Daten und Onboarding).
- **GitHub Actions** (`deploy.yml`) und `scripts/veroeffentlichen.ps1` (Datenschutz-Prüfung, erster Commit ohne alten Verlauf, Push).
- **Anleitung** `ANLEITUNG-IPHONE.md`, Kurzfassung in Einstellungen → Über die App.
- **Geprüft gegen den Produktions-Build** (`npx playwright test -c playwright.prod.config.ts`, WebKit, iPhone-Größe): Startwerte-Datei laden → Onboarding → Service Worker aktiv → **offline** neu laden und navigieren → Backup herunterladen → alle Daten löschen → Backup im Onboarding importieren → alle Tabellen wieder vollständig. Keine Seitenfehler.
- Nicht automatisch prüfbar: echte Installation auf dem iPhone, Teilen-Menü („In Dateien sichern“), Update-Hinweis nach einer echten neuen Version.
