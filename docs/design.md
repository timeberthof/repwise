# Design-Tokens (abgeleitet aus den Screenshots)

**Messgrundlage:** Die Screenshots haben 1179 × 2556 px = **393 × 852 pt bei 3×** (iPhone 15/16 Pro).
Alle Maße unten sind in **pt = CSS-px**. Farben wurden **pixelgenau gemessen** (keine Schätzung).
Maße mit „≈“ sind aus Kanten-Messungen abgeleitet und werden in Phase 1 per Playwright-Überlagerung
mit dem Original feinjustiert.

Gesamteindruck: **True-Black-Dark-Mode**, flache Karten mit feinem 1-pt-Rand, viel Weißraum,
kräftige geometrische Schrift, Akzentfarbe je Bereich (Training = Orange-Verlauf, Ernährung = Grün).

---

## 1. Farben

### Neutrale Töne
| Token | Hex | Verwendung |
|---|---|---|
| `bg` | `#000000` | App-Hintergrund, Dashboard-Kopf, Onboarding |
| `surface` | `#0F0F0F` | Karten, Sheets, Kopfbereiche Training/Ernährung, Einstellungsgruppen |
| `surface-2` | `#181818` | Tab-Leiste (mit Verlauf `#1F1F1F → #121212`), Options-Karten links |
| `surface-3` | `#222222` / `#232323` | Chips (Dauer, Ort), Filter-Chips |
| `elevated` | `#272727` | Ränder, Trenner, Progress-Track, Stepper-Feld, Sekundär-Buttons, Suchfeld, leere Quadrate |
| `tile-neutral` | `#404040` | neutrale Icon-Kacheln (Profil, „+“) |
| `text` | `#F3F3F3` | Primärtext, Primär-Button-Fläche, aktive Segmente |
| `text-inverse` | `#0F0F0F` | Text auf weißen Buttons |
| `text-secondary` | `#9F9F9F` | Untertitel, Labels, inaktive Tabs/Icons, Achsen |
| `text-tertiary` | `#6F6F6F` | Schalter aus, abgedunkelte Inhalte |
| `disabled` | `#CFCFCF` | deaktivierter Primär-Button (Text etwas dunkler) |
| `white` | `#FFFFFF` | Heute-Markierung im Kalender, Sheet-Griff, Slider-Daumen |

### Akzent Training (Orange)
| Token | Hex | Verwendung |
|---|---|---|
| `orange` | `#ED774D` | Diagrammlinien, Trainings-Quadrate, Fortschritt, Statistik-Tab-Unterstrich, Push-Kachel-Icon |
| `orange-bg` | `#3B1D12` | Icon-Kachel Push |
| `amber` | `#F3AF3D` | Startfarbe des Akzent-Verlaufs |
| `grad-accent` | `linear-gradient(135deg, #F3AF3D, #ED774D)` | Auswahl-Rahmen, aktives Training-Icon, Slider-Daumen, Fortschrittsbalken (Optimierung), Workout-Fortschritt |
| `grad-accent-text` | `#E9A63A → #E68A3D` | „empfohlene“ Optionen, Übungsnamen in Listen, „EMPFOHLEN“ |
| `action` | `#FF6E40` | Text-Aktionen „Überspringen“, „Speichern“, aktive Skalen-Zahl |
| `badge-orange` | `#EC602A` | Rahmen/Text Badge „EMPFOHLEN“ |
| `hint-bg` | `#241607 → #24120A` | Hinweisbox „Satzzahl angepasst“ (Rahmen `#E58F3A`, Text `#F0943D`, Titel `#F2A23C`) |

### Akzent Ernährung (Grün)
| Token | Hex | Verwendung |
|---|---|---|
| `green` | `#5BBD52` | Haken erledigter Tage, Ernährungs-Linien, Unterstriche, Herz-Favorit, positive Δ |
| `green-icon-grad` | `#1EBF3E → #8BC54C` | aktives Ernährungs-Icon in der Tab-Leiste |
| `green-badge` | `#20C140` | Badge „ABNEHMEN“ |
| `green-flame` | `#20960E` | Ernährungs-Serie (Flamme) |
| `chip-green-bg` | `#142F13` | Icon-Kachel im „Aktiv“-Chip |

