# Repwise aufs iPhone bringen

Repwise ist eine Web-App (PWA): Sie liegt kostenlos auf GitHub Pages, wird in Safari einmal
„Zum Home-Bildschirm“ hinzugefügt und läuft danach wie eine App – auch ohne Internet.
Alle Daten bleiben auf dem iPhone.

---

## Teil A – Einmalig veröffentlichen (am Windows-PC, ca. 10 Minuten)

### 1. GitHub-Konto anlegen
1. <https://github.com/signup> öffnen und ein kostenloses Konto anlegen.
2. Den **Benutzernamen** merken – er wird Teil der Adresse: `https://BENUTZERNAME.github.io/repwise/`.

### 2. Leeres Repository anlegen
1. Auf GitHub oben rechts **+** → **New repository**.
2. **Repository name:** `repwise`
3. **Public** auswählen (GitHub Pages ist für private Repositories kostenpflichtig).
   Es landen keine persönlichen Daten darin – siehe „Datenschutz“ unten.
4. Nichts ankreuzen (kein README, keine .gitignore, keine Lizenz) → **Create repository**.

### 3. GitHub Pages einschalten
1. Im neuen Repository: **Settings** → links **Pages**.
2. Unter **Build and deployment** → **Source**: **GitHub Actions** auswählen.

### 4. Hochladen
1. Den Projektordner `D:\Projekte\fittness` im Explorer öffnen.
2. In die Adresszeile `powershell` tippen und Enter drücken – es öffnet sich PowerShell im Ordner.
3. Diesen Befehl eingeben (BENUTZERNAME ersetzen):
   ```
   powershell -ExecutionPolicy Bypass -File .\scripts\veroeffentlichen.ps1 -Benutzer BENUTZERNAME
   ```
4. Beim ersten Mal öffnet sich ein Fenster **„Connect to GitHub“** → **Sign in with your browser** →
   im Browser anmelden und bestätigen. Das Passwort gibst Du nur bei GitHub selbst ein.
5. Das Skript
   - prüft, dass keine persönlichen Daten im Repository stehen,
   - legt beim ersten Mal einen frischen Verlauf ohne alte Stände an (der alte Verlauf bleibt nur
     lokal im Branch `archiv/vor-veroeffentlichung`),
   - lädt alles hoch.

### 5. Warten, bis die App online ist
1. Auf GitHub im Repository auf **Actions** gehen: Der Lauf **„Veröffentlichen“** dauert 1–2 Minuten.
2. Grüner Haken = fertig. Die App ist jetzt unter `https://BENUTZERNAME.github.io/repwise/` erreichbar.
3. Roter Haken? Meist war Schritt 3 noch nicht erledigt: Pages auf **GitHub Actions** stellen, dann
   **Actions** → **Veröffentlichen** → **Run workflow**.

---

## Teil B – Auf dem iPhone installieren

### 1. Startwerte aufs iPhone legen (einmalig)
Deine Startwerte aus MCI (Profil, Gewichtsverlauf, Maximalkraft je Übung) sind aus Datenschutzgründen
**nicht** in der veröffentlichten App. Du lädst sie einmal als Datei:

- Die Datei `D:\Projekte\fittness\privat\startwerte.json` nach
  **iCloud Drive** kopieren (z. B. in `C:\Users\timeb\iCloudDrive\fitness-app\`) –
  oder per AirDrop/Mail aufs iPhone schicken und in **Dateien** sichern.

### 2. Zum Home-Bildschirm hinzufügen
1. **Safari** öffnen (nicht Chrome) und `https://BENUTZERNAME.github.io/repwise/` aufrufen.
2. Unten auf **Teilen** tippen (Quadrat mit Pfeil nach oben).
3. Nach unten scrollen → **Zum Home-Bildschirm** → Name „Repwise“ lassen → **Hinzufügen**.
4. Den Safari-Tab schließen.

### 3. Immer über das Symbol starten
Nur die App auf dem Home-Bildschirm hat ihren eigenen, dauerhaften Speicher.
In einem normalen Safari-Tab siehst Du andere (leere) Daten.

### 4. Erster Start
1. Repwise über das Symbol öffnen.
2. Im ersten Schritt **„Daten importieren“** tippen → **Durchsuchen** → `startwerte.json` auswählen.
   Die Meldung „Startwerte geladen“ erscheint, Deine Angaben sind vorausgefüllt.
3. Mit **Weiter** durch die Schritte gehen, Angaben prüfen, am Ende **„Los geht's“**.
4. Einmal **Einstellungen → Daten** öffnen: Steht bei „Dauerhafter Speicher“ nicht „Aktiv“, auf
   **Anfordern** tippen.

---

## Teil C – Backup

**Backup erstellen** (Repwise erinnert alle 14 Tage daran, einstellbar unter Einstellungen → Hinweise):
1. Einstellungen → **Daten** → **Backup erstellen**.
2. **Teilen / In Dateien sichern** → **In Dateien sichern** → z. B. iCloud Drive → **Sichern**.
   Die Datei heißt `repwise-backup-JJJJ-MM-TT.json` und enthält alles, auch die Fortschrittsfotos.

**Backup wiederherstellen:**
1. Einstellungen → **Daten** → **Backup importieren** → Datei auswählen.
2. Vorschau prüfen (Anzahl Trainings, Fotos …) → **Importieren** → **Ersetzen**.
   Achtung: Die Daten auf dem iPhone werden durch das Backup ersetzt.
3. Neues iPhone oder App neu installiert? Dann direkt im ersten Onboarding-Schritt
   **„Daten importieren“** und das Backup wählen – das Onboarding entfällt.

**Wichtig:** Wenn Du das Repwise-Symbol vom Home-Bildschirm löschst, löscht iOS auch alle Daten
der App. Vorher immer ein Backup machen.

---

## Teil D – Updates

**Am PC** (nachdem etwas geändert wurde):
```
powershell -ExecutionPolicy Bypass -File .\scripts\veroeffentlichen.ps1 -Benutzer BENUTZERNAME
```
GitHub baut die App neu (1–2 Minuten, siehe **Actions**).

**Auf dem iPhone:** Repwise öffnen. Oben erscheint **„Neue Version verfügbar“** → **Neu laden**.
Deine Daten bleiben erhalten. Erscheint nichts: App ganz schließen (vom unteren Rand nach oben
wischen und Repwise wegschieben) und neu öffnen.

---

## Gut zu wissen

- **Offline:** Nach dem ersten Öffnen funktioniert Repwise komplett ohne Internet.
- **Pausentimer:** Ton am Ende der Pause – dafür muss der Stummschalter aus sein. Vibration ist in
  Web-Apps auf dem iPhone nicht möglich.
- **Bildschirm:** Während eines Trainings bleibt der Bildschirm an.
- **Datenschutz:** Das Repository auf GitHub ist öffentlich, enthält aber keine persönlichen Daten.
  Startwerte und ausgelesene Statistik liegen nur lokal im Ordner `privat/` (steht in `.gitignore`).
  Die veröffentlichte App enthält keine persönlichen Daten; alles, was Du einträgst, bleibt auf dem iPhone.
