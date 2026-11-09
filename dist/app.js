'use strict';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
const FLAG_BASE = 'https://flagcdn.com/w40/';
const ITEM_SOURCES = [
  // Primary: Serebii SV folder (best coverage for Gen 9 items)
  name => `https://images.weserv.nl/?url=www.serebii.net/itemdex/sprites/sv/${name.replace(/[^a-z0-9]+/g,'')}.png`,
  // Fallback 1: Serebii root (older items: memories, drives, classic items, kings-rock)
  name => `https://images.weserv.nl/?url=www.serebii.net/itemdex/sprites/${name.replace(/[^a-z0-9]+/g,'')}.png`,
  // Fallback 2: pokesprite hold-item (Gen 8 items missing from Serebii like heavy-duty-boots)
  name => `https://raw.githubusercontent.com/msikma/pokesprite/master/items/hold-item/${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}.png`,
  // Fallback 3: pokesprite berry folder (berries are stored without -berry suffix)
  name => {
    const k = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').replace(/-berry$/,'');
    return `https://raw.githubusercontent.com/msikma/pokesprite/master/items/berry/${k}.png`;
  },
];
const POKEAPI_LIST = 'https://pokeapi.co/api/v2/pokemon?limit=2000';
const STORAGE_KEY = 'pokemon-index-v2';
const STATE_KEY = 'standings-state-v1';

/* Tournament country -> ISO-2 code (used as player default on TDF import) */
const COUNTRY_TO_ISO = {
  'italy': 'IT', 'italia': 'IT',
  'spain': 'ES', 'españa': 'ES',
  'france': 'FR', 'germany': 'DE', 'deutschland': 'DE',
  'united states': 'US', 'usa': 'US', 'u.s.a.': 'US', 'united states of america': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB',
  'japan': 'JP', 'south korea': 'KR', 'korea': 'KR',
  'mexico': 'MX', 'brazil': 'BR', 'argentina': 'AR',
  'australia': 'AU', 'canada': 'CA',
  'netherlands': 'NL', 'belgium': 'BE', 'portugal': 'PT',
  'switzerland': 'CH', 'austria': 'AT',
  'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK', 'finland': 'FI',
  'poland': 'PL', 'ireland': 'IE', 'greece': 'GR',
  'romania': 'RO', 'hungary': 'HU', 'czech republic': 'CZ', 'czechia': 'CZ',
  'slovakia': 'SK', 'bulgaria': 'BG', 'croatia': 'HR', 'slovenia': 'SI',
  'estonia': 'EE', 'latvia': 'LV', 'lithuania': 'LT',
  'chile': 'CL', 'peru': 'PE', 'colombia': 'CO',
  'new zealand': 'NZ', 'china': 'CN', 'taiwan': 'TW', 'hong kong': 'HK',
  'singapore': 'SG', 'malaysia': 'MY', 'thailand': 'TH',
  'india': 'IN', 'israel': 'IL', 'turkey': 'TR',
  'south africa': 'ZA',
};

function countryToISO(name) {
  return COUNTRY_TO_ISO[String(name || '').toLowerCase().trim()] || '';
}

/* Comprehensive list of holdable Pokémon items for the item autocomplete.
   Covers: hold items, berries, type-resist berries, plates (Arceus),
   memories (Silvally), drives (Genesect), signature/form items.
   Skips: Mega Stones, Z-Crystals (out of format in modern VGC), TMs, key items. */
const COMMON_ITEMS = [
  // Standard hold items
  'ability-shield', 'absorb-bulb', 'adamant-crystal', 'adamant-orb', 'adrenaline-orb',
  'air-balloon', 'amulet-coin', 'assault-vest',
  'big-root', 'binding-band', 'black-belt', 'black-glasses', 'black-sludge',
  'blunder-policy', 'booster-energy', 'bright-powder',
  'cell-battery', 'charcoal', 'choice-band', 'choice-scarf', 'choice-specs',
  'cleanse-tag', 'clear-amulet', 'cornerstone-mask', 'covert-cloak',
  'damp-rock', 'deep-sea-scale', 'deep-sea-tooth', 'destiny-knot', 'dragon-fang',
  'eject-button', 'eject-pack', 'electric-seed', 'everstone', 'eviolite', 'expert-belt',
  'flame-orb', 'float-stone', 'focus-band', 'focus-sash',
  'grassy-seed', 'grip-claw', 'griseous-core', 'griseous-orb',
  'hard-stone', 'hearthflame-mask', 'heat-rock', 'heavy-duty-boots',
  'icy-rock', 'iron-ball',
  'kings-rock',
  'lagging-tail', 'lax-incense', 'leftovers', 'life-orb', 'light-ball', 'light-clay',
  'loaded-dice', 'luck-incense', 'lucky-egg', 'lucky-punch', 'luminous-moss',
  'lustrous-globe', 'lustrous-orb',
  'macho-brace', 'magnet', 'mental-herb', 'metal-coat', 'metal-powder', 'metronome',
  'miracle-seed', 'mirror-herb', 'misty-seed', 'muscle-band', 'mystic-water',
  'never-melt-ice',
  'odd-incense',
  'poison-barb', 'power-anklet', 'power-band', 'power-belt', 'power-bracer',
  'power-herb', 'power-lens', 'power-weight', 'protective-pads',
  'psychic-seed', 'punching-glove',
  'quick-claw', 'quick-powder',
  'razor-claw', 'razor-fang', 'red-card', 'ring-target', 'rocky-helmet',
  'rose-incense', 'rusted-shield', 'rusted-sword',
  'safety-goggles', 'scope-lens', 'sea-incense', 'sharp-beak', 'shed-shell',
  'shell-bell', 'silk-scarf', 'silver-powder', 'smoke-ball', 'smooth-rock',
  'snowball', 'soft-sand', 'soothe-bell', 'soul-dew', 'spell-tag',
  'stick', 'sticky-barb',
  'thick-club', 'throat-spray', 'toxic-orb', 'twisted-spoon',
  'utility-umbrella',
  'weakness-policy', 'wellspring-mask', 'white-herb', 'wide-lens', 'wise-glasses',
  'zoom-lens',

  // Berries — status / pinch / flavor
  'aguav-berry', 'apicot-berry', 'aspear-berry',
  'cheri-berry', 'chesto-berry', 'custap-berry',
  'enigma-berry',
  'figy-berry',
  'ganlon-berry',
  'iapapa-berry',
  'jaboca-berry',
  'kee-berry', 'kelpsy-berry',
  'lansat-berry', 'leppa-berry', 'liechi-berry', 'lum-berry',
  'mago-berry', 'maranga-berry', 'micle-berry',
  'oran-berry',
  'pecha-berry', 'persim-berry', 'petaya-berry',
  'rawst-berry', 'rowap-berry',
  'salac-berry', 'sitrus-berry', 'starf-berry',
  'wiki-berry',

  // Berries — type-resist (-50% damage from super-effective type)
  'babiri-berry', 'charti-berry', 'chilan-berry', 'chople-berry', 'coba-berry',
  'colbur-berry', 'haban-berry', 'kasib-berry', 'kebia-berry',
  'occa-berry', 'passho-berry', 'payapa-berry',
  'rindo-berry', 'roseli-berry', 'shuca-berry',
  'tanga-berry', 'wacan-berry', 'yache-berry',

  // Plates (Arceus)
  'draco-plate', 'dread-plate', 'earth-plate', 'fist-plate', 'flame-plate',
  'icicle-plate', 'insect-plate', 'iron-plate', 'meadow-plate', 'mind-plate',
  'pixie-plate', 'sky-plate', 'splash-plate', 'spooky-plate', 'stone-plate',
  'toxic-plate', 'zap-plate', 'blank-plate', 'legend-plate',

  // Memories (Silvally)
  'bug-memory', 'dark-memory', 'dragon-memory', 'electric-memory', 'fairy-memory',
  'fighting-memory', 'fire-memory', 'flying-memory', 'ghost-memory', 'grass-memory',
  'ground-memory', 'ice-memory', 'poison-memory', 'psychic-memory', 'rock-memory',
  'steel-memory', 'water-memory',

  // Drives (Genesect)
  'burn-drive', 'chill-drive', 'douse-drive', 'shock-drive',

  // Mega Stones — reintroduced in VGC 2026 (Reg H w/ Mega Evolutions)
  'abomasite', 'absolite', 'aerodactylite', 'aggronite', 'alakazite',
  'altarianite', 'ampharosite', 'audinite',
  'banettite', 'beedrillite', 'blastoisinite', 'blazikenite',
  'cameruptite', 'charizardite-x', 'charizardite-y',
  'diancite',
  'galladite', 'garchompite', 'gardevoirite', 'gengarite',
  'glalitite', 'gyaradosite',
  'heracronite', 'houndoominite',
  'kangaskhanite',
  'latiasite', 'latiosite', 'lopunnite', 'lucarionite',
  'manectite', 'mawilite', 'medichamite', 'metagrossite',
  'mewtwonite-x', 'mewtwonite-y',
  'pidgeotite', 'pinsirite',
  'sablenite', 'salamencite', 'sceptilite', 'scizorite',
  'sharpedonite', 'slowbronite', 'steelixite', 'swampertite',
  'tyranitarite',
  'venusaurite',
];

