# Repwise

Persönliches Trainingstagebuch fürs iPhone: Training aus eigenen Vorlagen selbst erfassen (kg, Wdh., RIR optional),
Verlauf und Maximalkraft je Übung, wöchentlicher Check-in mit Körpergewicht und Fortschrittsfoto, Cardio.
Die App gibt nichts vor. Installierbare Web-App (PWA), komplett offline, alle Daten nur lokal auf dem Gerät.

- **Installation aufs iPhone, Backup, Updates:** [ANLEITUNG-IPHONE.md](ANLEITUNG-IPHONE.md)
- **Entscheidungen und Regeln:** [DECISIONS.md](DECISIONS.md)
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