### Status & Trainingstypen
| Token | Icon | Hintergrund | Verwendung |
|---|---|---|---|
| `deload` | `#15C150` (Badge: `#5AC060`) | `#053014` | Deload, Rahmen/Haken |
| `intro` | `#FFE900` | `#403A00` | Intro |
| `normal` | `#F3F3F3` | `#3D3D3D` | Normal |
| `overreaching` | `#FFAA00` | `#402B00` | Overreaching |
| `peak` | `#FF6E40` | `#401C10` | Peak Week |
| `danger` | `#B12B22` | – | negative Δ in Statistik |
| `warning` | `#FBEA4E` | – | Warn-Dreieck bei Zielen |

### Weitere Akzente
| Token | Hex | Verwendung |
|---|---|---|
| `purple` | `#613CB0` | Schritte-Balken, Kalender-Pillen |
| `blue` | `#2020F5` (Kachel `#08083D`) | Mobility-Icon, Kalender-Pillen |
| `blue-text-grad` | `#1840B9 → #3E7592` | Mobility-Übungsnamen, „Empfohlen“ im Mobility-Filter |
| `teal-icon` | `#407B96` | Icon rechts in Mobility-Liste |

### Icon-Kacheln (Einstellungen u. a.)
Regel: **Kachel = Icon-Farbe mit 25 % Deckkraft auf Schwarz.** Gemessen:
Trainingsplan `#FF6E40/#401C10` · Cardio `#673AB7/#1A0F2E` · Nährstoffe `#8BC34A/#233113` ·
Ziele `#FFAA00/#402B00` · Benachrichtigungen `#20C040/#083010` · Sprache `#2020FF/#080840` ·
Support `#007888/#001E22` · Profil `#F3F3F3/#404040`.

### Diagramme
| Token | Hex | Verwendung |
|---|---|---|
| `chart-training` | `#ED774D` | Linie, Punktring, Wertbeschriftung |
| `chart-body` | `#5BBD52` | Körpergewicht, Körperfett |
| `chart-kcal` | `#337686` | Kalorien-Balken |
| `chart-protein` | `#D9E2BB` | Protein-Balken |
| `chart-carbs` | `#9FB65A` | Kohlenhydrat-Balken |
| `chart-fat` | `#4D5530` | Fett-Balken |
| `chart-target` | `#272727` gestrichelt | Ziellinie, Fahne `#9F9F9F` |

### Workout & Trainingsabschluss (S45–S49)
| Token | Hex | Verwendung |
|---|---|---|
| `set-done` | `#97C15C` | grüner Punkt hinter erledigtem Satz |
| `set-current` | `#272727` | Hintergrund der Zeile des aktuellen Satzes |
| `toast-bg` | `#212121` | eingeblendete Hinweis-Karte („Pause überspringen“) |
| `streak-circle` | `#8E472E` → Rand `#6C3623`, Glow `#2F170F` | Kreis hinter der Flamme |
| `flame` | `#F6C956` / `#F3B447` / Kern `#E05827` | Flammen-Symbol (eigene Zeichnung) |
| `streak-number` | `#C56340` → `#753924` (von oben nach unten) | große Streak-Zahl |
| `day-done` | `#ED774D`, Haken schwarz | erledigter Tag |
| `day-missed` | `#828282`, ✕ schwarz | verpasster Tag |
| `day-today` | Rahmen `#3B231A` | heutiger Tag |
| `day-future` | `#282828`, Haken `#1E1E1E` | kommende Tage |
| `confetti` | `#F3AE3C`, `#ED774D` | Konfetti-Partikel |
| `trophy` | `#976723` | Pokal-Symbol |
| `trophy-pill` | `#030303` | Pille hinter neuer Bestleistung |
| `chart-smooth` | Linie `#ED774D` → `#F09E3B` → `#ED774D`, Fläche `#15130F` | aufgeklappter Maximalkraft-Verlauf |

### Kopf-Verläufe Statistik
- Training: oben links `#EA744C` → Mitte `#CD6643` → `#A15134` (≈ 80 pt) → `#5C2E1D` (≈ 150 pt) → Schwarz.
- Ernährung: oben `#5BBC51` → `#479540` (≈ 80 pt) → Schwarz.
- Beim Scrollen bleibt ein Rest-Verlauf (`#29140C`) hinter der haftenden Tab-Zeile.