/* Showdown / Pokepaste names that don't match PokeAPI naming */
const SPECIES_ALIAS = {
  'urshifu': 'urshifu-single-strike',
  'ogerpon-wellspring': 'ogerpon-wellspring-mask',
  'ogerpon-hearthflame': 'ogerpon-hearthflame-mask',
  'ogerpon-cornerstone': 'ogerpon-cornerstone-mask',
  'indeedee-f': 'indeedee-female',
  'indeedee-m': 'indeedee-male',
  'meowstic-f': 'meowstic-female',
  'basculegion-f': 'basculegion-female',
  'oinkologne-f': 'oinkologne-female',
};

const state = {
  tournament: {
    name: 'My VGC Tournament',
    subtitle: 'Final Standings',
    type: 'custom',      // 'custom' | 'friendly' | 'challenge' | 'cup'
    totalPlayers: null,  // null = auto (uses state.players.length)
    topOnly: true,       // when true and type is challenge/cup: show only players who earn CP
  },
  players: [],
  pokemonIndex: {},
};

/* ===== Championship Points (VGC 2026 season) =====
   Source: Play! Pokémon — League Challenges, League Cups, and Prerelease Guide
   Each row: placement bracket [from, to], CP awarded, min players required (kicker). */
const CP_TABLES = {
  challenge: [
    { from: 1,  to: 1,  cp: 15, minPlayers: 0  },
    { from: 2,  to: 2,  cp: 12, minPlayers: 4  },
    { from: 3,  to: 4,  cp: 10, minPlayers: 8  },
    { from: 5,  to: 8,  cp: 8,  minPlayers: 14 },
    { from: 9,  to: 16, cp: 6,  minPlayers: 25 },
    { from: 17, to: 32, cp: 4,  minPlayers: 48 },
  ],
  cup: [
    { from: 1,  to: 1,  cp: 50, minPlayers: 0   },
    { from: 2,  to: 2,  cp: 40, minPlayers: 4   },
    { from: 3,  to: 4,  cp: 32, minPlayers: 8   },
    { from: 5,  to: 8,  cp: 25, minPlayers: 17  },
    { from: 9,  to: 16, cp: 20, minPlayers: 48  },
    { from: 17, to: 32, cp: 16, minPlayers: 80  },
    { from: 33, to: 64, cp: 13, minPlayers: 128 },
  ],
};

function effectiveTotalPlayers() {
  const t = state.tournament.totalPlayers;
  if (t && t > 0) return t;
  return state.players.length;
}

/* Top cut size based on total players, per Play! Pokémon Premier rules.
   This is the "top N" actually shown on the standings card. */
function getTopCutSize() {
  const total = effectiveTotalPlayers();
  if (total >= 129) return 64;
  if (total >= 65)  return 32;
  if (total >= 33)  return 16;
  if (total >= 17)  return 8;
  if (total >= 9)   return 4;
  if (total >= 4)   return 2;
  return Math.max(1, total);
}


function shouldFilterTop() {
  const t = state.tournament.type;
  return state.tournament.topOnly && (t === 'challenge' || t === 'cup');
}

function computeCP(placement, player) {
  const type = state.tournament.type;
  if (type === 'friendly') return null;
  if (type === 'custom') return Math.max(0, Number(player.cp) || 0);
  const table = CP_TABLES[type];
  if (!table) return 0;
  const total = effectiveTotalPlayers();
  for (const row of table) {
    if (placement >= row.from && placement <= row.to) {
      return total >= row.minPlayers ? row.cp : 0;
    }
  }
  return 0;
}

let nextId = 1;

