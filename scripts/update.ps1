<#
.SYNOPSIS
  Aggiorna VGC Standings Generator dal repository: scarica le ultime modifiche
  di main, ricompila l'app e installa la nuova versione.

.DESCRIPTION
  1. git fetch + controllo se main locale è indietro rispetto a origin/main
  2. git pull --ff-only (rifiuta se ci sono modifiche locali non salvate)
  3. npm ci (solo se package-lock.json è cambiato o node_modules manca)
  4. npx tauri build
  5. avvia l'installer NSIS generato (silenzioso con -Silent)

.PARAMETER Force
  Ricompila e reinstalla anche se non ci sono nuovi commit.

.PARAMETER NoInstall
  Compila soltanto, senza lanciare l'installer.

.PARAMETER Silent
  Installa senza mostrare la procedura guidata (/S).

.PARAMETER Branch
  Branch da cui aggiornare (default: main).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\update.ps1
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\update.ps1 -Force -Silent
#>
[CmdletBinding()]
param(
  [switch]$Force,
  [switch]$NoInstall,
  [switch]$Silent,
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

function Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "ERRORE: $msg" -ForegroundColor Red; exit 1 }
function Run($exe, [string[]]$argv) {
  & $exe @argv
  if ($LASTEXITCODE -ne 0) { Fail "'$exe $($argv -join ' ')' terminato con codice $LASTEXITCODE" }
}

foreach ($tool in 'git', 'npm', 'npx', 'cargo') {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Fail "'$tool' non trovato nel PATH." }
}

# --- 1. Controllo aggiornamenti -------------------------------------------
$current = (git rev-parse --abbrev-ref HEAD).Trim()
if ($current -ne $Branch) {
  Fail "Sei sul branch '$current'. Passa a '$Branch' (git switch $Branch) e rilancia lo script."
}
if (git status --porcelain --untracked-files=no) {
  Fail "Ci sono modifiche locali non committate. Salvale o annullale prima di aggiornare."
}

Step "Controllo aggiornamenti su origin/$Branch"
Run git @('fetch', '--quiet', 'origin', $Branch)
$behind = [int](git rev-list --count "HEAD..origin/$Branch").Trim()
$oldLock = (git rev-parse "HEAD:package-lock.json" 2>$null)

if ($behind -eq 0 -and -not $Force) {
  Write-Host "Già aggiornato: nessun nuovo commit su origin/$Branch. Usa -Force per ricompilare comunque." -ForegroundColor Green
  exit 0
}

# --- 2. Pull ---------------------------------------------------------------
if ($behind -gt 0) {
  Step "Scarico $behind nuovi commit"
  git log --oneline "HEAD..origin/$Branch"
  Run git @('pull', '--ff-only', '--quiet', 'origin', $Branch)
}

# --- 3. Dipendenze ---------------------------------------------------------
$newLock = (git rev-parse "HEAD:package-lock.json" 2>$null)
if (-not (Test-Path node_modules) -or $oldLock -ne $newLock) {
  Step "Installo le dipendenze npm"
  Run npm @('ci', '--no-audit', '--no-fund')
}

# --- 4. Build --------------------------------------------------------------
$conf = Get-Content src-tauri\tauri.conf.json -Raw | ConvertFrom-Json
$version = $conf.version
Step "Compilo $($conf.productName) v$version (può richiedere qualche minuto)"
$buildArgs = @('tauri', 'build', '--bundles', 'nsis')
# Gli artefatti firmati dell'updater servono solo alle release su GitHub
# (workflow release.yml): in locale li disattivo, così non serve la chiave.
$override = Join-Path $env:TEMP 'vgc-no-updater-artifacts.json'
'{"bundle":{"createUpdaterArtifacts":false}}' | Set-Content -Path $override -Encoding ascii
$buildArgs += @('--config', $override)
Run npx $buildArgs

$installer = Get-ChildItem src-tauri\target\release\bundle\nsis\*_${version}_*-setup.exe |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $installer) { Fail "Installer NSIS per la versione $version non trovato." }
Write-Host "Installer: $($installer.FullName)" -ForegroundColor Green

# --- 5. Installazione ------------------------------------------------------
if ($NoInstall) { exit 0 }

$running = Get-Process -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -and $_.Path -like '*VGC Standings Generator*' }
if ($running) {
  Write-Host "Chiudo l'app in esecuzione..." -ForegroundColor Yellow
  $running | Stop-Process -Force
  Start-Sleep -Seconds 1
}

Step "Installo la nuova versione"
$installArgs = @()
if ($Silent) { $installArgs += '/S' }
$p = Start-Process -FilePath $installer.FullName -ArgumentList $installArgs -Wait -PassThru
if ($p.ExitCode -ne 0) { Fail "Installer terminato con codice $($p.ExitCode)" }
Write-Host "Aggiornamento completato: v$version installata." -ForegroundColor Green
