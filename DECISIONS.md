# Entscheidungen

Festgehaltene Antworten und Annahmen. Nummern = Fragen aus `docs/offene-fragen.md`.
Neue Annahmen während des Baus werden unten angehängt.

## Antworten auf die offenen Fragen (18.10.2026)

| # | Thema | Entscheidung |
|---|---|---|
| 1 | Fehlende Screens | Keine weiteren Screenshots. Fehlende Screens gestalte ich im Stil der App. Satz-Ablauf: Der weiße Button heißt während eines Satzes **„Satz abschließen ✓“**; Tippen speichert den Satz und startet im selben Button den Pausentimer (wie S45). Nach dem letzten Satz → nächste Übung, nach der letzten Übung → Trainingsabschluss. |
| 2 | Statistik-Werte | Die MCI-Werte sind **Durchschnittswerte**. Unsere Regel: Maximalkraft je Satz = Gewicht × (1 + (Wdh + RIR) / 30); Wert je Einheit = **Ø über alle erledigten Arbeitssätze**. Jede Statistik zeigt einen kurzen Erklärtext (z. B. „Ø Maximalkraft pro Einheit, letzte 7 Trainings“). |
| 3 | Profil | Geschlecht, Geburtsdatum, Größe und Gewicht stehen in `privat/startwerte.json` (nicht im Repository, siehe Phase 6). Alter wird immer aus dem Geburtsdatum berechnet. Werte im Onboarding vorausgefüllt und änderbar; Gewicht jederzeit neu eintragbar, mit Verlauf. |
| 4 | Kalorien | Kein Ernährungstracking. Berechnung: **Mifflin-St-Jeor** (Mann: 10 × kg + 6,25 × cm − 5 × Alter + 5) → × Aktivitätsfaktor (1,2 / 1,375 / 1,55 / 1,725 / 1,9) = Gesamtumsatz → Ziel: Fett verlieren −20 %, Rekomposition −10 %, Gewicht halten ±0, Muskelaufbau +10 %. Rechenweg wird in der App erklärt; Neuberechnung bei Änderung von Gewicht, Ziel oder Aktivität. |
| 5 | Dateien | Git 2.55 und Node.js 24 LTS per winget installiert. Projekt liegt in `D:\Projekte\fittness`. Screenshots nach `screenshots/` verschoben und nummeriert. |
| 6 | Name | **Repwise** – App-Name, Titel, Paketname `repwise`. „MCI entscheidet“ → „Repwise entscheidet“. |
| 7 | Cardio & Schritte | Alles von Hand (Garmin), keine Anbindung. Cardio-Eintrag: Dauer, Aktivität (Auswahl + Freitext), Intensität. Schritte: Beim Öffnen fragt die App nach den Schritten von **gestern**, falls sie fehlen; überspringbar; ältere Tage nachtragbar. |
| 8 | Benachrichtigungen | Keine Push-Nachrichten. Hinweise nur in der App (Hinweiskarten im Dashboard-Karussell „Willkommen zurück“, Banner). |
| 9 | Kamera/Mikrofon Ernährung | Entfällt. |
| 10 | Cardio-Intensität | Pro Einheit Vorschlag eines Herzfrequenzbereichs. HFmax nach Tanaka: 208 − 0,7 × Alter (anpassbar). Zonen in % HFmax: Z1 50–60, Z2 60–70, Z3 70–80, Z4 80–90, Z5 90–100. Standard-Ziel: Zone 2. Danach Eintrag: Ø-Puls, optional Zeit in der Zone. |
| 11 | Ernährung | Komplett weggelassen. Code modular (eigener Feature-Ordner je Bereich, Tab-Leiste aus einer Liste), damit ein Ernährungsmodul später als vierter Tab dazukommen kann. |
| 12 | Fortschrittsfotos | Nur lokal (IndexedDB), kein Upload. |
| 13 | Unbekannte Knöpfe | Siehe „Belegung unbekannter Knöpfe“ unten. |
| 14 | 6-Wochen-Zyklus | Automatische Rotation: **Intro → Normal → Normal → Overreaching → Peak Week → Deload**. Jede Woche von Hand änderbar; manuelle Änderungen bekommen das Kennzeichen „Manuell“. **Gewählt: „normal weiter“** – eine Änderung gilt nur für diese Woche, die folgenden Wochen und der Start des nächsten Zyklus bleiben unverändert. Grund: Der Plan bleibt vorhersehbar, und nach einer übersprungenen Deload-Woche beginnt der nächste Zyklus ohnehin mit der leichten Intro-Woche. |
| 15 | Rotation | bestätigt (siehe 14). |
| 16 | Auswahl-Rahmen | Orange-Verlauf, wenn die gewählte Option empfohlen ist, sonst weiß. |
| 17 | Muskelgruppen | Feine Einteilung wie im Original, Zuordnung zu den Gruppen aus CLAUDE.md. |
| 18 | Name abgeschnitten | „Kurzhantel-Kreuzheben mit gestreckten Beinen“. |
| 19 | Check-in | Drei Fragen: Energie (Wellness), Schlaf, Muskelkater je Zielmuskel – alle überspringbar. |

