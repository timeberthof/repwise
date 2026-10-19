# Offene Fragen (Phase 0)

> **Alle Fragen sind beantwortet (18.10.2026).** Antworten und daraus folgende Entscheidungen stehen
> in [`DECISIONS.md`](../DECISIONS.md). Diese Datei bleibt als Protokoll unverändert.

## A. Wichtig – davon hängt der Bau direkt ab

1. ~~Fehlende Screens~~ – **beantwortet (18.10.):** Pausentimer und Trainingsabschluss nachgeliefert
   (S45–S49), weitere gibt es nicht. Was noch fehlt (Satz abschließen, nächste Übung, Statistik-Detail,
   Schritt 4 der Zyklusplanung, Dashboard unten), gestalte ich im Stil der App. Annahme für den Ablauf:
   Der weiße Button heißt während eines Satzes „Satz abschließen ✓“, Tippen speichert den Satz und
   startet den Pausentimer im selben Button (wie S45); nach dem letzten Satz geht es zur nächsten Übung,
   nach der letzten Übung zum Abschluss (S46).

2. ~~Bedeutung der Statistik-Zahlen~~ – **geklärt durch S47:** „Maximalkraft“ (geschätztes
   1-Wiederholungs-Maximum), passt zu Gewicht × (1 + (Wdh + RIR) / 30). Details in `privat/statistik-werte.md`.

3. **Fehlende Körperdaten:** Größe, Alter, Geschlecht (für Kalorienbedarf und Onboarding-Vorbelegung).

4. **Kalorienziel:** Übersicht zeigt **2.258 kcal**, das Lebensmittel-Fenster „0 / **2241** kcal“. Welcher Wert gilt?

5. **Werkzeuge & Projektort:**
   - Auf dem Rechner sind **weder Git noch Node.js installiert**. Beides wird ab Phase 1 gebraucht.
     Ich kann sie per `winget` installieren (du bestätigst die Installation).
   - Das Projekt liegt in **iCloud Drive**. Der Ordner `node_modules` (zehntausende Dateien) und `.git`
     vertragen sich schlecht mit der iCloud-Synchronisierung (Konflikte, ausgelagerte Dateien).
     Vorschlag: Code nach z. B. `C:\Users\timeb\Projekte\fitness-app` verschieben, Sicherung über GitHub
     (brauchen wir ohnehin für GitHub Pages). Einverstanden?

6. **App-Name** – bitte einen wählen:
   - **ADAPT** – „Adaptives Personal Training“. Icon: schwarze Kachel, ein „A“ aus einem ansteigenden Pfeil im Orange-Verlauf.
   - **FORGE** – „Kraft wird geschmiedet“. Icon: stilisierte Hantelscheibe mit Funken im Orange-Verlauf.
   - **REPWISE** – „Jede Wiederholung zählt“. Icon: kräftiges „R“ mit Zauberstab-Funke (wie „Empfohlen“).

## B. Funktionen, die in einer Web-App auf dem iPhone nicht (gleich) gehen

7. **Apple Health / Schritte:** Web-Apps haben keinen Zugriff auf Apple Health.
   Vorschlag: Schritte-Kachel mit manueller Eingabe; Menüpunkt „Apple Health“ entfällt.
8. **Benachrichtigungen:** Erinnerungen ohne Server gehen nur, solange die App offen ist.
   Vorschlag: Hinweise in der App (z. B. Backup-Erinnerung, Weigh-In) statt Push-Nachrichten.
9. **Kamera- und Mikrofon-Button bei Ernährung:** Barcode-Scan geht (Open Food Facts, braucht Internet).
   Foto-Erkennung von Mahlzeiten und Spracheingabe bräuchten einen kostenpflichtigen KI-Dienst.
   Vorschlag: Kamera-Button = Barcode-Scanner, Mikrofon-Button weglassen.

## C. Umfang

10. **Cardio:** Es gibt „Statistik › Cardio“ und „Cardio-Trainingsplan“, aber keine Screenshots.
    Nachbauen (dann bitte Screenshots) oder weglassen?
11. **Ernährung komplett nachbauen?** (Tagesübersicht, Mahlzeiten, Lebensmittel-Suche, Favoriten,
    Rezepte, Gewicht, Nährstoffe) – das ist ein großer Teil. Sollen die Lebensmittel aus deinen
    Listen (statistik-werte.md, Abschnitt 7) als Startbestand übernommen werden?
12. **Fortschrittsfotos** (Einstellungen › Aktionen): lokal auf dem Gerät speichern – gewünscht?

## D. Kleinere Punkte – so würde ich entscheiden, falls du nichts anderes sagst

13. **Unbekannte Knöpfe** (Funktion nicht erkennbar): Thermometer im Workout-Kopf, Chip „Aktiv ⌄“,
    „•••“ neben dem Datum, ⋮ an Einheiten-Karten, ⚙ im Übungs-Sheet, „Aktivität hinzufügen“,
    „Gespeicherte Trainings“, Icon „Person mit Zahnrädern“ in der Mobility-Liste.
    → Wenn du weißt, was sie tun: kurz sagen. Sonst lasse ich sie weg statt etwas zu erfinden.
14. **Trainingstypen-Rotation** im 6-Wochen-Zyklus: Intro → Normal → Normal → Overreaching → Peak Week → Deload.
    (Die genaue MCI-Reihenfolge ist nicht bekannt.)
15. **Auswahl-Rahmen:** Mal weiß (Split, Ziel), mal Orange-Verlauf (Trainings/Woche, Wiederholungen).
    Regel: Orange-Verlauf, wenn die gewählte Option eine empfohlene ist, sonst weiß.
16. **Muskelgruppen:** Ich übernehme die feinere Einteilung der App (vordere/mittlere/hintere Schulter,
    Nacken, Adduktoren, Hüfte, Sprunggelenk, Füße …) und ordne sie den Gruppen aus CLAUDE.md zu.
17. **Abgeschnittener Name:** „Kurzhantel-Kreuzheben …“ – vollständiger Name? (Vermutung: „Kurzhantel-Kreuzheben mit gestreckten Beinen“.)
18. **Pre-Workout-Check-in:** Original fragt Wellness + Muskelkater. CLAUDE.md verlangt auch Schlaf →
    ich ergänze als dritte Frage „Wie hast Du letzte Nacht geschlafen?“ im gleichen Regler-Stil.
19. **Quellen-Hinweis:** Es gibt keine `screenshots/beschreibungen.md`; ich habe die Dateinamen als
    Beschreibungen verwendet. Der Ordner heißt `Screenshots_` (nicht `screenshots/`).