---

## 2. Typografie

**Schrift: Montserrat** (Google Fonts, frei lizenziert; wird lokal eingebunden → offline).
Erkennbar an „ß“, „G“, der „1“ und den breiten Rundformen. Ziffern: Standard (proportional).

Gemessene Versalhöhen → Schriftgröße (Montserrat-Versalhöhe = 0,70 em):

| Token | Größe | Gewicht | Stil | Beispiel |
|---|---|---|---|---|
| `display-xl` | ≈ 36 | 800 | – | „80,0 kg“ |
| `display` | 28 | 800 | – | „1 h 15 Min“, „22%“ |
| `number-lg` | ≈ 26 | 700 | – | „2.258“ (Tacho) |
| `screen-title` | 20 | 900 | VERSALIEN | DASHBOARD, PUSH, ÜBUNG TAUSCHEN, WELLNESS-ABFRAGE |
| `exercise-title` | 20 | 900 | VERSALIEN | BANKDRÜCKEN AN DER MULTIPRESSE (Übungs-Sheet) |
| `flow-title` | 24 | 700 | – | „Herzlichen Glückwunsch!“ |
| `tab` | ≈ 20 | 600 | – | Statistik-Tabs Training / Ernährung / Cardio |
| `card-title` | 18 | 600 | – | „Trainingsplan optimieren“, „Push“, „Kabelrudern“, Übungsnamen |
| `option-title` | 18 | 600 | – | „Rekomposition“, „6 Trainings pro Woche“ |
| `button` | 18 | 700 | – | „Weiter“, „Starten“ |
| `table` | 18 | 500 | VERSALIEN / Ziffern | SATZ · WDH · KG · RIR und Werte |
| `row-title` | 16 | 600 | – | Einstellungs-Zeilen, Info-Karten-Titel |
| `body` | 16 | 400 | – | Fließtext, Untertitel (`text-secondary`) |
| `meta` | 15 | 400 | – | „Letzte 7 Trainings“, „2 Sätze x 50 kg“, „32 Minuten“ |
| `label` | 14 | 400 | – | Muskel über Übungsnamen („Brust“), Achsen „Sep / 10“ |
| `chart-value` | 13 | 400 | – | Punktwerte im Diagramm |
| `section` | 12 | 600 | VERSALIEN, Laufweite ≈ +0,06 em | WILLKOMMEN ZURÜCK, KONTO, RÜCKEN › |
| `badge` | 12 | 600 | VERSALIEN, Laufweite +0,04 em | DELOAD, EMPFOHLEN, ABNEHMEN |
| `nav` | 11 | 600 | VERSALIEN | HOME, TRAINING … |

---

## 3. Abstände & Raster

| Token | Wert | Verwendung |
|---|---|---|
| `gutter` | **20** | Seitenrand Dashboard, Statistik, Workout, Einstellungen, Onboarding |
| `gutter-tight` | **16** | Seitenrand Training- und Ernährung-Tab, Suchfeld in Sheets |
| `gutter-sheet` | **24** | Seitenrand in Bottom-Sheets |
| `card-pad` | 16 | Innenabstand Karten |
| `gap-grid` | 8 | Abstand der Dashboard-Kacheln (2 Spalten à 172 pt) |
| `gap-list` | 16 | Abstand Übungs-/Options-Karten |
| `gap-section` | ≈ 40 | zwischen Abschnitten |
| `section-to-card` | ≈ 12 | Abschnitts-Label → Karte |
| `row-h` | 68 | Zeile in Einstellungsgruppen (Trenner eingerückt 10 pt) |
| `meal-row-h` | 72 | Mahlzeit-Zeile |
| `button-h` | **56** | Primär-/Sekundär-Buttons |
| `chip-h` | 36–40 | Chips, Segment-Schalter (36), Filter-Chips (40) |
| `search-h` | 50 | Suchfeld |
| `stepper-h` | ≈ 92 | WDH/KG/RIR-Eingabefeld |
| `today-chip` | 30 × 30 | Heute-Markierung im Kalender |
| `badge-h` | 18 | DELOAD-Badge |
| `icon-tile` | 36 (Einheiten-Karten), 28 (Einstellungen), 22 (Chips) | Icon-Kacheln |
| `square` | 10, Abstand 5 | 30-Tage-Raster (10 Spalten × 3 Zeilen) |

