# Repwise

Persönliche Krafttraining-App fürs iPhone: Trainingsplan mit 6-Wochen-Mesozyklen, automatischer
Anpassung (doppelte Progression, Erholung, Stagnation, Deload), Übungstausch, Statistik, Cardio und
Fortschrittsfotos. Installierbare Web-App (PWA), komplett offline, alle Daten nur lokal auf dem Gerät.

- **Installation aufs iPhone, Backup, Updates:** [ANLEITUNG-IPHONE.md](ANLEITUNG-IPHONE.md)
- **Entscheidungen und Regeln:** [DECISIONS.md](DECISIONS.md), Progressionsregeln in `src/logic/progression.ts`
- **Übungsbibliothek:** `src/data/uebungen.json`

## Entwicklung

```
npm install
npm run dev        # http://localhost:5173
npm test           # Unit-Tests (Vitest)
npm run build      # Produktions-Build nach dist/ (Basis-Pfad /repwise/)
npx playwright test -c playwright.prod.config.ts   # Offline- und Backup-Test gegen den Build
```

Vite · React · TypeScript · Tailwind CSS · Dexie (IndexedDB) · vite-plugin-pwa · Recharts · Vitest · Playwright.
Schrift Montserrat (OFL), Symbole Material Symbols (Apache 2.0).
