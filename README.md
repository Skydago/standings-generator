# VGC Standings Generator

App desktop (Tauri 2) per creare grafiche delle classifiche finali di tornei **Pokémon VGC**, con team, oggetti, bandiere e Championship Points, esportabili in PNG pronte da pubblicare.

## Funzionalità

- **Tipi di torneo**
  - *Custom* – CP inseriti manualmente per ogni giocatore
  - *Friendly* – nessun CP mostrato
  - *League Challenge* / *League Cup* – CP calcolati automaticamente secondo le tabelle Play! Pokémon (stagione VGC 2026), con soglie minime di partecipanti (kicker)
- **Top cut automatico**: opzione per mostrare solo i giocatori che guadagnano CP, in base al numero di partecipanti
- **Giocatori**: nome, paese (codice ISO a 2 lettere → bandiera), record vittorie/sconfitte, team di 6 Pokémon con oggetto
- **Autocompletamento** di Pokémon (da PokéAPI) e oggetti
- **Import team** da link [Pokepaste](https://pokepast.es) o testo in formato Showdown
- **Import TDF** esportato da TOM (Tournament Operations Manager): nomi, record e paese del torneo
- **Esportazione PNG** con anteprima (via html2canvas)
- **Salvataggio/caricamento JSON** dello stato e salvataggio automatico in locale

## Requisiti

- [Node.js](https://nodejs.org/) (per la CLI di Tauri)
- [Rust](https://www.rust-lang.org/tools/install) (toolchain stabile, ≥ 1.77.2)
- Prerequisiti Tauri per il proprio sistema operativo: <https://tauri.app/start/prerequisites/>
- Connessione internet a runtime (sprite, bandiere e icone oggetti sono caricati da CDN esterne)

## Avvio

```bash
npm install
npx tauri dev
```

In alternativa, essendo il frontend statico, si può aprire direttamente `dist/index.html` in un browser.

## Build

```bash
npx tauri build
```

Gli installer Windows (MSI e NSIS) vengono generati in `src-tauri/target/release/bundle/`.

`bundle.createUpdaterArtifacts` è attivo, quindi `npx tauri build` firma gli artefatti dell'updater e richiede la variabile `TAURI_SIGNING_PRIVATE_KEY` (vedi sotto); con una chiave senza password impostare anche `CI=true` per evitare il prompt. Per una build locale senza firma: `npx tauri build -c '{"bundle":{"createUpdaterArtifacts":false}}'` (è quello che fa `scripts/update.ps1`).

## Aggiornamenti

### Script locale

Aggiorna l'app su questo PC partendo dal codice su GitHub: `git pull` di `main`, `npm ci` se serve, build NSIS e installazione.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\update.ps1          # solo se ci sono nuovi commit
powershell -ExecutionPolicy Bypass -File scripts\update.ps1 -Force   # ricompila comunque
```

Opzioni: `-Silent` (installazione senza procedura guidata), `-NoInstall` (solo build), `-Branch <nome>`.

### Auto-updater nell'app

All'avvio l'app controlla `latest.json` dell'ultima GitHub Release (plugin `tauri-plugin-updater`). Se c'è una versione più recente mostra un avviso in basso a destra con **Aggiorna e riavvia**.

Per pubblicare una nuova versione:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\release.ps1 patch   # oppure minor, major, o 1.2.0
```

Lo script aggiorna la versione in `tauri.conf.json`, `package.json` e `Cargo.toml`, crea commit e tag `vX.Y.Z` e fa push. Il workflow `.github/workflows/release.yml` compila l'app e pubblica la release con installer firmati e `latest.json`.

Configurazione una tantum:

- **Chiave di firma**: generata con `npx tauri signer generate -w ~/.tauri/vgc-standings.key`. La chiave pubblica è in `plugins.updater.pubkey` di `tauri.conf.json`; la privata **non va committata**. Se la perdi, le installazioni esistenti non potranno più aggiornarsi.
- **Secret GitHub**: `TAURI_SIGNING_PRIVATE_KEY` con il contenuto della chiave privata (e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` se ha una password).
- **Repository privato**: l'updater scarica `latest.json` e l'installer senza autenticazione, quindi funziona solo se le release sono pubbliche (repository pubblico, oppure release pubblicate su un repository pubblico separato cambiando `endpoints`).

## Struttura

```
dist/            Frontend statico (HTML, CSS, JS vanilla)
  index.html
  app.js
  styles.css
src-tauri/       Shell desktop Tauri (Rust)
  tauri.conf.json
  src/
  icons/
scripts/         update.ps1 (aggiornamento locale), release.ps1 (nuova release)
.github/         Workflow di release
```

## Crediti

- Sprite Pokémon: [PokéAPI/sprites](https://github.com/PokeAPI/sprites)
- Icone oggetti: [Serebii](https://www.serebii.net) e [msikma/pokesprite](https://github.com/msikma/pokesprite)
- Bandiere: [flagcdn](https://flagcdn.com)

Pokémon e i relativi nomi sono marchi di Nintendo, Game Freak e The Pokémon Company. Progetto amatoriale non affiliato.