## Belegung unbekannter Knöpfe (Frage 13)

| Knopf | Belegung |
|---|---|
| Thermometer im Workout-Kopf | öffnet den Check-in (Energie, Schlaf, Muskelkater) erneut |
| Chip „Aktiv ⌄“ im Training-Kopf | Plan-Status **Aktiv / Pausiert** (Urlaub, Krankheit). Pausierte Tage zählen nicht als verpasst; nach der Pause greift die Wiedereinstiegs-Regel. |
| „•••“ neben dem Datum | Menü: „Wochentyp ändern“ (Frage 14), „Trainingsplan bearbeiten“, „Zu heute springen“ |
| ⋮ an einer Einheiten-Karte | Menü: „Trainingstyp ändern“, „Auf anderen Tag verschieben“, „Überspringen“ |
| ⚙ im Übungs-Sheet | Übungs-Einstellungen: Pausenzeit, verfügbare Gewichte, Ausführungshinweise |
| „Aktivität hinzufügen“ | neuer Cardio-Eintrag für den gewählten Tag |
| „Gespeicherte Trainings“ | Liste aller abgeschlossenen Trainings (Verlauf, Details ansehen) |
| Icon „Person mit Zahnrädern“ (Mobility-Liste) | entfällt |
| Mobility-Test (Dashboard) | entfällt (Inhalt unbekannt) |

## Weitere Entscheidungen

- **Tab-Leiste:** HOME · TRAINING · STATISTIKEN (Ernährung entfällt, Platz für später vorgesehen).
- **Statistik-Unter-Tabs:** Training · **Körper** (statt Ernährung: Gewicht, Körperfett, Schritte) · Cardio.
- **Dashboard-Kacheln:** Schritte (manuell), **Kalorienziel** (statt „Kalorien heute“, öffnet den Rechenweg), Weigh-In, Trainings.
- **Zyklusplanung Schritt 4** (im Original nicht bekannt): „Dein Gewicht“ – aktuelles Gewicht bestätigen, weil es für Kalorien und Plan gebraucht wird.
- **Mobility:** Wie im Original eine kurze Mobility-Einheit an Trainingstagen (Super-Satz, Körpergewicht), Übungsauswahl nach Schmerz-/Problemzonen (z. B. Fußgelenk → Sprunggelenk/Füße/Hüfte).
- **Bilder:** Keine 3D-Bilder aus dem Original. Stattdessen eigene schlichte Symbole je Equipment und eine eigene vereinfachte Körperkarte.
- **Icons:** Material Symbols Rounded (Apache 2.0), lokal eingebunden. **Schrift:** Montserrat (OFL), lokal eingebunden.
- **Router:** Hash-Routing (`#/…`), damit GitHub Pages ohne Server-Konfiguration funktioniert.
- **Datenschutz im Repository:** Entschieden in Phase 6 – persönliche Daten liegen nur im Ordner `privat/` (in `.gitignore`), das Repository ist öffentlich. Die Original-Screenshots stehen in `.gitignore` (fremdes Design, ~22 MB, nur lokale Referenz).
- **Startwerte:** Die Tabelle in `privat/statistik-werte.md` gilt als bestätigt (keine Korrekturen gemeldet). Das aktuell genannte Gewicht ersetzt den letzten MCI-Wert; Körperfett als Schätzung.
- **Git-Autor:** im Repository lokal gesetzt (Name „timeb“, E-Mail des Kontos), nicht global.

## Phase 2 – Onboarding & Planerstellung

