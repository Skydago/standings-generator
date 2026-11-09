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
```

## Crediti

- Sprite Pokémon: [PokéAPI/sprites](https://github.com/PokeAPI/sprites)
- Icone oggetti: [Serebii](https://www.serebii.net) e [msikma/pokesprite](https://github.com/msikma/pokesprite)
- Bandiere: [flagcdn](https://flagcdn.com)

Pokémon e i relativi nomi sono marchi di Nintendo, Game Freak e The Pokémon Company. Progetto amatoriale non affiliato.
