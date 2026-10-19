# Projekt: Persönliche Fitness-App (Nachbau von „MCI – Personal Training AI")

## Ziel
Baue eine Fitness-App für meinen persönlichen Gebrauch, die Aufbau, Navigation, Design, Abläufe und Funktionslogik der App „MCI – Personal Training AI" so genau wie möglich nachbildet. Grundlage sind meine Screenshots und Beschreibungen im Ordner `screenshots/`. Ich nutze die App täglich im Training auf meinem iPhone.

Zusätzlich zum Nachbau:
1. Meine aktuellen Werte aus dem Bereich „Statistik" übernehmen.
2. Automatische Anpassung des Trainings wie in MCI.
3. Übungen tauschen gegen Alternativen für dieselbe Muskelgruppe, mit oder ohne Gerät.
4. Ein vollständiges Onboarding.

## Referenzmaterial
- `screenshots/` enthält Bilder jedes Screens, nummeriert in Ablaufreihenfolge.
- Meine Beschreibungen zu jedem Screen liegen in `screenshots/beschreibungen.md` (Abschnitte mit dem Dateinamen des Bildes als Überschrift).
- Screenshots und Beschreibungen sind die verbindliche Referenz. Wenn sich Bild und Beschreibung widersprechen oder etwas unklar ist: nachfragen statt raten.
- NICHT übernehmen: MCI-Logo, Markenname, Fotos, Illustrationen und 3D-Animationen aus den Screenshots. Die App bekommt einen eigenen Namen (mach mir 3 Vorschläge) und ein eigenes Icon im ähnlichen Stil.
- Alles andere (Layout, Farben, Wirkung der Typografie, Abstände, Navigation, Abläufe, Funktionen) so nah wie möglich am Original.

## Technik
- Installierbare Web-App (PWA), optimiert für iPhone/Safari: „Zum Home-Bildschirm", Standalone-Modus, Safe Areas (Notch, Home-Indicator).
- Stack: Vite + React + TypeScript, Tailwind CSS, Dexie (IndexedDB) für Daten, vite-plugin-pwa für Offline, Recharts für Diagramme, Vitest für Tests, Playwright für visuelle Kontrolle.
- Vollständig offline nutzbar, alle Daten lokal auf dem Gerät.
- `navigator.storage.persist()` anfragen. JSON-Export/-Import als Backup in den Einstellungen, dazu eine Erinnerung an ein Backup alle 2 Wochen.
- Während eines laufenden Workouts den Bildschirm anlassen (Screen Wake Lock API, mit Fallback).
- Pausentimer mit Ton und deutlicher Anzeige (Vibration geht im iOS-Browser nicht).
- Deployment am Ende kostenlos über GitHub Pages, mit Schritt-für-Schritt-Anleitung für mich.
- Git: nach jedem abgeschlossenen Schritt committen, mit aussagekräftiger Nachricht.

## Datenmodell (mindestens)
- **Übung:** id, Name, primäre Muskelgruppe, sekundäre Muskelgruppen, Bewegungsmuster (z. B. horizontales Drücken, vertikales Ziehen, Kniebeuge, Hüftstreckung), Equipment (Langhantel, Kurzhantel, Maschine, Kabelzug, Körpergewicht, Widerstandsband, Kettlebell …), Schwierigkeit, Gewichtsschritte, Ausführungshinweise (eigene Texte).
- **Plan / Trainingstag / geplante Übung:** Sätze, Wiederholungsbereich, Ziel-RIR, Pausenzeit, Reihenfolge.
- **Trainingseinheit / Satz:** Datum, Übung, Gewicht, Wiederholungen, RIR (optional), erledigt ja/nein, Notiz.
- **Körper- und Statistikwerte** mit Datum (Verlauf).
- **Erholungs-Check-in:** Schlaf, Energie, Muskelkater je Muskelgruppe.
- **Anpassungsprotokoll:** jede automatische Änderung mit Grund.

## Übungsbibliothek
- Mindestens 120 Übungen für alle großen Muskelgruppen: Brust, Rücken, Schultern, Bizeps, Trizeps, Unterarme, Bauch, Quadrizeps, Beinbeuger, Gesäß, Waden.
- Pro Muskelgruppe mehrere Varianten je Equipment-Typ und mindestens 2 Übungen ohne Gerät (Körpergewicht oder Band).
- Alle Übungen, die in meinen Screenshots vorkommen, müssen enthalten sein.
- Pflege die Bibliothek in `src/data/uebungen.json`, damit ich später selbst ergänzen kann.

## Statistik-Werte übernehmen
- Lies alle Werte aus den Statistik-Screenshots aus: Körperdaten, Gewichte und Wiederholungen je Übung, Bestleistungen, Anzahl Trainings, Serien, Level/Punkte usw.
- Zeig mir zuerst eine Tabelle aller ausgelesenen Werte zur Bestätigung, da beim Ablesen aus Bildern Fehler passieren können. Erst danach in `src/data/startwerte.json` übernehmen.
- Diese Werte sind der Ausgangspunkt für Verlauf, Diagramme und die automatische Anpassung.