- **Onboarding-Schritte** (Layout wie die Zyklusplanung S17–S26): Begrüßung → Ziel → Erfahrung → Trainings pro Woche → Split → Wochenplanung + Dauer → Trainingsort/Equipment → Körperdaten → Körperfett → Aktivität → Kalorienbedarf → Schwerpunkte → Schmerzen → Übungen ausschließen → Startwerte → Plan wird erstellt → Zusammenfassung. Alles mit den Startwerten vorbelegt.
- **Erfahrung** ist nicht aus den Screenshots ablesbar → Vorbelegung „Fortgeschritten“ (änderbar).
- **Wochenplanung:** Tag antippen, dann ⇄ und den Zieltag antippen → Training wird verschoben. Die Reihenfolge Push/Pull ergibt sich aus der Reihenfolge der Tage.
- **Planstart:** Montag dieser Woche (Mo–Mi) bzw. nächster Montag (Do–So). Bei Onboarding am 18.10. also **Mo 19.10.2026** (statt des MCI-Zyklusstarts am 22.10.), beginnend mit einer Intro-Woche.
- **Push | Pull wie im Original:** Push = Brust, Schultern, Trizeps + kniedominante Beinübungen (Beinpresse, Beinstrecker, Adduktoren); Pull = Rücken, hintere Schulter, Bizeps + Hüftstrecker (KH-Kreuzheben, Beinbeuger), Bauch. Übungen mit Verlauf werden bevorzugt.
- **Volumen:** Sätze je Übung Anfänger 2 / Fortgeschritten 3 / Profi 4, Schwerpunkt-Muskeln +1 Satz; Übungszahl wird an die Dauer angepasst (Schätzung: Sätze × (Pause + 45 s) + 4 Min).
- **Wiederholungsbereiche:** Haupt-Grundübungen 5–8 (ab Fortgeschritten), sonst 8–12, kleine Isolationsübungen 15–20 (die drei Bereiche des Originals).
- **Schmerzen ab Stärke 5:** Übungen, die das Gelenk belasten, werden nicht eingeplant (z. B. Fußgelenk → keine Kniebeugen, Ausfallschritte, Wadenheben); die Mobility-Einheit zielt auf die Region.
- **Körperfett-Schätzung** (Bereich auf dem Regler): Deurenberg-Formel aus BMI, Alter, Geschlecht ± 3 %.
- **Ziel-Empfehlung** nach Körperfett (s. u.)

## Phase 3 – Training durchführen

- **Ablauf:** Einheit antippen → Übersicht (S27) → „Starten“ → Check-in (Wellness, Schlaf, Muskelkater; überspringbar) → Übungs-Sheet. Weißer Button: „Satz N abschließen ✓“ → Pausentimer im selben Button (S45) → nach dem letzten Satz „Nächste Übung ▶“ → nach der letzten Übung „Training beenden ✓“ → Abschluss (S46).
- **Satz-Eingabe:** Werte des aktuellen Satzes stehen vorausgefüllt (grau = Vorschlag). Gespeicherte Werte werden für die folgenden Sätze übernommen. Bereits erledigte Sätze lassen sich antippen und korrigieren.
- **Vorschlag Wiederholungen:** Wiederholungen der letzten Einheit, begrenzt auf den Bereich; ohne Verlauf das untere Ende.
- **Pausentimer:** läuft über die Uhrzeit (überlebt Sheet-Wechsel, Sperrbildschirm, Neuladen). Ende: dreifacher Ton (Web Audio, nach erstem Tippen entsperrt) + Button blinkt. Pausenzeiten: Grundübungen 150 s, sonstige 120 s, kleine Isolation 90 s, Mobility 15 s; je Übung über ⚙ änderbar.
- **Bildschirm anlassen:** Screen Wake Lock, Fallback stummes Video (ältere iOS).
- **Anpassungen sichtbar:** Karte in der Übersicht zeigt den ersten Grund (✨), im Übungs-Sheet eine aufklappbare Hinweisleiste mit allen Gründen und „Rückgängig“ (vor dem ersten Satz). Von Hand geänderte Werte bleiben bei Neuberechnung erhalten.
- **Übung tauschen:** Liste derselben Muskelgruppe, ähnlichstes Bewegungsmuster zuerst; Filter „★ Empfohlen“ (Sortierung nach Ähnlichkeit), Muskel, Equipment (Alle / Mit Gerät / Ohne Gerät, standardmäßig nur eigenes Equipment); danach „Nur heute“ oder „Dauerhaft im Plan ersetzen“. Bereits erledigte Sätze bleiben bei der alten Übung.
- **Trainingstyp:** Chip in der Übersicht (S29) ändert nur diese Einheit; „•••“ im Training-Tab ändert die ganze Woche (Kennzeichen „manuell“), danach läuft der Zyklus normal weiter.
- **Maximalkraft-Rekord (🏆):** nur wenn es schon frühere Werte gab und der neue Wert alle übertrifft.
- **Bewegt (kg):** Summe Gewicht × Wiederholungen aller erledigten Sätze (Körpergewicht zählt 0).
- **Ziel-Empfehlung** nach Körperfett (Männer ≥ 20 %: Fett verlieren / Rekomposition; 12–20 %: Rekomposition / Muskelaufbau; < 12 %: Muskelaufbau / Halten); andere Ziele mit ⚠ wie im Original.