const $ = (sel, root = document) => root.querySelector(sel);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function normalizeSpeciesKey(name) {
  let s = String(name || '').toLowerCase().trim();
  s = s.replace(/♀/g, '-f').replace(/♂/g, '-m');
  s = s.replace(/['’‘`]/g, '');
  s = s.replace(/[.:]/g, '');
  s = s.replace(/[\s_]+/g, '-');
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s;
}

function resolveSpecies(rawName) {
  const key = normalizeSpeciesKey(rawName);
  if (!key) return null;
  if (state.pokemonIndex[key]) return key;
  if (SPECIES_ALIAS[key] && state.pokemonIndex[SPECIES_ALIAS[key]]) return SPECIES_ALIAS[key];
  for (const suffix of ['-mask', '-male', '-female', '-single-strike']) {
    const alt = key + suffix;
    if (state.pokemonIndex[alt]) return alt;
  }
  return null;
}

function spriteUrl(name) {
  const resolved = resolveSpecies(name);
  if (!resolved) return null;
  const id = state.pokemonIndex[resolved];
  if (!id) return null;
  return SPRITE_BASE + id + '.png';
}

/* Smaller (96x96) thumbnail variant for use in the combobox dropdown.
   Keeps panel-opening cost low (~5KB each vs 100KB for official-artwork). */
function spriteThumbUrl(name) {
  const resolved = resolveSpecies(name);
  if (!resolved) return null;
  const id = state.pokemonIndex[resolved];
  if (!id) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function flagHtml(code) {
  const cc = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '<span class="row-flag-empty">·</span>';
  return `<img class="row-flag-img" src="${FLAG_BASE}${cc.toLowerCase()}.png" alt="${cc}" crossorigin="anonymous" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'row-flag-empty',textContent:'·'}))">`;
}

function itemIconUrls(name) {
  const cleaned = String(name || '').toLowerCase().replace(/[^a-z0-9 _-]/g, '');
  if (!cleaned.replace(/[^a-z0-9]+/g, '')) return [];
  return ITEM_SOURCES.map(fn => fn(cleaned));
}

function itemIconUrl(name) {
  const urls = itemIconUrls(name);
  return urls[0] || null;
}

// Global handler: walks through the data-fb pipe-delimited fallback URLs on img error.
// If all fallbacks exhausted, removes the icon parent so the sprite shows clean.
window.itemFallback = function(img) {
  const list = (img.dataset.fb || '').split('|').filter(Boolean);
  if (list.length === 0) {
    if (img.parentElement) img.parentElement.remove();
    return;
  }
  img.dataset.fb = list.slice(1).join('|');
  img.src = list[0];
};

function parseSlotInput(text) {
  const s = String(text || '');
  const atIdx = s.indexOf(' @ ');
  if (atIdx === -1) return { species: s.trim(), item: '' };
  return {
    species: s.slice(0, atIdx).trim(),
    item: s.slice(atIdx + 3).trim(),
  };
}

function formatSlotInput(slot) {
  if (!slot || !slot.species) return slot && slot.item ? ` @ ${slot.item}` : '';
  return slot.item ? `${slot.species} @ ${slot.item}` : slot.species;
}

function normalizeTeam(team) {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const t = team && team[i];
    if (typeof t === 'string') {
      // Legacy: bare string. Could be "garchomp" or "garchomp @ life orb" from interim format.
      const parsed = parseSlotInput(t);
      out.push({ species: parsed.species, item: parsed.item });
    } else if (t && typeof t === 'object') {
      const species = String(t.species || '');
      const item = String(t.item || '');
      // Migrate state where item got embedded into the species string.
      if (!item && species.indexOf(' @ ') > -1) {
        const parsed = parseSlotInput(species);
        out.push({ species: parsed.species, item: parsed.item });
      } else {
        out.push({ species, item });
      }
    } else {
      out.push({ species: '', item: '' });
    }
  }
  return out;
}

function sortedPlayers() {
  return [...state.players].sort((a, b) => {
    // Explicit place (from TDF import) takes precedence
    if (a.place && b.place) return a.place - b.place;
    if (a.place) return -1;
    if (b.place) return 1;
    // Fallback: W-L sort
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return state.players.indexOf(a) - state.players.indexOf(b);
  });
}

const CARD_KICKERS = {
  challenge: 'League Challenge',
  cup: 'League Cup',
  friendly: 'Friendly',
};

function renderCard() {
  $('#card-title').textContent = state.tournament.name || ' ';
  $('#card-subtitle').textContent = state.tournament.subtitle || '';
  $('#card-kicker').textContent = CARD_KICKERS[state.tournament.type] || '';

  const rows = $('#standings-rows');
  let sorted = sortedPlayers();
  if (shouldFilterTop()) {
    sorted = sorted.slice(0, getTopCutSize());
  }

  if (sorted.length === 0) {
    rows.innerHTML = '<div class="empty-state">Aggiungi giocatori dalla sidebar per iniziare</div>';
    return;
  }

  rows.innerHTML = '';
  const type = state.tournament.type;
  const showCP = type !== 'friendly';

  sorted.forEach((p, i) => {
    const place = i + 1;
    const row = document.createElement('div');
    row.className = 'standings-row'
      + (place <= 3 ? ' top-' + place : '')
      + (showCP ? ' with-cp' : '');

    const teamHtml = p.team.map(slot => {
      const url = spriteUrl(slot.species);
      const itemSrcs = itemIconUrls(slot.item);
      let itemHtml = '';
      if (itemSrcs.length) {
        const primary = itemSrcs[0];
        const fb = itemSrcs.slice(1).join('|');
        itemHtml = `<span class="item-icon"><img src="${primary}" data-fb="${fb}" alt="${escapeHtml(slot.item)}" crossorigin="anonymous" onerror="itemFallback(this)"></span>`;
      }
      if (!url) return '<div class="sprite empty"></div>';
      return `<div class="sprite"><img class="sprite-img" src="${url}" alt="${escapeHtml(slot.species)}" crossorigin="anonymous" onerror="this.remove();this.parentElement.classList.add('empty')">${itemHtml}</div>`;
    }).join('');

    let cpHtml = '';
    if (showCP) {
      const cp = computeCP(place, p) ?? 0;
      const cls = cp === 0 ? 'row-cp zero' : 'row-cp';
      cpHtml = `<div class="${cls}">${cp}<span class="cp-suffix">CP</span></div>`;
    }

    row.innerHTML = `
      <div class="row-place">${place}</div>
      <div class="row-player">
        <span class="row-flag">${flagHtml(p.country)}</span>
        <span class="row-name">${escapeHtml(p.name || '—')}</span>
      </div>
      <div class="row-team">${teamHtml}</div>
      <div class="row-record">${p.ties > 0 ? `${p.wins}-${p.losses}-${p.ties}` : `${p.wins}-${p.losses}`}</div>
      ${cpHtml}
    `;
    rows.appendChild(row);
  });
}

function renderFormPlaces() {
  const sorted = sortedPlayers();
  state.players.forEach(p => {
    const form = document.querySelector(`.player-form[data-id="${p.id}"] .place`);
    if (form) {
      const rank = sorted.findIndex(s => s.id === p.id) + 1;
      form.textContent = '#' + rank;
    }
  });
}

function render() {
  applyTournamentType();
  renderCard();
  renderFormPlaces();
  saveState();
}

function addPlayer(data = {}) {
  const player = {
    id: nextId++,
    name: data.name || '',
    country: data.country || '',
    wins: Number(data.wins) || 0,
    losses: Number(data.losses) || 0,
    ties: Number(data.ties) || 0,
    cp: Number(data.cp) || 0,
    place: Number(data.place) || 0,
    team: normalizeTeam(data.team),
  };
  state.players.push(player);

  const tpl = $('#player-form-tpl').content.cloneNode(true);
  const form = tpl.querySelector('.player-form');
  form.dataset.id = String(player.id);
  $('.p-name', form).value = player.name;
  $('.p-country', form).value = player.country;
  $('.p-wins', form).value = player.wins;
  $('.p-losses', form).value = player.losses;
  $('.p-cp', form).value = player.cp;
  form.querySelectorAll('.p-mon').forEach((inp, i) => {
    inp.value = player.team[i].species || '';
  });
  form.querySelectorAll('.p-item').forEach((inp, i) => {
    inp.value = player.team[i].item || '';
  });

  form.addEventListener('input', e => {
    const t = e.target;
    if (t.classList.contains('p-name')) player.name = t.value;
    else if (t.classList.contains('p-country')) player.country = t.value;
    else if (t.classList.contains('p-wins')) player.wins = Math.max(0, Number(t.value) || 0);
    else if (t.classList.contains('p-losses')) player.losses = Math.max(0, Number(t.value) || 0);
    else if (t.classList.contains('p-cp')) player.cp = Math.max(0, Number(t.value) || 0);
    else if (t.classList.contains('p-mon')) {
      const slot = Number(t.dataset.slot);
      const parsed = parseSlotInput(t.value);
      player.team[slot].species = parsed.species;
      // If user pasted "species @ item" into the species field, lift the item out
      if (parsed.item) {
        player.team[slot].item = parsed.item;
        const itemInput = form.querySelector(`.p-item[data-slot="${slot}"]`);
        if (itemInput) itemInput.value = parsed.item;
        t.value = parsed.species;
      }
    }
    else if (t.classList.contains('p-item')) {
      player.team[Number(t.dataset.slot)].item = t.value;
    }
    render();
  });

  $('.remove', form).addEventListener('click', () => {
    state.players = state.players.filter(p => p.id !== player.id);
    form.remove();
    render();
  });

  $('.import-team', form).addEventListener('click', () => openImportModal(player.id));

  $('#players-list').appendChild(form);
  render();
}

async function loadPokemonIndex() {
  const status = $('#status');
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      state.pokemonIndex = JSON.parse(cached);
      populateDatalist();
      status.textContent = `Pokédex pronto (${Object.keys(state.pokemonIndex).length} Pokémon, cache)`;
      return;
    }
    const res = await fetch(POKEAPI_LIST);
    const data = await res.json();
    data.results.forEach(p => {
      const m = p.url.match(/\/pokemon\/(\d+)\/?$/);
      if (m) state.pokemonIndex[p.name] = Number(m[1]);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.pokemonIndex));
    populateDatalist();
    status.textContent = `Pokédex pronto (${data.results.length} Pokémon)`;
  } catch (e) {
    console.warn('Errore caricamento Pokédex', e);
    status.textContent = '⚠ Pokédex offline — sprite non disponibili';
  }
}

