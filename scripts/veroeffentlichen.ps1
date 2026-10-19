<#
  Repwise auf GitHub hochladen (erstes Mal und jedes weitere Mal).

  Vorher einmalig (siehe ANLEITUNG-IPHONE.md, Teil A):
    1. GitHub-Konto anlegen
    2. Leeres, öffentliches Repository "repwise" anlegen (ohne README)
    3. Im Repository: Settings > Pages > Source: "GitHub Actions"

  Aufruf (im Projektordner, PowerShell):
    .\scripts\veroeffentlichen.ps1 -Benutzer DEIN-GITHUB-NAME

  Beim ersten Mal öffnet sich ein Browserfenster zur GitHub-Anmeldung (Git Credential Manager).
  Danach baut GitHub die App automatisch; nach 1-2 Minuten ist sie unter
  https://DEIN-GITHUB-NAME.github.io/repwise/ erreichbar.
#>
param(
  [Parameter(Mandatory = $true)][string]$Benutzer,
  [string]$Repository = 'repwise',
  # Nur die Prüfungen ausführen, nichts hochladen
  [switch]$NurPruefen
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

function Abbruch([string]$text) {
  Write-Host ''
  Write-Host $text -ForegroundColor Red
  exit 1
}
function Schritt([string]$text) { Write-Host "-> $text" -ForegroundColor Cyan }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Abbruch 'Git ist nicht installiert.' }
if ((git branch --show-current) -ne 'main') { Abbruch 'Bitte zuerst auf den Branch "main" wechseln.' }
if (git status --porcelain) { Abbruch 'Es gibt noch nicht gespeicherte Änderungen. Bitte erst committen (git status zeigt sie).' }

# --- Schutz: keine persönlichen Daten veröffentlichen ---------------------------------------------
Schritt 'Prüfe, dass keine persönlichen Daten im Repository stehen …'
$versioniert = @(git ls-files privat src/data/startwerte.json)
if ($versioniert.Count -gt 0) { Abbruch "Persönliche Dateien sind versioniert: $($versioniert -join ', ')" }
if (Test-Path privat/startwerte.json) {
  $p = (Get-Content privat/startwerte.json -Raw -Encoding UTF8 | ConvertFrom-Json).profil
  $treffer = @(git grep -l -F $p.geburtsdatum)
  if ($treffer.Count -gt 0) { Abbruch "Dein Geburtsdatum steht in versionierten Dateien: $($treffer -join ', ')" }
}

if ($NurPruefen) {
  Write-Host 'Prüfungen bestanden – nichts hochgeladen.' -ForegroundColor Green
  exit 0
}

$url = "https://github.com/$Benutzer/$Repository.git"
$email = "$Benutzer@users.noreply.github.com"

if (@(git remote) -notcontains 'origin') {
  # --- Erste Veröffentlichung ---------------------------------------------------------------------
  # Ältere Commits enthalten noch persönliche Daten. Darum startet der öffentliche Verlauf mit einem
  # einzigen Commit mit dem heutigen Stand. Der alte Verlauf bleibt lokal im Branch
  # "archiv/vor-veroeffentlichung" erhalten (wird nie hochgeladen).
  Schritt 'Lege den öffentlichen Verlauf an (alter Verlauf bleibt lokal erhalten) …'
  if (-not (git branch --list 'archiv/vor-veroeffentlichung')) { git branch 'archiv/vor-veroeffentlichung' HEAD }
  $env:GIT_AUTHOR_NAME = $Benutzer
  $env:GIT_AUTHOR_EMAIL = $email
  $env:GIT_COMMITTER_NAME = $Benutzer
  $env:GIT_COMMITTER_EMAIL = $email
  $neu = git commit-tree 'HEAD^{tree}' -m 'Repwise – erste Veröffentlichung'
  git reset --soft $neu
  # Künftige Commits mit der privaten GitHub-Adresse statt der eigenen E-Mail
  git config user.name $Benutzer
  git config user.email $email
  git remote add origin $url
  Schritt "Lade hoch nach $url (Anmeldefenster von GitHub bestätigen) …"
  git push -u origin main
} else {
  Schritt 'Lade neue Änderungen hoch …'
  git push origin main
}
if ($LASTEXITCODE -ne 0) { Abbruch 'Hochladen fehlgeschlagen. Gibt es das Repository auf GitHub schon (leer, öffentlich)?' }

Write-Host ''
Write-Host 'Fertig hochgeladen.' -ForegroundColor Green
Write-Host "Fortschritt der Veröffentlichung: https://github.com/$Benutzer/$Repository/actions"
Write-Host "Die App (nach 1-2 Minuten):       https://$Benutzer.github.io/$Repository/" -ForegroundColor Green
Write-Host ''
Write-Host 'Falls der Lauf "Veröffentlichen" rot ist: Settings > Pages > Source auf "GitHub Actions" stellen,'
Write-Host 'dann unter Actions > Veröffentlichen > "Run workflow" erneut starten.'