## Phase 4 – Statistik-Detail, Zyklus, Wochen, Verlauf

- **Wochentypen:** Wie im Original Intro · Normal · Overreaching · Peak Week · Deload (statt „Aufbau/Intensiv“). Reihenfolge im 6-Wochen-Zyklus: Intro → Normal → Normal → Overreaching → Peak Week → Deload.
- **Rotation nach manueller Änderung (gewählte Logik):** Eine Änderung gilt **nur für genau diese Woche**. Alle anderen Wochen behalten ihren automatischen Typ, der nächste Zyklus startet zum geplanten Datum wieder mit Intro. Beispiele: Deload überspringen → Woche 6 wird „Normal“, Woche 1 des nächsten Zyklus bleibt Intro. Deload vorziehen (Woche 3 = Deload) → Woche 4–6 laufen wie geplant (Overreaching, Peak, Deload). Grund: Der Zyklus bleibt vorhersehbar, nichts verschiebt sich unbemerkt; wer mehr ändern will, ändert die betreffenden Wochen einzeln.
- **Markierung:** Manuell geänderte Wochen tragen das Badge „Manuell“ und zeigen den automatischen Typ daneben; „Auf automatisch zurücksetzen“ entfernt die Änderung. Jede Änderung (auch zurücksetzen) landet im Anpassungsprotokoll.
- **Wirkung:** Noch nicht begonnene Einheiten der Woche werden sofort neu berechnet (Sätze, RIR). Einheiten, deren Trainingstyp einzeln geändert wurde, behalten diesen Typ.
- **Neuer Plan / nächster Zyklus:** „Nächsten Zyklus planen“ (Ablauf wie S17–S26) legt den neuen Plan **zum Start des nächsten Zyklus** an; bis dahin gilt der alte Plan. „Repwise entscheidet“ ersetzt Übungen mit Stagnation (3 Einheiten ohne neue Bestleistung und ohne Gewichtssteigerung) durch Varianten derselben Muskelgruppe; „Anpassungen beibehalten“ übernimmt den Plan unverändert.
- **Wochen blättern:** Pfeile ‹ › oder Wischen über der Wochenleiste, „Heute“ springt zurück. Kopfzeile: KW · Datumsbereich · „Woche X von 6“ · Wochentyp (manuell). Tippen darauf öffnet die Zyklusübersicht.
- **Vergangene Wochen:** Wochenübersicht mit Status je Einheit (erledigt mit Sätzen, verpasst, übersprungen), Summe Sätze und Volumen. Erledigte Einheiten öffnen die Detailansicht im Verlauf.
- **Zukünftige Wochen:** gekennzeichnet als „Vorschau“. Die Vorschau berechnet Gewichte und Ziele mit der aktuellen Progressionslogik aus dem bisherigen Verlauf, speichert aber nichts. Am Trainingstag wird alles mit dem dann aktuellen Stand und dem Check-in neu berechnet.
- **Statistik-Detail:** Diagramm umschaltbar (Ø Maximalkraft, Ø Arbeitsgewicht, Ø Wiederholungen pro Satz, Volumen je Einheit), Zeitraum 4 Wochen / 3 / 6 Monate / gesamt. Bestwerte über den gesamten Verlauf: bestes Ø-1RM, schwerster Satz, meiste Wiederholungen in einem Satz, höchstes Einheiten-Volumen. Aus der bisherigen App gibt es nur Maximalkraft (und einzelne Arbeitsgewichte).
- **Verlauf:** Trainings und Cardio chronologisch, nach Monat gruppiert. Detailansicht: Sätze nachträglich ändern, hinzufügen, löschen; Training löschen (mit Sicherheitsabfrage). Änderungen berechnen die Maximalkraft der Einheit neu und werden protokolliert.
- **Anpassungsprotokoll:** Automatische Anpassungen werden beim Abschluss einer Einheit gespeichert (nur echte Änderungen; „Gewicht bleibt“ nicht). Wochentyp-Anpassungen einmal pro Einheit statt pro Übung. Übungstausch, Wochentyp-Änderungen, nachträgliche Bearbeitung und neue Pläne sofort. Filter nach Übung und Art.