## Automatische Anpassung
Die genaue Logik von MCI ist nicht bekannt. Bilde alles nach, was Screenshots und Beschreibungen zeigen, und ergänze ein transparentes Regelsystem:
- **Doppelte Progression:** Jede Übung hat einen Wiederholungsbereich. Schaffe ich in allen Sätzen das obere Ende beim Ziel-RIR, steigt das Gewicht beim nächsten Mal um den kleinsten sinnvollen Schritt (Langhantel 2,5 kg, Kurzhantel und Maschine nächste verfügbare Stufe, Körpergewicht mehr Wiederholungen oder schwerere Variante). Liege ich unter dem unteren Ende, bleibt das Gewicht oder sinkt um 5–10 %.
- **Erholung:** Vor dem Training ein kurzer Check-in (max. 3 Fragen, überspringbar). Bei schlechter Erholung oder starkem Muskelkater der Zielmuskeln Volumen oder Intensität für diese Einheit senken, nie steigern.
- **Stagnation:** Nach 3 Einheiten ohne Fortschritt bei einer Übung das Gewicht kurz reduzieren oder eine Variante vorschlagen.
- **Periodisierung:** Mesozyklen von 4–6 Wochen mit leicht steigendem Volumen, danach eine Deload-Woche mit deutlich reduziertem Volumen.
- **Trainingspausen:** Nach längerer Pause automatisch mit reduzierten Gewichten wieder einsteigen.
- Jede Anpassung wird im Training sichtbar angezeigt, mit kurzem Grund (z. B. „+2,5 kg, weil du alle Sätze mit 12 Wdh. geschafft hast"). Ich kann jede Anpassung überschreiben.
- Alle Regeln und Schwellenwerte zentral in `src/logic/progression.ts`, konfigurierbar und mit Unit-Tests abgedeckt.

## Übung tauschen
- In der Planansicht und während des Trainings bei jeder Übung ein Button „Übung tauschen".
- Zeigt Alternativen mit derselben primären Muskelgruppe, sortiert nach Ähnlichkeit (gleiches Bewegungsmuster zuerst).
- Filter: „Alle", „Mit Gerät", „Ohne Gerät". Standardmäßig nur Equipment, das ich im Onboarding als verfügbar angegeben habe.
- Auswahl: „Nur heute" oder „Dauerhaft im Plan ersetzen".
- Startgewicht der neuen Übung: aus meinem Verlauf, falls vorhanden. Sonst eine vorsichtige Schätzung aus einer verwandten Übung, als „Schätzung" markiert; die ersten Sätze dienen zur Kalibrierung.
- Jede Übung behält ihren eigenen Verlauf, ein Tausch löscht nichts.

## Onboarding
Wenn die Screenshots ein Onboarding zeigen, dieses nachbauen und um fehlende Punkte ergänzen. Sonst im Stil der App:
1. Begrüßung
2. Ziel (z. B. Muskelaufbau, Kraft, Fettabbau, allgemeine Fitness, Hybrid)
3. Erfahrung (Anfänger, Fortgeschritten, Profi)
4. Trainingstage pro Woche und Dauer pro Einheit
5. Trainingsort und verfügbares Equipment (Studio, Zuhause mit Auswahl, ohne Geräte)
6. Körperdaten, vorausgefüllt mit den Statistik-Werten
7. Schwerpunkte / Problemzonen (Muskelgruppen priorisieren)
8. Übungen ausschließen, die ich nicht machen will oder kann
9. Startwerte bestätigen (aus der Statistik übernommen), fehlende optional per Kalibrierungstraining ermitteln
10. Zusammenfassung des erstellten Plans, dann Start

- Fortschrittsanzeige und Zurück-Button; jeder Schritt ist später in Profil/Einstellungen änderbar.
- Der Trainingsplan wird aus den Antworten erzeugt: Split passend zu den Trainingstagen, Volumen passend zur Erfahrung.

## Vorgehen in Phasen
Arbeite in dieser Reihenfolge und warte nach Phase 0 auf meine Bestätigung.

**Phase 0 – Analyse (noch kein Code)**
- Alle Screenshots und Beschreibungen lesen.
- `docs/screens.md` anlegen: jeder Screen mit Zweck, Elementen und Navigation (woher, wohin).
- Design-Tokens ableiten (Farben, Schriftgrößen, Abstände, Radien) und in `docs/design.md` festhalten.
- Tabelle der Statistik-Werte zur Bestätigung.
- Liste offener Fragen.

**Phase 1** – Projekt aufsetzen, Design-System, Navigation, Datenmodell, Übungsbibliothek.
**Phase 2** – Onboarding und Planerstellung.
**Phase 3** – Training durchführen: Workout-Screen, Satz-Logging, Pausentimer, Übung tauschen.
**Phase 4** – Automatische Anpassung, Statistik und Fortschritt mit den Startwerten.
**Phase 5** – Alle weiteren Bereiche aus den Screenshots (z. B. Cardio, Ernährung, Beweglichkeit, Gamification, Profil). Barcode-Scanner nur, falls im Original vorhanden, dann über Open Food Facts.
**Phase 6** – PWA- und Offline-Feinschliff, Backup, Deployment und Installationsanleitung fürs iPhone.

Nach jedem Screen bzw. jeder Phase:
- App starten und mit Playwright in iPhone-Größe (393 × 852) Screenshots erstellen.
- Mit dem Original vergleichen, Abweichungen auflisten und beheben.
- Tests laufen lassen, committen, Stand in `docs/fortschritt.md` festhalten.

## Arbeitsregeln
- Kommuniziere auf Deutsch.
- Erfinde keine Funktionen, die weder im Original noch in diesem Dokument stehen; schlag sie höchstens vor.
- Bei Unklarheiten kurz nachfragen statt raten.
- Code sauber in Komponenten aufteilen, keine riesigen Einzeldateien.