function populateDatalist() {
  const list = $('#poke-list');
  const frag = document.createDocumentFragment();
  Object.keys(state.pokemonIndex).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    frag.appendChild(opt);
  });
  list.innerHTML = '';
  list.appendChild(frag);
}

/* Themed combobox panel for .p-mon (Pokémon) and .p-item (oggetto) inputs.
   One shared DOM panel (positioned fixed) services all inputs via event
   delegation, avoiding O(N) DOM cost on tournaments with many players.
   The native <input> stays as state holder; we just disable the browser's
   datalist autocomplete and overlay our custom suggestions list. */
function setupComboboxes() {
  const panel = document.createElement('div');
  panel.className = 'combobox-panel hidden';
  panel.setAttribute('role', 'listbox');
  document.body.appendChild(panel);

  const MAX_RESULTS = 40;
  let currentInput = null;
  let kind = null;          // 'mon' | 'item'

  function getOptions() {
    if (kind === 'mon') return Object.keys(state.pokemonIndex);
    if (kind === 'item') return COMMON_ITEMS;
    return [];
  }

  function filterAndSort(query, options) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return options.slice(0, MAX_RESULTS);
    const starts = [];
    const includes = [];
    for (const name of options) {
      const lower = name.toLowerCase();
      if (lower.startsWith(q)) starts.push(name);
      else if (lower.includes(q)) includes.push(name);
      if (starts.length + includes.length >= MAX_RESULTS * 3) break;
    }
    return starts.concat(includes).slice(0, MAX_RESULTS);
  }

  function renderOptions(query) {
    const matches = filterAndSort(query, getOptions());
    if (matches.length === 0) {
      panel.innerHTML = '<div class="combobox-empty">Nessun risultato</div>';
      return;
    }
    panel.innerHTML = matches.map(name => {
      let iconHtml = '';
      if (kind === 'mon') {
        const url = spriteThumbUrl(name);
        iconHtml = url
          ? `<img class="combobox-icon" src="${url}" alt="" crossorigin="anonymous" onerror="this.style.visibility='hidden'">`
          : '<span class="combobox-icon"></span>';
      } else {
        const url = itemIconUrl(name);
        iconHtml = url
          ? `<img class="combobox-icon item" src="${url}" alt="" crossorigin="anonymous" onerror="this.style.visibility='hidden'">`
          : '<span class="combobox-icon item"></span>';
      }
      return `<div class="combobox-option" data-value="${escapeHtml(name)}" role="option">${iconHtml}<span class="combobox-option-name">${escapeHtml(name)}</span></div>`;
    }).join('');
  }

  function positionPanel(input) {
    const rect = input.getBoundingClientRect();
    const panelWidth = Math.max(rect.width, 220);
    panel.style.width = panelWidth + 'px';
    panel.style.left = rect.left + 'px';
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 200 && rect.top > 200) {
      // not enough room below — flip above
      panel.style.top = '';
      panel.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
    } else {
      panel.style.bottom = '';
      panel.style.top = (rect.bottom + 4) + 'px';
    }
  }

  function openFor(input, k) {
    currentInput = input;
    kind = k;
    // Disable native datalist popup (we provide our own UI).
    input.removeAttribute('list');
    renderOptions(input.value);
    positionPanel(input);
    panel.classList.remove('hidden');
  }

  function close() {
    if (!currentInput) return;
    currentInput = null;
    kind = null;
    panel.classList.add('hidden');
  }

  // Prevent the input from losing focus when clicking inside the panel.
  panel.addEventListener('mousedown', e => e.preventDefault());

  panel.addEventListener('click', e => {
    const opt = e.target.closest('.combobox-option');
    if (!opt || !currentInput) return;
    currentInput.value = opt.dataset.value;
    currentInput.dispatchEvent(new Event('input', { bubbles: true }));
    close();
  });

  document.addEventListener('focusin', e => {
    if (e.target.matches('.p-mon')) openFor(e.target, 'mon');
    else if (e.target.matches('.p-item')) openFor(e.target, 'item');
    else if (currentInput) close();
  });

  document.addEventListener('input', e => {
    if (e.target === currentInput) renderOptions(e.target.value);
  });

  document.addEventListener('mousedown', e => {
    if (currentInput && !panel.contains(e.target) && e.target !== currentInput) {
      close();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && currentInput) {
      currentInput.blur();
      close();
    }
  });

  // Re-position on scroll/resize so the panel tracks its anchor input.
  window.addEventListener('scroll', () => {
    if (currentInput) positionPanel(currentInput);
  }, true);
  window.addEventListener('resize', () => {
    if (currentInput) positionPanel(currentInput);
  });
}