## Phase 5 – Cardio, Einstellungen, Fortschrittsfotos

- **Cardio-Eintrag** (`/cardio/neu`, auch aus „Aktivität hinzufügen“): Pflicht sind Datum, Aktivität (Laufen, Radfahren, Rudern, Crosstrainer, Gehen, Schwimmen oder Freitext), Dauer und Intensität. Optional: Ø-Puls, max. Puls, Zeit in der Zielzone, Distanz, Kalorien, Notiz. Kein festes Zeitfenster – Einträge für jeden vergangenen Tag möglich.
- **Zielzone:** Oben im Formular steht die vorgeschlagene Zone (Standard Z2) mit Pulsbereich; Z1–Z5 umschaltbar. Die Intensität wird aus der Zone vorgeschlagen (Z1–2 leicht, Z3 mittel, Z4–5 hart) und ist änderbar. Liegt der Ø-Puls in einer anderen Zone, zeigt das Formular das an.
- **HF-Zonen in den Einstellungen:** HFmax automatisch nach Tanaka aus dem Geburtsdatum oder ein eigener Wert. Die Zonengrenzen lassen sich einzeln verschieben (gespeichert als 6 Pulswerte im Profil); „Standard“ setzt sie auf 50/60/70/80/90/100 % HFmax zurück.
- **Cardio in Statistik und Verlauf:** Dauer je Woche (Balken, letzte 6 Wochen), Ø-Puls je Einheit, Verteilung nach Aktivität (Anteil der Minuten, letzte 90 Tage); Einträge erscheinen im Verlauf zwischen den Trainings und lassen sich dort öffnen, ändern und löschen.
- **Einstellungen – Aufbau:** Konto (Profil) · Personalisierung (Trainingsplan, Zyklus, Cardio, Ziele & Kalorien, Schritte, Hinweise) · Aktionen (Fortschrittsfotos) · Daten (Speicher, Backup, Löschen) · Über die App.
- **Profil:** Geschlecht, Geburtsdatum (Alter daraus), Größe, Gewicht mit Verlauf (Einträge löschbar). Kalorienbedarf wird bei jeder Änderung sofort neu berechnet und angezeigt.
- **Trainingsplan-Einstellungen:** Trainingstage, Dauer, Split, Erfahrung, Mobility, Ort/Equipment, Schwerpunkte, Schmerzen, Ausschlüsse werden zuerst nur als Entwurf geändert; „Plan neu erstellen“ übernimmt sie (ab heute, Verlauf bleibt) und protokolliert das. Grund: Ein halbfertig geänderter Plan soll nicht mitten in der Woche greifen.
- **Gewichtssprünge** je Gerätetyp (Standard 2,5 kg, Kettlebell 4 kg); verfügbare Gewichte je Übung (⚙ im Übungs-Sheet) haben Vorrang. Einheit nur **kg** (keine lbs-Umschaltung, da nicht gebraucht).
- **Schritte:** Vortags-Abfrage ein/aus, Schrittziel (Standard 8.000) als Ziellinie im Diagramm.
- **Hinweise:** Jede Hinweisart einzeln schaltbar (Zyklus, Schritte, Weigh-In, Backup, Zyklus-Info); Backup-Erinnerung nach 7 / 14 / 30 Tagen (Standard 14).
- **Alle Daten löschen:** doppelte Sicherheitsabfrage („Alle Daten löschen?“ → „Wirklich alles löschen?“ mit „Endgültig löschen“), mit dem Rat, vorher ein Backup zu machen. Danach startet die App mit dem Onboarding neu.
- **Fortschrittsfotos:** Kamera (`capture`) oder Fotomediathek. Vor dem Speichern auf max. 1600 px (JPEG 80 %) verkleinert, dazu ein Vorschaubild mit 360 px. Gespeichert als **ArrayBuffer** statt Blob, weil Safari/WebKit Blobs in IndexedDB nicht zuverlässig speichert („Error preparing Blob/File data“). Galerie nach Monat, Filter nach Ansicht, Vollbild mit Löschen, Vergleich zweier Fotos nebeneinander (Abstand in Tagen und Gewichtsdifferenz).
- **Backup-Format** (`repwise-backup`, Version 1): alle Tabellen als JSON; Binärdaten (Fotos) als Base64. Ältere Versionen werden beim Import über `migrate()` umgewandelt, neuere abgelehnt.