**Safe Areas:** Kopf beginnt unter der Statusleiste (env(safe-area-inset-top)). Primär-Buttons und
Tab-Leiste enden **direkt über** dem Home-Indikator (env(safe-area-inset-bottom) = 34 pt).

---

## 4. Radien, Ränder, Ebenen

| Token | Wert | Verwendung |
|---|---|---|
| `radius-xs` | 4 | Badges |
| `radius-sm` | 8 | Icon-Kacheln, Heute-Chip, 30-Tage-Quadrate (2) |
| `radius-md` | 12 | Chips, Segment-Schalter, Stepper-Feld |
| `radius-lg` | ≈ 16 | Options-Karten, Suchfeld, Filter-Chips |
| `radius-xl` | ≈ 20 | Inhaltskarten, Buttons, Tab-Leiste |
| `radius-sheet` | ≈ 24 | Bottom-Sheets oben, Kopfbereich unten |
| `border` | 1 pt `#272727` | Karten (Dashboard, Training, Statistik, Workout, Mahlzeiten) |
| – | kein Rand | Einstellungsgruppen, „Mesozyklus beenden“-Karte, Info-Karten im Ablauf |
| `border-selected` | 2 pt `#F3F3F3` oder 2 pt `grad-accent` | gewählte Option |
| `scrim` | Schwarz ≈ 55–60 % | hinter Sheets; ein zweites Sheet dunkelt das erste zusätzlich ab |
| `blur` | Hintergrund-Unschärfe ≈ 20 pt | Tab-Leiste und Kopf beim Scrollen (Inhalt scheint durch) |

Schatten gibt es praktisch nicht – Tiefe entsteht über Flächenhelligkeit und Ränder.
Ausnahme: gewählter Tag in der Wochenplanung leuchtet orange (Glow).

---

## 5. Komponenten

- **Kopfleiste (Tab-Seiten):** Titel `screen-title` links, Aktionen rechts (Serie mit Flamme + Zahl 20/800, Icons 24 pt). Unten 1-pt-Rand und Radius 24; Training/Ernährung mit `surface`, Dashboard mit `bg`. Beim Scrollen halbtransparent + Blur.
- **Unterseiten-Kopf:** ‹ + Titel (VERSALIEN) + rechts Icons/⋮.
- **Tab-Leiste:** schwebende Pille 333 × 70 pt, 30 pt seitlich, Radius ≈ 20, Verlauf + Blur. 4 Einträge: Icon 28 pt über Label `nav`. Aktiv: Label weiß, Icon je Bereich (Home weiß, Training Orange-Verlauf, Ernährung Grün-Verlauf, Statistik weiß). Inaktiv: `#9F9F9F`.
- **Primär-Button:** `#F3F3F3`, Text `#0F0F0F` 18/700, Höhe 56, volle Breite (Rand 20). Mit Icon rechts (▶, ›, ✓). Deaktiviert: `#CFCFCF`.
- **Sekundär-Button:** `#272727`, Text weiß, Icon rechts (+, ✕). Zwei Buttons nebeneinander mit 12 pt Abstand.
- **Karte:** `surface`, 1 pt `#272727`, Radius 20, Innenabstand 16.
- **Options-Karte (Ablauf):** Höhe ≈ 54 (mit Beschreibung höher), Radius 16, leichter Verlauf `#181818 → #0C0C0C`, Rand `#2A2A2A`. Gewählt: 2 pt Rahmen, Beschreibung klappt auf. Empfohlene Optionen: Titel im Orange-Verlauf.
- **Segment-Fortschritt (Ablauf):** 11 Segmente à ≈ 25 × 3 pt, Lücke 4: erledigt `#F3F3F3`, aktuell Verlauf weiß→grau, offen `#272727`.
- **Bottom-Sheet:** `surface`, Radius oben ≈ 24, Griff 50 × 3 pt weiß, Titel `screen-title`, Aktion oben rechts in `action`-Orange.
- **Chip:** Höhe 40, Radius 12, `surface-3`, Icon + Text 16/400. Status-Chip (Deload): 2-pt-Rahmen in Statusfarbe, Text in Statusfarbe.
- **Badge:** Höhe 18, 1-pt-Rahmen, Radius 4, Text `badge` in Rahmenfarbe.
- **Segment-Schalter:** Höhe 36, Rahmen `#272727`, aktives Segment `#F3F3F3` mit dunklem Text, inaktiv `#9F9F9F`.
- **Schieberegler:** Track 6 pt `#272727`, gefüllt weiß, Daumen 28 pt weiß; Variante mit Orange-Daumen und schraffiertem Empfehlungsbereich (Dauer, Körperfett).
- **Skala 0–10:** Striche + Ziffern 16 pt, aktiver Wert `action`-Orange.
- **Stepper:** Feld `#272727`, Radius 12, drei Spalten (Label oben 16/400 grau, „− Wert +“).
- **Wochenleiste:** Wochentage 16/400 grau, Zahlen 16/400 weiß; heute weißes 30-pt-Quadrat (Radius 8, Zahl schwarz); erledigt = grüner Kreis-Haken; darunter Pillen 14 × 5 pt je geplanter Einheit (Orange = Kraft, Violett/Blau = Mobility).
- **Liniendiagramm:** Linie 2 pt, Punkte Ring 2 pt mit Füllung `surface` (Ø 8), Wert über jedem Punkt, X-Achse zweizeilig (Monat / Tag), keine Y-Achse, kein Raster.
- **Balkendiagramm:** 7 Balken à ≈ 25 pt, Radius 6, gestrichelte Ziellinie mit Fahne rechts.
- **Geglätteter Verlauf (Trainingsabschluss):** Kurve 3 pt mit Farbverlauf Orange→Amber→Orange, zarte Fläche
  darunter, Y-Achse links (3 Werte, 13 pt grau), Datum „TT.MM“ unten, Einheit „kg“ rechts um 90° gedreht.