/* Wraps a native <select> in a custom-styled dropdown that matches the
   app theme. The native element stays in the DOM as the canonical state
   holder (so loadState/exportJSON keep working unchanged) — we just hide
   it visually and proxy clicks through to dispatch a 'change' event. */
function enhanceSelect(select) {
  if (!select || select.dataset.enhanced === '1') return;
  select.dataset.enhanced = '1';

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'custom-select-button';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML =
    '<span class="custom-select-value"></span>' +
    '<span class="custom-select-arrow" aria-hidden="true"></span>';

  const panel = document.createElement('ul');
  panel.className = 'custom-select-options';
  panel.setAttribute('role', 'listbox');

  Array.from(select.options).forEach(opt => {
    const li = document.createElement('li');
    li.className = 'custom-select-option';
    li.setAttribute('role', 'option');
    li.dataset.value = opt.value;
    li.textContent = opt.textContent;
    if (opt.value === select.value) li.classList.add('selected');
    li.addEventListener('click', e => {
      e.stopPropagation();
      if (select.value !== opt.value) {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      close();
    });
    panel.appendChild(li);
  });

  function syncFromSelect() {
    const opt = Array.from(select.options).find(o => o.value === select.value);
    button.querySelector('.custom-select-value').textContent = opt ? opt.textContent : '';
    panel.querySelectorAll('.custom-select-option').forEach(li => {
      li.classList.toggle('selected', li.dataset.value === select.value);
    });
  }

  let isOpen = false;
  function open() {
    if (isOpen) return;
    isOpen = true;
    wrapper.classList.add('open');
    button.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      document.addEventListener('click', onOutsideClick);
      document.addEventListener('keydown', onKeyDown);
    }, 0);
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    wrapper.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutsideClick);
    document.removeEventListener('keydown', onKeyDown);
  }
  function onOutsideClick(e) { if (!wrapper.contains(e.target)) close(); }
  function onKeyDown(e) {
    if (e.key === 'Escape') { close(); button.focus(); }
  }

  button.addEventListener('click', e => {
    e.stopPropagation();
    if (isOpen) close(); else open();
  });

  // Replace position: insert wrapper where select was, then move select into wrapper.
  select.parentNode.insertBefore(wrapper, select);
  select.classList.add('custom-select-native');
  wrapper.appendChild(select);
  wrapper.appendChild(button);
  wrapper.appendChild(panel);

  // Sync UI when the native select's value changes (incl. programmatic
  // changes that dispatch a 'change' event, like loadState/importJSON).
  select.addEventListener('change', syncFromSelect);

  syncFromSelect();
}

function populateItemDatalist() {
  const list = $('#item-list');
  if (!list) return;
  const frag = document.createDocumentFragment();
  COMMON_ITEMS.slice().sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    frag.appendChild(opt);
  });
  list.innerHTML = '';
  list.appendChild(frag);
}

function preloadImages(urls) {
  return Promise.all(urls.map(url => new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = img.onerror = () => resolve();
    img.src = url;
  })));
}

let pendingPreviewBlob = null;
let pendingPreviewUrl = null;

function clearPendingPreview() {
  if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
  pendingPreviewBlob = null;
  pendingPreviewUrl = null;
}

function openPreviewModal() {
  $('#preview-modal').classList.remove('hidden');
}

function closePreviewModal() {
  $('#preview-modal').classList.add('hidden');
  $('#preview-image').classList.add('hidden');
  $('#preview-image').src = '';
  $('#preview-status').textContent = 'Generazione in corso...';
  $('#preview-status').classList.remove('error', 'hidden');
  $('#preview-download').disabled = true;
  clearPendingPreview();
}