## Phase 6 – PWA, Backup, Veröffentlichung

- **Routing auf GitHub Pages: HashRouter** (`…/repwise/#/training`). Neu laden und direkte Links funktionieren ohne Server-Konfiguration; eine 404-Weiterleitung ist nicht nötig. Nachteil (Adressen mit `#`) spielt in einer Home-Bildschirm-App keine Rolle.
- **Basis-Pfad:** Build und Vorschau unter `/repwise/`, lokal `npm run dev` unter `/`. Der Workflow setzt `VITE_BASE` auf den Repository-Namen – ein anderer Name funktioniert also ohne Code-Änderung. Manifest-`id`, `start_url`, `scope` und der Service Worker folgen dem Basis-Pfad.
- **Icons:** eigenes Symbol (Verlaufs-„R“ mit zwei Funken auf Dunkel, wie `favicon.svg`), erzeugt mit `node scripts/app-icons.mjs`: apple-touch-icon 180 (volle Fläche, iOS rundet selbst), 192/512 (abgerundet), 512 maskable (Inhalt in der sicheren Zone), favicon 32.
- **Updates:** Service Worker im Modus „prompt“: Hinweis „Neue Version verfügbar“ mit „Neu laden“/„Später“. Geprüft wird stündlich und bei jeder Rückkehr in die App (iOS setzt Home-Bildschirm-Apps meist nur fort, statt sie neu zu laden).
- **Dauerhafter Speicher:** `navigator.storage.persist()` beim Start; Status und „Anfordern“ unter Einstellungen → Daten.
- **Datenschutz / öffentliches Repository:** GitHub Pages ist im kostenlosen Tarif nur mit öffentlichem Repository möglich. Darum liegen persönliche Daten ausschließlich in `privat/` (in `.gitignore`): `startwerte.json` und `statistik-werte.md`. Abweichend von CLAUDE.md liegt die Startwerte-Datei daher nicht in `src/data/`. Docs und Tests enthalten keine Profil- und Gesundheitsdaten mehr (Geburtsdatum, Größe, Körpergewicht, Körperfett, Schmerzen, Ernährung); Trainingswerte wie Maximalkraft gelten nicht als sensibel. Tests nutzen `src/data/startwerte.beispiel.json` (erfundenes Profil, Trainingswerte als Beispiel).
- **Startwerte in der veröffentlichten App:** Kein Build enthält persönliche Daten (auch kein lokaler Build); nur `npm run dev` lädt `privat/startwerte.json` automatisch. Auf dem iPhone werden die Startwerte einmalig im ersten Onboarding-Schritt „Daten importieren“ als Datei geladen. Derselbe Knopf stellt auch ein Backup wieder her (neues iPhone, Neuinstallation) und überspringt dann das Onboarding.
- **Erste Veröffentlichung:** Ältere Commits enthalten noch persönliche Daten. `scripts/veroeffentlichen.ps1` lädt deshalb beim ersten Mal einen einzigen Commit mit dem aktuellen Stand hoch; der alte Verlauf bleibt nur lokal im Branch `archiv/vor-veroeffentlichung`. Commits nutzen danach die anonyme GitHub-Adresse (`BENUTZER@users.noreply.github.com`) statt der privaten E-Mail. Vor jedem Hochladen prüft das Skript, dass `privat/` nicht versioniert ist und das Geburtsdatum in keiner Datei steht.
- **Anmeldung bei GitHub:** über den Git Credential Manager (in Git für Windows enthalten) im Browser – keine zusätzliche Software, kein Token von Hand.
- **Workflow** `.github/workflows/deploy.yml`: bei Push auf `main` (und von Hand) → `npm ci` → Tests → Build → GitHub Pages. Actions in den aktuellen Versionen mit Node 24 (Node 20 ist in GitHub Actions abgeschaltet).
