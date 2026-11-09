<#
.SYNOPSIS
  Prepara una nuova release: aggiorna la versione, crea commit e tag e li
  pubblica su GitHub. Il workflow .github/workflows/release.yml compila
  l'app e pubblica la release letta dall'auto-updater.

.PARAMETER Version
  Nuova versione (es. 1.1.0) oppure patch / minor / major.

.PARAMETER NoPush
  Crea commit e tag in locale senza fare push.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\release.ps1 patch
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\release.ps1 1.2.0 -NoPush
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)][string]$Version,
  [switch]$NoPush
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

function Fail($msg) { Write-Host "ERRORE: $msg" -ForegroundColor Red; exit 1 }
function Run($exe, [string[]]$argv) {
  & $exe @argv
  if ($LASTEXITCODE -ne 0) { Fail "'$exe $($argv -join ' ')' terminato con codice $LASTEXITCODE" }
}

if ((git rev-parse --abbrev-ref HEAD).Trim() -ne 'main') { Fail "Le release si fanno da 'main'." }
if (git status --porcelain) { Fail "Ci sono modifiche non committate." }

$confPath = 'src-tauri\tauri.conf.json'
$confText = Get-Content $confPath -Raw
$current = ($confText | ConvertFrom-Json).version
if ($current -notmatch '^(\d+)\.(\d+)\.(\d+)$') { Fail "Versione attuale non valida: $current" }
$maj = [int]$Matches[1]; $min = [int]$Matches[2]; $pat = [int]$Matches[3]

switch ($Version) {
  'major' { $new = "$($maj + 1).0.0" }
  'minor' { $new = "$maj.$($min + 1).0" }
  'patch' { $new = "$maj.$min.$($pat + 1)" }
  default {
    if ($Version -notmatch '^\d+\.\d+\.\d+$') { Fail "Usa X.Y.Z oppure patch/minor/major." }
    $new = $Version
  }
}
if ([version]$new -le [version]$current) { Fail "La nuova versione ($new) deve essere maggiore di $current." }
if (git tag --list "v$new") { Fail "Il tag v$new esiste già." }

Write-Host "Versione: $current -> $new" -ForegroundColor Cyan

# Sostituzioni testuali per non riformattare i file
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Set-Version($path, $pattern, $replacement) {
  $full = Join-Path $repo $path
  $text = [IO.File]::ReadAllText($full)
  $updated = [regex]::Replace($text, $pattern, $replacement, 1)
  if ($updated -eq $text) { Fail "Versione non trovata in $path" }
  [IO.File]::WriteAllText($full, $updated, $utf8)
}
Set-Version $confPath '"version":\s*"[^"]+"' "`"version`": `"$new`""
Set-Version 'package.json' '"version":\s*"[^"]+"' "`"version`": `"$new`""
Set-Version 'src-tauri\Cargo.toml' '(?m)^version\s*=\s*"[^"]+"' "version = `"$new`""

# Allinea Cargo.lock e package-lock.json
Run npm @('install', '--package-lock-only', '--no-audit', '--no-fund', '--silent')
Push-Location src-tauri
Run cargo @('update', '--workspace', '--quiet')
Pop-Location

Run git @('add', $confPath, 'package.json', 'package-lock.json', 'src-tauri\Cargo.toml', 'src-tauri\Cargo.lock')
Run git @('commit', '-m', "Release v$new")
Run git @('tag', '-a', "v$new", '-m', "v$new")

if ($NoPush) {
  Write-Host "Commit e tag v$new creati in locale. Per pubblicare: git push origin main v$new" -ForegroundColor Yellow
  exit 0
}
Run git @('push', 'origin', 'main', "v$new")
Write-Host "Pubblicato v$new. La release sarà disponibile quando il workflow 'Release' su GitHub termina." -ForegroundColor Green