async function exportPNG() {
  const btn = $('#export-png');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Generazione...';

  // Reset preview modal and show it immediately
  clearPendingPreview();
  $('#preview-image').classList.add('hidden');
  $('#preview-image').src = '';
  $('#preview-status').textContent = 'Generazione in corso...';
  $('#preview-status').classList.remove('error', 'hidden');
  $('#preview-download').disabled = true;
  openPreviewModal();

  try {
    const urls = [
      ...state.players.flatMap(p => p.team.map(slot => spriteUrl(slot.species))),
      ...state.players.flatMap(p => p.team.flatMap(slot => itemIconUrls(slot.item))),
      ...state.players.map(p => p.country ? FLAG_BASE + String(p.country).toLowerCase() + '.png' : null),
    ].filter(Boolean);
    await preloadImages(urls);
    // Let any in-DOM img fallback cascade settle (onerror -> next src) before snapshot
    await new Promise(r => setTimeout(r, 250));

    const card = $('#standings-card');

    // Render the card OFFSCREEN at the desktop width so the browser (not
    // html2canvas) computes the CSS Grid / minmax layout. This avoids
    // html2canvas's known issues with fr / minmax tracks. body.exporting
    // disables the @media (max-width: 980px) responsive shrink for the clone.
    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'position:fixed;left:-99999px;top:0;width:920px;pointer-events:none;';
    const clone = card.cloneNode(true);
    clone.removeAttribute('id');
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);
    document.body.classList.add('exporting');
    // Force a synchronous layout so the clone has correct dimensions.
    void clone.offsetHeight;

    let canvas;
    try {
      canvas = await html2canvas(clone, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
    } finally {
      document.body.classList.remove('exporting');
      wrapper.remove();
    }

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas vuoto')), 'image/png');
    });

    pendingPreviewBlob = blob;
    pendingPreviewUrl = URL.createObjectURL(blob);

    const img = $('#preview-image');
    img.src = pendingPreviewUrl;
    img.classList.remove('hidden');
    $('#preview-status').classList.add('hidden');
    $('#preview-download').disabled = false;
  } catch (e) {
    console.error(e);
    $('#preview-status').textContent = 'Errore durante la generazione: ' + e.message;
    $('#preview-status').classList.add('error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function downloadPreview() {
  if (!pendingPreviewBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(pendingPreviewBlob);
  const slug = (state.tournament.name || 'standings')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_|_$/g, '') || 'standings';
  a.download = slug + '.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  closePreviewModal();
}

function exportJSON() {
  const payload = {
    tournament: state.tournament,
    players: state.players.map(({ id, ...rest }) => rest),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const slug = (state.tournament.name || 'standings').replace(/\s+/g, '_');
  a.download = slug + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.tournament) {
        state.tournament = {
          name: data.tournament.name || '',
          subtitle: data.tournament.subtitle || '',
          type: data.tournament.type || 'custom',
          totalPlayers: data.tournament.totalPlayers ?? null,
        };
        $('#tournament-name').value = state.tournament.name;
        $('#tournament-subtitle').value = state.tournament.subtitle;
        $('#tournament-type').value = state.tournament.type;
        $('#tournament-type').dispatchEvent(new Event('change', { bubbles: true }));
        $('#total-players').value = state.tournament.totalPlayers ?? '';
        applyTournamentType();
      }
      state.players = [];
      $('#players-list').innerHTML = '';
      (data.players || []).forEach(p => addPlayer(p));
      render();
    } catch (err) {
      alert('JSON non valido: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function importTDF(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result;
      const doc = new DOMParser().parseFromString(text, 'text/xml');
      if (doc.querySelector('parsererror')) throw new Error('XML non valido');

      const root = doc.querySelector('tournament');
      if (!root) throw new Error('File TDF: tag <tournament> mancante');

      const tName = (root.querySelector(':scope > data > name')?.textContent || '').trim() || 'Tournament';
      const tCountry = (root.querySelector(':scope > data > country')?.textContent || '').trim();
      const defaultISO = countryToISO(tCountry);

      // Player registry: userid -> { name, wins, losses, ties }
      const players = {};
      root.querySelectorAll(':scope > players > player').forEach(p => {
        const uid = p.getAttribute('userid');
        if (!uid) return;
        const fn = (p.querySelector(':scope > firstname')?.textContent || '').trim();
        const ln = (p.querySelector(':scope > lastname')?.textContent || '').trim();
        players[uid] = {
          name: `${fn} ${ln}`.trim() || `Player ${uid}`,
          wins: 0, losses: 0, ties: 0,
        };
      });

      if (Object.keys(players).length === 0) throw new Error('Nessun giocatore nel file');

      // Compute W-L-T from all matches across all pods/rounds
      root.querySelectorAll(':scope > pods > pod > rounds > round > matches > match').forEach(m => {
        const outcome = m.getAttribute('outcome');
        const p1 = m.querySelector(':scope > player1')?.getAttribute('userid');
        const p2 = m.querySelector(':scope > player2')?.getAttribute('userid');
        const solo = m.querySelector(':scope > player')?.getAttribute('userid');
        // outcomes: 1=p1 win, 2=p2 win, 3=tie, 4=double loss, 5=bye
        if (outcome === '1' && players[p1] && players[p2]) {
          players[p1].wins++; players[p2].losses++;
        } else if (outcome === '2' && players[p1] && players[p2]) {
          players[p1].losses++; players[p2].wins++;
        } else if (outcome === '3' && players[p1] && players[p2]) {
          players[p1].ties++; players[p2].ties++;
        } else if (outcome === '4' && players[p1] && players[p2]) {
          players[p1].losses++; players[p2].losses++;
        } else if (outcome === '5' && solo && players[solo]) {
          players[solo].wins++;
        }
      });

      // TOM's final standings (uses correct tiebreakers - Buchholz, OWR, etc.)
      const ordered = [];
      const seen = new Set();
      root.querySelectorAll(':scope > standings > pod[type="finished"] > player').forEach(p => {
        const uid = p.getAttribute('id');
        const place = Number(p.getAttribute('place')) || 0;
        if (players[uid] && place > 0) {
          ordered.push({ ...players[uid], place });
          seen.add(uid);
        }
      });
      // Append any player not in finished standings (e.g., tournament in progress)
      Object.entries(players).forEach(([uid, data]) => {
        if (!seen.has(uid)) ordered.push({ ...data, place: 0 });
      });

      if (state.players.length > 0 && !confirm(
        `Sostituire il torneo corrente con "${tName}" (${ordered.length} giocatori)?`
      )) return;

      state.tournament.name = tName;
      $('#tournament-name').value = tName;
      state.players = [];
      $('#players-list').innerHTML = '';
      ordered.forEach(o => addPlayer({
        name: o.name,
        country: defaultISO,
        wins: o.wins,
        losses: o.losses,
        ties: o.ties,
        place: o.place,
      }));
      render();
      alert(`Importati ${ordered.length} giocatori da "${tName}"`);
    } catch (err) {
      alert('Errore import TDF: ' + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function saveState() {
  try {
    const payload = {
      tournament: state.tournament,
      players: state.players.map(({ id, ...rest }) => rest),
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(payload));
  } catch (e) { /* quota? ignore */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.tournament) {
      state.tournament = {
        name: data.tournament.name || '',
        subtitle: data.tournament.subtitle || '',
        type: data.tournament.type || 'custom',
        totalPlayers: data.tournament.totalPlayers ?? null,
        topOnly: data.tournament.topOnly !== undefined ? !!data.tournament.topOnly : true,
      };
      $('#tournament-name').value = state.tournament.name;
      $('#tournament-subtitle').value = state.tournament.subtitle;
      $('#tournament-type').value = state.tournament.type;
      $('#total-players').value = state.tournament.totalPlayers ?? '';
    }
    (data.players || []).forEach(p => addPlayer(p));
    return (data.players || []).length > 0;
  } catch (e) {
    return false;
  }
}

function applyTournamentType() {
  const type = state.tournament.type || 'custom';
  document.body.dataset.tournamentType = type;
  const wrap = $('#total-players-wrap');
  const topWrap = $('#top-only-wrap');
  const topHint = $('#top-only-hint');
  if (type === 'challenge' || type === 'cup') {
    wrap.classList.remove('hidden');
    topWrap.classList.remove('hidden');
    $('#total-players').placeholder = `auto (= ${state.players.length})`;
    $('#top-only').checked = !!state.tournament.topOnly;
    const cutSize = getTopCutSize();
    topHint.textContent = state.tournament.topOnly && Number.isFinite(cutSize)
      ? `(top ${cutSize})`
      : '';
  } else {
    wrap.classList.add('hidden');
    topWrap.classList.add('hidden');
  }
}

function seedExample() {
  // ===== Top 4: detailed archetypes =====

  // Player One — Mega Gardevoir Balance (Fairy Spam + Intimidate + redirect)
  addPlayer({
    name: 'Player One', country: 'IT', wins: 7, losses: 2,
    team: [
      { species: 'gardevoir', item: 'gardevoirite' },
      { species: 'incineroar', item: 'safety-goggles' },
      { species: 'amoonguss', item: 'sitrus-berry' },
      { species: 'urshifu-rapid-strike', item: 'mystic-water' },
      { species: 'whimsicott', item: 'covert-cloak' },
      { species: 'landorus-therian', item: 'assault-vest' },
    ],
  });
  // Player Two — Mega Charizard Y Sun (Drought + Solar Beam + speed control)
  addPlayer({
    name: 'Player Two', country: 'ES', wins: 7, losses: 2,
    team: [
      { species: 'charizard', item: 'charizardite-y' },
      { species: 'torkoal', item: 'heat-rock' },
      { species: 'venusaur', item: 'life-orb' },
      { species: 'tornadus', item: 'covert-cloak' },
      { species: 'flutter-mane', item: 'booster-energy' },
      { species: 'iron-hands', item: 'assault-vest' },
    ],
  });
  // Player Three — Mega Kangaskhan Offense (Parental Bond + Sand + priority)
  addPlayer({
    name: 'Player Three', country: 'JP', wins: 6, losses: 3,
    team: [
      { species: 'kangaskhan', item: 'kangaskhanite' },
      { species: 'tyranitar', item: 'assault-vest' },
      { species: 'excadrill', item: 'focus-sash' },
      { species: 'tapu-koko', item: 'life-orb' },
      { species: 'roaring-moon', item: 'booster-energy' },
      { species: 'heatran', item: 'leftovers' },
    ],
  });
  // Player Four — Mega Mawile Trick Room (Huge Power + reverse speed)
  addPlayer({
    name: 'Player Four', country: 'FR', wins: 6, losses: 3,
    team: [
      { species: 'mawile', item: 'mawilite' },
      { species: 'hatterene', item: 'life-orb' },
      { species: 'indeedee-female', item: 'psychic-seed' },
      { species: 'glastrier', item: 'lum-berry' },
      { species: 'ursaluna', item: 'flame-orb' },
      { species: 'annihilape', item: 'choice-band' },
    ],
  });

  // ===== Bench (positions 5-9, hidden by default top-cut filter) =====

  addPlayer({
    name: 'Player Five', country: 'US', wins: 5, losses: 4,
    team: [
      { species: 'tyranitar', item: 'tyranitarite' },
      { species: 'excadrill', item: 'life-orb' },
      { species: 'garchomp', item: 'yache-berry' },
      { species: 'heatran', item: 'leftovers' },
      { species: 'incineroar', item: 'safety-goggles' },
      { species: 'iron-hands', item: 'assault-vest' },
    ],
  });
  addPlayer({
    name: 'Player Six', country: 'DE', wins: 5, losses: 4,
    team: [
      { species: 'garchomp', item: 'garchompite' },
      { species: 'hippowdon', item: 'smooth-rock' },
      { species: 'roaring-moon', item: 'booster-energy' },
      { species: 'volcarona', item: 'heavy-duty-boots' },
      { species: 'iron-crown', item: 'booster-energy' },
      { species: 'amoonguss', item: 'sitrus-berry' },
    ],
  });
  addPlayer({
    name: 'Player Seven', country: 'BR', wins: 4, losses: 5,
    team: [
      { species: 'lucario', item: 'lucarionite' },
      { species: 'tapu-koko', item: 'life-orb' },
      { species: 'urshifu-single-strike', item: 'choice-scarf' },
      { species: 'talonflame', item: 'sharp-beak' },
      { species: 'iron-crown', item: 'booster-energy' },
      { species: 'incineroar', item: 'safety-goggles' },
    ],
  });
  addPlayer({
    name: 'Player Eight', country: 'AU', wins: 4, losses: 5,
    team: [
      { species: 'ogerpon-wellspring', item: 'wellspring-mask' },
      { species: 'iron-hands', item: 'assault-vest' },
      { species: 'rillaboom', item: 'loaded-dice' },
      { species: 'amoonguss', item: 'mental-herb' },
      { species: 'flutter-mane', item: 'choice-specs' },
      { species: 'landorus-therian', item: 'yache-berry' },
    ],
  });
  addPlayer({
    name: 'Player Nine', country: 'CA', wins: 3, losses: 6,
    team: [
      { species: 'chien-pao', item: 'focus-sash' },
      { species: 'roaring-moon', item: 'booster-energy' },
      { species: 'iron-crown', item: 'booster-energy' },
      { species: 'whimsicott', item: 'covert-cloak' },
      { species: 'garchomp', item: 'life-orb' },
      { species: 'heatran', item: 'leftovers' },
    ],
  });
}

/* ===== Import: Pokepaste + Showdown format ===== */

let currentImportPlayerId = null;

function openImportModal(playerId) {
  currentImportPlayerId = playerId;
  $('#import-url').value = '';
  $('#import-text').value = '';
  setFeedback('');
  $('#import-modal').classList.remove('hidden');
  setTimeout(() => $('#import-url').focus(), 30);
}

function closeImportModal() {
  $('#import-modal').classList.add('hidden');
  currentImportPlayerId = null;
}

function setFeedback(msg, kind) {
  const el = $('#import-feedback');
  el.textContent = msg || '';
  el.className = 'modal-feedback' + (kind ? ' ' + kind : '');
}

function pokepasteRawUrl(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/pokepast\.es\/([a-z0-9]+)/i);
  if (urlMatch) return `https://pokepast.es/${urlMatch[1]}/raw`;
  if (/^[a-z0-9]{6,}$/i.test(trimmed)) return `https://pokepast.es/${trimmed}/raw`;
  return null;
}

async function fetchPokepaste(input) {
  const rawUrl = pokepasteRawUrl(input);
  if (!rawUrl) throw new Error('URL Pokepaste non valido. Esempio: https://pokepast.es/abc123...');
  let res;
  try {
    res = await fetch(rawUrl);
  } catch (e) {
    throw new Error('Impossibile contattare pokepast.es (controlla la connessione o eventuali blocchi CORS).');
  }
  if (!res.ok) throw new Error(`Pokepaste ha risposto con HTTP ${res.status}.`);
  return await res.text();
}

function normalizeShowdownSpecies(raw) {
  let s = String(raw || '').toLowerCase().trim();
  s = s.replace(/♀/g, '-f').replace(/♂/g, '-m');
  s = s.replace(/['’‘`]/g, '');  // apostrophes
  s = s.replace(/[.:]/g, '');              // periods, colons
  s = s.replace(/[\s_/]+/g, '-');          // separators -> hyphen
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s;
}

function parseShowdownText(text) {
  const slots = [];
  const normalized = String(text || '').replace(/\r\n/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let first = lines[0];
    // Extract " @ Item"
    let itemRaw = '';
    const atIdx = first.indexOf(' @ ');
    if (atIdx > -1) {
      itemRaw = first.slice(atIdx + 3).trim();
      first = first.slice(0, atIdx).trim();
    }
    // Strip trailing gender " (M)" / " (F)"
    first = first.replace(/\s*\((?:M|F)\)\s*$/i, '').trim();

    // Match "Nickname (Species)"
    const parens = first.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
    const speciesRaw = parens ? parens[2] : first;

    if (!speciesRaw) continue;
    const species = normalizeShowdownSpecies(speciesRaw);
    if (!species) continue;
    const item = itemRaw ? normalizeShowdownSpecies(itemRaw) : '';
    slots.push({ species, item });
    if (slots.length >= 6) break;
  }
  return slots;
}

function applyTeamToPlayer(playerId, slots) {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return;
  for (let i = 0; i < 6; i++) {
    player.team[i] = slots[i] || { species: '', item: '' };
  }
  const form = document.querySelector(`.player-form[data-id="${playerId}"]`);
  if (form) {
    form.querySelectorAll('.p-mon').forEach((inp, i) => {
      inp.value = player.team[i].species || '';
    });
    form.querySelectorAll('.p-item').forEach((inp, i) => {
      inp.value = player.team[i].item || '';
    });
  }
  render();
}

async function handleImport() {
  const urlInput = $('#import-url').value.trim();
  const textInput = $('#import-text').value.trim();
  const btn = $('#import-confirm');

  if (!urlInput && !textInput) {
    setFeedback('Inserisci un URL Pokepaste o incolla il testo Showdown.', 'error');
    return;
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Importazione...';
  setFeedback('');

  try {
    const text = urlInput ? await fetchPokepaste(urlInput) : textInput;
    const slots = parseShowdownText(text);
    if (slots.length === 0) {
      throw new Error('Nessun Pokémon trovato. Verifica il formato del testo.');
    }
    applyTeamToPlayer(currentImportPlayerId, slots);
    const summary = slots.map(s => s.item ? `${s.species} @ ${s.item}` : s.species).join(', ');
    setFeedback(`Importati ${slots.length} Pokémon: ${summary}`, 'success');
    setTimeout(closeImportModal, 700);
  } catch (e) {
    setFeedback(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  $('#tournament-name').addEventListener('input', e => {
    state.tournament.name = e.target.value;
    render();
  });
  $('#tournament-subtitle').addEventListener('input', e => {
    state.tournament.subtitle = e.target.value;
    render();
  });
  $('#tournament-type').addEventListener('change', e => {
    state.tournament.type = e.target.value;
    render();
  });
  $('#total-players').addEventListener('input', e => {
    const v = e.target.value.trim();
    state.tournament.totalPlayers = v === '' ? null : Math.max(0, Number(v) || 0);
    render();
  });
  $('#top-only').addEventListener('change', e => {
    state.tournament.topOnly = e.target.checked;
    render();
  });
  $('#add-player').addEventListener('click', () => addPlayer());
  $('#export-png').addEventListener('click', exportPNG);
  $('#export-json').addEventListener('click', exportJSON);
  $('#import-json').addEventListener('change', e => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  });
  $('#import-tdf').addEventListener('change', e => {
    if (e.target.files[0]) importTDF(e.target.files[0]);
    e.target.value = '';
  });

  // Import modal
  $('#import-modal').addEventListener('click', e => {
    if (e.target.dataset.close === '1') closeImportModal();
  });
  $('#import-confirm').addEventListener('click', handleImport);
  $('#import-url').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); handleImport(); }
  });

  // Preview modal
  $('#preview-modal').addEventListener('click', e => {
    if (e.target.dataset.close === '1') closePreviewModal();
  });
  $('#preview-download').addEventListener('click', downloadPreview);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#import-modal').classList.contains('hidden')) closeImportModal();
    else if (!$('#preview-modal').classList.contains('hidden')) closePreviewModal();
  });

  populateItemDatalist();
  enhanceSelect($('#tournament-type'));
  setupComboboxes();
  await loadPokemonIndex();

  const restored = loadState();
  if (!restored) seedExample();
  render();
});