- **Satz-Tabelle (laufend):** erledigte Sätze weiß + grüner Punkt rechts; aktueller Satz mit `#272727`-Zeile
  (Radius 12); Stepper zeigt Vorschlag für den aktuellen Satz.
- **Timer-Button:** Primär-Button wird zum Countdown („01:59“ 18/800 links, ⏭ rechts).
  Gedrückt halten = Pause überspringen; kurzes Tippen blendet oben die Hinweis-Karte ein (`toast-bg`, Radius ≈ 24).
- **Streak-Kopf:** Kreis Ø ≈ 95 pt mit Flamme, darunter Zahl ≈ 64 pt/900 im Verlauf, Titel 24/800, Konfetti.
- **Wochenreihe (Streak):** 7 Spalten, Tag oben 16/400, darunter Quadrat 24 pt (Radius 4) je Zustand.
- **Kennzahlen-Karte:** drei Spalten, Wert 22/800, Label 16/400 darunter.
- **Maximalkraft-Karte:** Bild links, Name 20/600, „alt kg → neu kg“ 14/400 (Pfeil grau, aufgeklappt orange);
  rechts ⌄/⌃ oder Pokal-Pille.
- **Icons:** Linien-/gefüllte Icons im Stil von **Material Symbols Rounded** (frei, Apache 2.0) – z. B. ⇄ swap_horiz, Thermometer, location_on, schedule, accessibility_new, battery_charging, auto_fix_high (Zauberstab), local_fire_department.

---

## 6. Bewegung

- Tabs per Wischen wechselbar (Pager), ebenso Statistik-Unter-Tabs und Dashboard-Karussell.
- Sheets fahren von unten ein, lassen sich am Griff nach unten schließen.
- Kalender klappt beim Scrollen vom Monat zur Woche zusammen (Ernährung).
- Fortschrittsbalken „Plan wird optimiert“ laufen nacheinander voll.

---

## 7. Nicht übernehmen
MCI-Logo und -Name (z. B. „MCI entscheidet“, „ÜBER MCI“ → eigener Name), 3D-Übungsbilder,
3D-Körpermodell, Körper-Silhouetten (Muskelkater, Trainierte Muskeln), Illustrationen (Mobility-Test),
Trend-Pfeil-Grafik, Flammen-Grafik. Stattdessen eigene, schlichte
Vektor-Grafiken bzw. Platzhalter im gleichen Stil.
