/* Pokéwild · a local-first, zero-build Pokémon fan game. */
'use strict';
const APP_VERSION = '1.3.2';
const E = window.PokeEngine;
const A = window.AdventureEngine;
const POKEMON = window.POKEMON_DATA;
const BY_ID = Object.fromEntries(POKEMON.map(p => [p.id, p]));
const LOCAL_ART = new Set(window.LOCAL_ART);
const CHART = window.TYPE_CHART;
const EVOLUTIONS = window.EVOLUTION_DATA || {};
const SAVE_KEY = 'pokewild-save-v1';
const REGIONS = ['All regions', 'Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar & Hisui', 'Paldea'];
const HABITATS = {
  meadow: { name: 'Sunlit Meadow', short: 'Sunlit meadow', tag: 'A gentle beginning', icon: 'leaf', types: ['grass', 'bug', 'normal', 'fairy', 'flying'], display: ['grass', 'bug'], description: 'Little rustles. Lovely discoveries.', sky: 'A breeze through the tall grass' },
  river: { name: 'Ripple River', short: 'Ripple river', tag: 'Go with the flow', icon: 'water', types: ['water', 'ice'], display: ['water', 'ice'], description: 'New friends around every bend.', sky: 'Sunlight dances on the water' },
  volcano: { name: 'Ember Peaks', short: 'Ember peaks', tag: 'A little more daring', icon: 'flame', types: ['fire', 'rock', 'ground', 'steel'], display: ['fire', 'rock'], description: 'A warm welcome to the wild.', sky: 'A warm wind from the mountains' },
  dusk: { name: 'Moonlit Grove', short: 'Moonlit grove', tag: 'A curious mystery', icon: 'moon', types: ['ghost', 'psychic', 'dark', 'poison', 'dragon', 'electric', 'fighting'], display: ['ghost', 'psychic'], description: 'A little magic after sundown.', sky: 'The stars have a story to tell' }
};
const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const number = id => String(id).padStart(4, '0');
const types = p => p.types.map(t => `<span class="type type-${t}">${t}</span>`).join('');
const special = p => p.legendary || p.mythical;
const art = (p, className = '', attrs = '', shiny = null) => {
  const sparkle = shiny ?? Boolean(state.owned.find(friend => friend.id === p.id)?.shiny);
  const painted = !sparkle && LOCAL_ART.has(p.art);
  return `<img class="pokemon-img ${painted ? '' : 'pixel'} ${sparkle ? 'shiny-sprite' : ''} ${className}" src="assets/${sparkle ? 'shiny' : painted ? 'art' : 'sprites'}/${p.art}.png" alt="${sparkle ? 'Shiny ' : ''}${esc(p.name)}" ${attrs} draggable="false">`;
};
const main = $('#main');
const modal = $('#modal');
let loadNotice = '';
let storageAvailable = true;
let state = loadState();
let page = 'explore';
let battle = null;
let toastTimer;
let audioContext;
let filter = { query: '', region: 0, type: '', rarity: '', tab: 'all', page: 0 };
let storageQuery = '';
let pendingSettings = null;

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      try { return E.validateSave(JSON.parse(raw), BY_ID); }
      catch (_) {
        localStorage.setItem('pokewild-unreadable-save-backup', raw);
        loadNotice = 'Your saved adventure could not be read. A backup was kept, and a new team is ready.';
      }
    }
  } catch (_) { storageAvailable = false; }
  return E.freshState(BY_ID);
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); storageAvailable = true; }
  catch (_) { storageAvailable = false; }
  renderChrome();
}
function owned(id) { return state.owned.find(p => p.id === Number(id)); }
function befriended(id) { return state.caught.includes(Number(id)); }
function readyToEvolve(p) { return E.evolutionOptions(p, EVOLUTIONS).some(path => path.ready); }
function rank() { return 1 + Math.floor(state.trainerXP / 70); }
function hpBar(p, cls = '') {
  const max = E.maxHP(BY_ID[p.id], p.level), ratio = p.hp / max;
  return `<div class="hp-track ${ratio <= .25 ? 'critical' : ratio <= .5 ? 'low' : ''} ${cls}" role="meter" aria-label="${esc(BY_ID[p.id].name)} health" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${p.hp}"><span style="width:${ratio * 100}%"></span></div>`;
}
function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200);
}
function sound(kind) {
  if (!state.settings.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const notes = kind === 'catch' ? [392, 494, 587, 784] : kind === 'hit' ? [196, 147] : [440, 554];
    notes.forEach((frequency, i) => {
      const o = audioContext.createOscillator(), g = audioContext.createGain();
      o.type = 'sine'; o.frequency.value = frequency;
      g.gain.setValueAtTime(0, audioContext.currentTime + i * .09);
      g.gain.linearRampToValueAtTime(.045, audioContext.currentTime + i * .09 + .012);
      g.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + i * .09 + .22);
      o.connect(g); g.connect(audioContext.destination); o.start(audioContext.currentTime + i * .09); o.stop(audioContext.currentTime + i * .09 + .24);
    });
  } catch (_) { /* Sound is optional. */ }
}
function openModal(content, label = '') {
  $('#modal-content').innerHTML = content;
  if (label) modal.setAttribute('aria-label', label); else modal.removeAttribute('aria-label');
  if (!modal.open) modal.showModal();
  modal.scrollTop = 0;
  modal.querySelector('.icon-button, button:not(:disabled), input')?.focus({ preventScroll: true });
}
function modalHead(title) { return `<div class="modal-header"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div>`; }
function go(destination) {
  if (modal.open) modal.close();
  if (location.hash === `#${destination}`) route(); else location.hash = destination;
}
function renderChrome() {
  $('#team-count').textContent = state.team.length;
  $('#badge-count').textContent = state.badges.length;
  $('#caught-count').textContent = state.caught.length;
  $('#trainer-rank').textContent = `${AD.titles.find(t => t.id === state.style.title).name} · Level ${rank()}`;
  $('.trainer-profile strong').textContent = state.settings.name;
  document.querySelectorAll('.avatar').forEach(a => a.innerHTML = trainerDrawing());
  const indicator = $('#save-indicator');
  indicator.innerHTML = storageAvailable ? '<i></i>Progress saved' : `${icon('download')}Export to save`;
  indicator.classList.toggle('save-warning', !storageAvailable);
  indicator.title = storageAvailable ? 'Your collection and progress are saved on this browser.' : 'Browser storage is unavailable. Export your adventure in Trainer settings.';
  document.querySelectorAll('[data-page]').forEach(link => {
    const active = link.dataset.page === page || ['quests','camp','wardrobe'].includes(page) && link.dataset.page === 'world' || page === 'tournaments' && link.dataset.page === 'league' || page === 'battle' && link.dataset.page === (battle?.returnTo === 'world' ? 'world' : isTrainerBattle() ? 'league' : 'explore');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  $('#page-label').textContent = ({ explore: 'The adventure starts here', team: 'Better, together', pokedex: 'A world waiting to be discovered', legendary: 'Follow a little wonder', bag: 'Everything for the journey', league: 'A challenge worth growing for', world: 'A world of little discoveries', quests: 'Your next little adventure', camp: 'Good company, happy hearts', wardrobe: 'A little more you', tournaments: 'Three rounds, one great story', battle: isTrainerBattle() ? 'A worthy opponent awaits' : 'A new friend awaits' })[page] || 'The adventure starts here';
}

// Original vector scenery. No remote image or API requests are needed to play.
function tree(x, y, scale, color, kind = 'round') {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-3 0 0-104 4 0Z" fill="#728563"/>${kind === 'pine' ? `<path d="m0-155-37 61h17l-32 45h22L-58-4H58L28-49h22L19-94h18Z" fill="${color}"/><path d="m0-147 3 136 35 5Z" fill="#ffffff09"/>` : `<path d="M0-126c-21-6-39 6-38 25-27 9-28 34-15 51-16 24 2 50 26 42 20 21 46 11 49-1 30 9 43-17 30-35 14-27-3-40-18-40 2-20-10-40-34-42Z" fill="${color}"/><path d="m0-12 3-92m-2 53-24-23M1-39l22-21" stroke="#ffffff18" stroke-width="1.5" fill="none"/>`}</g>`;
}
function landscape(kind = 'meadow', className = 'landscape') {
  if (kind === 'river') return `<svg class="${className}" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="800" height="400" fill="#e3eef0"/><circle cx="570" cy="77" r="32" fill="#f8f7df"/><path d="M0 186Q160 90 335 163T800 105V400H0Z" fill="#c7d7c5"/><path d="M0 245Q145 165 385 209T800 196V400H0Z" fill="#adc5ab"/><path d="M800 199Q514 198 514 243T297 302 100 400H690Q565 323 673 284T800 256" fill="#a1c7cc"/><path d="M800 222Q560 209 555 247T385 310" fill="none" stroke="#d3e7e4" stroke-width="4"/><path d="M660 280h44m-333 62h87m-162 39h60m372-132h20" stroke="#e7f2e8" stroke-width="3" stroke-linecap="round"/>${tree(90,260,1.5,'#83a890')}${tree(162,235,.9,'#8eae93')}${tree(754,275,1.3,'#7d9e7e')}<path d="M0 355Q123 314 242 364L200 400H0Z" fill="#8fab83"/><path d="M720 337q34-40 56-8l24 71H663Z" fill="#8ca67b"/><g fill="#ebf0d7"><circle cx="142" cy="356" r="3"/><circle cx="175" cy="371" r="2"/><circle cx="729" cy="358" r="3"/></g></svg>`;
  if (kind === 'volcano') return `<svg class="${className}" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="800" height="400" fill="#f3e7d8"/><circle cx="597" cy="83" r="36" fill="#f5dba7"/><path d="m18 326 173-207 133 162 142-154 194 201Z" fill="#d9c3ab"/><path d="m269 324 221-272 270 272Z" fill="#c4a691"/><path d="m426 129 64-77 77 80-45-13-29 18-28-18Z" fill="#f3e7d3"/><path d="m490 52 102 271H384Z" fill="#b993801c"/><path d="M0 330Q197 267 397 314T800 265V400H0Z" fill="#c6b794"/><path d="M0 370Q159 329 327 378T800 322V400H0Z" fill="#a9ad85"/>${tree(99,337,.75,'#8e9d78','pine')}${tree(182,308,.55,'#9ba482','pine')}${tree(728,327,.9,'#8e9d78','pine')}<g fill="#b4a28b"><path d="m290 357 21-23 25 30Z"/><path d="m573 357 30-27 26 29Z"/></g><path d="m338 400 100-59 33 8-57 51Z" fill="#dfc5a0"/></svg>`;
  if (kind === 'dusk') return `<svg class="${className}" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="800" height="400" fill="#dcdfe9"/><circle cx="562" cy="74" r="31" fill="#f7f4d8"/><circle cx="574" cy="66" r="28" fill="#dcdfe9"/><path d="M0 228Q173 129 380 204T800 142V400H0Z" fill="#b7c1ca"/><path d="M0 288Q202 218 446 271T800 226V400H0Z" fill="#94a99f"/>${tree(105,294,1.6,'#7b9890','pine')}${tree(202,260,1.1,'#8da49a','pine')}${tree(728,295,1.8,'#7b9290','pine')}${tree(640,252,.9,'#8b9e98','pine')}<path d="M0 380Q214 302 486 361T800 320V400H0Z" fill="#869e8f"/><path d="M402 400Q509 349 457 312T520 257Q428 279 423 310T280 400Z" fill="#bdc1a7"/><g fill="#fffee4"><circle cx="281" cy="91" r="2"/><circle cx="381" cy="48" r="2.5"/><circle cx="636" cy="125" r="2"/><circle cx="440" cy="185" r="2"/><circle cx="680" cy="71" r="1.5"/><circle cx="95" cy="53" r="2"/></g></svg>`;
  return `<svg class="${className}" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="800" height="400" fill="#e8efdc"/><circle cx="584" cy="74" r="34" fill="#f6f3cd"/><path d="M259 161Q395 57 498 142T800 83V400H0V229Z" fill="#d9e3c7"/><path d="M150 235Q331 127 494 188T800 150V400H0Z" fill="#c3d5ab"/>${tree(454,222,.55,'#b0c49b','pine')}${tree(516,211,.65,'#b5c69c')}${tree(594,208,.46,'#b3c8a0','pine')}${tree(308,248,.8,'#adc79f','pine')}<path d="M0 310Q196 184 397 253T800 227V400H0Z" fill="#b8cf9b"/><path d="M315 400Q584 325 510 289T581 215Q477 242 473 278T202 400Z" fill="#e4dcb0"/><path d="M346 400Q592 325 514 287T581 215" fill="none" stroke="#ece5c3" stroke-width="6" opacity=".8"/>${tree(685,245,1.23,'#97b783','pine')}${tree(759,310,1.95,'#85a779')}${tree(812,276,1.3,'#769a6d','pine')}${tree(56,272,1.5,'#acc399')}${tree(362,245,.72,'#a5bf8f')}<path d="M0 360Q111 311 229 355L185 400H0Z" fill="#a8c38b"/><path d="M521 400Q697 315 800 351V400Z" fill="#98b980"/><g fill="none" stroke="#78995f" stroke-width="1.8" opacity=".5"><path d="m457 332-4-8m4 8 3-10m186 15-3-9m3 9 5-11m63 39-2-9m2 9 5-7m-92 36-4-9m4 9 3-6m-215-50-3-8m3 8 3-10"/></g><g fill="#f3efd1"><circle cx="601" cy="345" r="2.2"/><circle cx="663" cy="362" r="2.4"/><circle cx="712" cy="341" r="2.1"/><circle cx="410" cy="329" r="2"/><circle cx="363" cy="365" r="2.4"/></g><g fill="#dfe7b5"><ellipse cx="657" cy="382" rx="8" ry="3" transform="rotate(-20 657 382)"/><ellipse cx="622" cy="349" rx="6" ry="2.3" transform="rotate(20 622 349)"/></g></svg>`;
}
function regionSelect() {
  return `<label class="region-select">${icon('pin')}<select id="explore-region" aria-label="Exploration region">${REGIONS.map((r, i) => `<option value="${i}" ${state.region === i ? 'selected' : ''}>${esc(r)}${i && i !== 8 ? ' region' : ''}</option>`).join('')}</select></label>`;
}
function teamWidget() {
  return `<section class="team-widget"><div class="widget-heading"><h2>Your travel buddies</h2><span>${state.team.length} / 6</span></div><p class="widget-subtitle">A great adventure needs good company.</p>${state.team.map(id => {
    const p = owned(id), species = BY_ID[id];
    return `<div class="mini-member"><div class="mini-art">${art(species)}${state.lead === id ? '<span class="partner-dot" title="Your partner"></span>' : ''}</div><div class="mini-info"><div class="mini-name"><strong>${esc(species.name)}</strong><small>Lv. ${p.level}</small></div><div class="types">${types(species)}</div>${hpBar(p)}${readyToEvolve(p) ? evolutionSummary(p, true) : ''}</div></div>`;
  }).join('')}${state.team.length < 6 ? `<div class="empty-slots">${Array.from({ length: 6 - state.team.length }, () => `<button class="empty-slot" data-action="open-dex" aria-label="Find a new team member">${icon('plus')}</button>`).join('')}</div>` : ''}<div class="widget-actions"><button class="text-link" data-action="heal">${icon('heart')}Heal team · free</button><a class="text-link" href="#team">Manage team ${icon('arrow')}</a></div></section>`;
}
function renderExplore() {
  const location = HABITATS[state.location];
  main.innerHTML = `<div class="page-heading"><div><h1>A little curiosity. A wild adventure.</h1><p>Your next friend is just around the corner. Let’s go find them.</p></div>${regionSelect()}</div>
    <section class="world-invitation"><div class="world-invitation-avatar">${trainerDrawing()}</div><div><span class="eyebrow">YOUR WORLD IS GROWING</span><h2>A town to call home. Three paths to discover.</h2><p>Walk the trails, follow five little quests, and meet a shiny new friend.</p></div><a class="btn small" href="#world">Visit Clover Town ${icon('arrow')}</a></section>
    <div class="dashboard-grid"><div class="main-column">
      <section class="hero">${landscape(state.location)}<div class="hero-copy"><div class="eyebrow">${icon('sun')}${state.region ? REGIONS[state.region].toUpperCase() + ' · ' : ''}THE GREAT OUTDOORS</div><h2>Something wild<br>is waiting.</h2><p>Wander a little. Make a new friend.<br>There’s a whole world to discover.</p><button class="btn" data-action="explore">Explore the wild ${icon('arrow')}</button><span class="hero-footnote">${icon('shield')}Go at your own pace. Adventure is for everyone.</span></div><span class="location-marker">${icon('pin')}${esc(location.name)}</span>${art(BY_ID[25], 'hero-pokemon hero-pikachu', 'fetchpriority="high"')}${art(BY_ID[1], 'hero-pokemon hero-bulbasaur', 'fetchpriority="high"')}${art(BY_ID[12], 'hero-pokemon hero-butterfree')}<span class="floating-spark">✧</span></section>
      <div class="section-heading"><h2>Where to?</h2><p>A new path. A new possibility.</p></div>
      <div class="habitat-grid">${['meadow', 'river', 'volcano'].map(key => { const h = HABITATS[key]; return `<button class="habitat-card" data-action="habitat" data-habitat="${key}"><div class="habitat-art">${landscape(key, '')}<span class="habitat-badge">${icon(h.icon)}${h.tag.toUpperCase()}</span></div><div class="habitat-body"><h3>${h.name} ${icon('arrow')}</h3><p>${h.description}</p><div class="habitat-types">${h.display.map(t => `<span class="type type-${t}">${t}</span>`).join('')}</div></div></button>`; }).join('')}</div>
      <div class="progress-card"><span class="progress-icon">${icon('book')}</span><div class="progress-copy"><h3>A friendship for every page.</h3><p>Your Pokédex is a story you get to write.</p></div><div class="progress-numbers"><strong>${state.caught.length}</strong><small> / ${POKEMON.length.toLocaleString()}</small><div class="hp-track"><span style="width:${Math.max(3, state.caught.length / POKEMON.length * 100)}%"></span></div></div><button class="text-link" data-action="open-dex" aria-label="Open Pokédex">${icon('chevron')}</button></div>
    </div><div class="right-column">${teamWidget()}<section class="legendary-teaser"><div class="eyebrow">${icon('sparkles')}FOR THE WONDER SEEKERS</div><h3>Some stories<br>are legendary.</h3><p>Extraordinary Pokémon.<br>An adventure worth the journey.</p><a class="text-link" href="#legendary">Follow the legendary trail ${icon('arrow')}</a>${art(BY_ID[151])}</section><div class="tip-card">${icon('leaf')}<div><strong>A LITTLE FIELD NOTE</strong><p>A gentle tap, then a Poké Ball. Lower HP makes a new friendship more likely.</p></div></div></div></div>`;
}
function collectionCard(p, mode = 'dex') {
  const has = owned(p.id), inTeam = state.team.includes(p.id), recorded = befriended(p.id);
  const body = `<div class="card-id"><span>#${number(p.id)}</span>${recorded ? `<span class="caught-mark">${icon('check')}${has ? 'Caught' : 'Recorded'}</span>` : special(p) ? `<span class="rarity-tag">${icon('sparkles')}${p.mythical ? 'Mythical' : 'Legendary'}</span>` : ''}</div>${art(p, '', 'loading="lazy"')}<h3>${esc(p.name)}</h3>${shinyLabel(has)}<div class="types">${types(p)}</div>`;
  if (mode === 'storage') return `<article class="pokemon-card">${body}<div class="card-hint"><span>Level ${has.level}</span><span>${inTeam ? 'On your team' : 'Resting at camp'}</span></div><div class="collection-card-actions">${inTeam ? `<button class="btn secondary small" data-action="detail" data-id="${p.id}">Meet ${esc(p.name)}</button>` : `<button class="btn secondary small" data-action="add-team" data-id="${p.id}">${icon('plus')}Add to team</button>`}</div>${evolutionSummary(has, true)}</article>`;
  return `<button class="pokemon-card" data-action="detail" data-id="${p.id}" aria-label="View ${esc(p.name)}${has ? ', caught' : ''}">${body}<span class="card-hint"><span>${REGIONS[p.gen]}</span><span>${has ? 'Say hello' : 'Find in the wild'} ${icon('arrow')}</span></span></button>`;
}
function dexFilters(isLegendary) {
  const allTypes = [...new Set(POKEMON.flatMap(p => p.types))].sort();
  return `<div class="toolbar"><label class="searchbox">${icon('search')}<input id="dex-search" type="search" placeholder="Find a Pokémon by name or number…" aria-label="Search Pokémon by name or number" value="${esc(filter.query)}" autocomplete="off"></label><select id="dex-region" class="filter-select" aria-label="Filter Pokémon by region">${REGIONS.map((r, i) => `<option value="${i}" ${filter.region === i ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select><select id="dex-type" class="filter-select" aria-label="Filter Pokémon by type"><option value="">All types</option>${allTypes.map(t => `<option value="${t}" ${filter.type === t ? 'selected' : ''}>${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}</select><select id="dex-rarity" class="filter-select" aria-label="Filter Pokémon by rarity"><option value="">${isLegendary ? 'Legendary & mythical' : 'All Pokémon'}</option>${!isLegendary ? `<option value="regular" ${filter.rarity === 'regular' ? 'selected' : ''}>Regular Pokémon</option>` : ''}<option value="legendary" ${filter.rarity === 'legendary' ? 'selected' : ''}>Legendary</option><option value="mythical" ${filter.rarity === 'mythical' ? 'selected' : ''}>Mythical</option></select></div>`;
}
function normalized(value) { return String(value).toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9♀♂]/g, ''); }
function filteredPokemon() {
  const query = normalized(filter.query), queryNumber = Number(filter.query.trim().replace(/^#/, ''));
  return POKEMON.filter(p => {
    if (page === 'legendary' && !special(p)) return false;
    if (query && !normalized(p.name).includes(query) && p.id !== queryNumber) return false;
    if (filter.region && filter.region !== p.gen) return false;
    if (filter.type && !p.types.includes(filter.type)) return false;
    if (filter.rarity === 'regular' && special(p)) return false;
    if (filter.rarity === 'legendary' && !p.legendary) return false;
    if (filter.rarity === 'mythical' && !p.mythical) return false;
    if (filter.tab === 'caught' && !befriended(p.id)) return false;
    if (filter.tab === 'unseen' && state.seen.includes(p.id)) return false;
    if (filter.tab === 'shiny' && !owned(p.id)?.shiny) return false;
    return true;
  });
}
function renderDexResults() {
  const results = filteredPokemon(), perPage = 30, pages = Math.ceil(results.length / perPage);
  filter.page = E.clamp(filter.page, 0, Math.max(0, pages - 1));
  const start = filter.page * perPage;
  $('#dex-results').innerHTML = `<div class="results-line"><span>${results.length.toLocaleString()} Pokémon ${filter.query ? 'found' : 'to discover'}</span><span>${results.length ? `${start + 1}–${Math.min(start + perPage, results.length)} of ${results.length.toLocaleString()}` : 'Try a different trail'}</span></div>${results.length ? `<div class="pokemon-grid">${results.slice(start, start + perPage).map(p => collectionCard(p)).join('')}</div>` : `<div class="empty-state">${icon('search')}<h3>A different path, perhaps?</h3><p>No Pokémon match these filters.<br>Try another name, region, or type.</p><button class="btn secondary small" style="margin-top:20px" data-action="clear-filters">Clear filters</button></div>`}${pages > 1 ? `<div class="pagination"><button class="btn secondary small" data-action="dex-prev" ${filter.page === 0 ? 'disabled' : ''}>← Previous</button><span>Page ${filter.page + 1} of ${pages}</span><button class="btn secondary small" data-action="dex-next" ${filter.page >= pages - 1 ? 'disabled' : ''}>Next →</button></div>` : ''}`;
}
function renderDex() {
  const isLegendary = page === 'legendary';
  main.innerHTML = `<div class="page-heading"><div><h1>${isLegendary ? 'Some stories are legendary.' : 'A world of new friends.'}</h1><p>${isLegendary ? 'Meet the rarest Pokémon. Make a little history together.' : 'All 1,025 Pokémon. Every region. A friendship waiting on every page.'}</p></div>${isLegendary ? `<span class="rarity-tag">${icon('sparkles')}94 extraordinary Pokémon</span>` : `<button class="btn secondary small" data-action="help">${icon('book')}Field guide</button>`}</div>${isLegendary ? `<section class="legendary-header"><div class="eyebrow">THE LEGENDARY TRAIL</div><h2>A little bravery.<br>A whole lot of wonder.</h2><p>Bring a healthy team and a few Great Balls. These rare friends are stronger and harder to catch. Level 12+ is a good place to start.</p>${art(BY_ID[249])}</section>` : ''}<div class="collection-tabs" role="tablist" aria-label="Pokédex collection"><button role="tab" aria-selected="${filter.tab === 'all'}" class="collection-tab ${filter.tab === 'all' ? 'active' : ''}" data-action="dex-tab" data-tab="all">All Pokémon<span>${isLegendary ? 94 : POKEMON.length.toLocaleString()}</span></button><button role="tab" aria-selected="${filter.tab === 'caught'}" class="collection-tab ${filter.tab === 'caught' ? 'active' : ''}" data-action="dex-tab" data-tab="caught">Befriended<span>${state.caught.filter(id => !isLegendary || special(BY_ID[id])).length}</span></button><button role="tab" aria-selected="${filter.tab === 'unseen'}" class="collection-tab ${filter.tab === 'unseen' ? 'active' : ''}" data-action="dex-tab" data-tab="unseen">Still to meet</button><button role="tab" aria-selected="${filter.tab === 'shiny'}" class="collection-tab ${filter.tab === 'shiny' ? 'active' : ''}" data-action="dex-tab" data-tab="shiny">${icon('sparkles')}Shiny friends<span>${state.owned.filter(p => p.shiny && (!isLegendary || special(BY_ID[p.id]))).length}</span></button></div>${dexFilters(isLegendary)}<div id="dex-results" aria-live="polite"></div>`;
  renderDexResults();
}
function renderTeam() {
  main.innerHTML = `<div class="page-heading"><div><h1>Better, together.</h1><p>Choose your partner. Build your team. Make the journey your own.</p></div><button class="btn secondary" data-action="heal">${icon('heart')}Heal team · free</button></div><div class="info-banner">${icon('team')}<span>Your partner starts each battle. Take up to six Pokémon with you, and swap with anyone at camp whenever you like.</span></div>${evolutionNotice(state.team)}<div class="team-grid">${state.team.map(id => {
    const p = owned(id), species = BY_ID[id], lead = state.lead === id;
    return `<article class="team-card ${lead ? 'is-partner' : ''}"><div class="team-card-top"><span class="level">LEVEL ${p.level}</span>${lead ? `<span class="partner-label">${icon('star')}YOUR PARTNER</span>` : `<span class="card-id">#${number(id)}</span>`}</div><div class="team-card-art">${art(species)}</div><h3>${esc(species.name)}</h3><div class="types">${types(species)}</div><div class="health-label"><span>${p.hp === 0 ? 'Ready for a rest' : 'Ready for adventure'}</span><strong>${p.hp} / ${E.maxHP(species, p.level)} HP</strong></div>${hpBar(p)}<div class="xp-label"><span>${p.level === 100 ? 'Maximum level' : 'Next level'}</span><span>${p.level === 100 ? '100' : `${p.xp} / ${E.nextXP(p.level)} XP`}</span></div><div class="xp-track"><span style="width:${p.level === 100 ? 100 : p.xp / E.nextXP(p.level) * 100}%"></span></div>${evolutionSummary(p)}${shinyLabel(p)}<div class="team-extra-actions"><button class="text-link" data-action="move-picker" data-id="${id}">${icon('swords')}Choose moves</button><button class="text-link" data-action="camp-open" data-id="${id}">${icon('heart')}Buddy camp · ${p.friendship||0}</button></div><div class="team-card-actions"><button class="btn ${lead ? 'ghost' : 'secondary'} small" data-action="partner" data-id="${id}" ${lead ? 'disabled' : ''}>${icon(lead ? 'check' : 'star')}${lead ? 'Your partner' : 'Make partner'}</button><button class="remove-button" data-action="remove-team" data-id="${id}" ${state.team.length < 2 ? 'disabled' : ''}>To camp</button></div></article>`;
  }).join('')}${Array.from({ length: 6 - state.team.length }, (_, i) => `<button class="team-empty" data-action="open-dex"><span>${icon('plus')}<h3>A friend you haven’t met.</h3><p>Team spot ${state.team.length + i + 1} · Find a Pokémon</p></span></button>`).join('')}</div><section class="storage-section"><div class="section-heading"><div><h2>Back at camp</h2></div><span class="widget-subtitle">${state.owned.length} Pokémon in your collection</span></div><label class="searchbox">${icon('search')}<input id="storage-search" type="search" placeholder="Find a friend in your collection…" aria-label="Search your caught Pokémon" value="${esc(storageQuery)}"></label><div id="storage-results" style="margin-top:18px"></div></section>`;
  renderStorage();
}
function renderStorage() {
  const result = state.owned.filter(p => normalized(BY_ID[p.id].name).includes(normalized(storageQuery)));
  $('#storage-results').innerHTML = result.length ? `<div class="pokemon-grid">${result.map(p => collectionCard(BY_ID[p.id], 'storage')).join('')}</div>` : `<div class="empty-state"><h3>No friends by that name yet.</h3><p>Your next encounter could change that.</p></div>`;
}
function renderBag() {
  const loot = [
    { key:'ultraBalls', name:'Ultra Balls', art:'<span class="pokeball ultra-ball"></span>', description:'Your best ball for a rare friend. Raises the base catch chance by 75%, up to the game’s catch limit.', note:'Choose during a wild encounter' },
    { key:'superPotions', name:'Super Potions', art:'<span class="potion-art super-potion-art"></span>', description:'A big boost during a long match. Restores a Pokémon to full HP and uses one turn.', note:'Choose with the healing-item selector in battle' },
    { key:'revives', name:'Revives', art:'<span class="revive-art"></span>', description:'Bring a fainted teammate back with half their HP. Uses one turn while another teammate is fighting.', note:'Choose Revive in battle' },
    { key:'rareCandies', name:'Rare Candies', art:'<span class="candy-art">✦</span>', description:'Give a travel buddy one level, keeping their current XP. It might be time for an evolution!', note:'Give from your backpack between battles' }
  ];
  main.innerHTML = `<div class="page-heading"><div><h1>A little preparation. A lot of possibility.</h1><p>Everyday essentials from camp. Extra rewards from your biggest adventures.</p></div></div><div class="item-grid"><article class="item-card"><div class="item-art"><span class="pokeball"></span></div><h3>Poké Balls<span>∞</span></h3><p>A new friendship, waiting to happen. Lower a wild Pokémon’s HP, then throw one in battle.</p><small>Always in your bag · Never run out</small></article><article class="item-card"><div class="item-art"><span class="pokeball great-ball"></span></div><h3>Great Balls<span>×${state.greatBalls}</span></h3><p>A little extra help for a rare friend. Improves your catching chance by 35% before the catch limit.</p><small>Restock to 5 for free · Choose during battle</small></article><article class="item-card"><div class="item-art"><span class="potion-art"></span></div><h3>Potions<span>×${state.potions}</span></h3><p>A boost when your buddy needs it. Restores 60% of maximum HP and uses one battle turn.</p><small>Restock to 8 for free · Use during battle</small></article></div><div class="section-heading"><h2>Good things from great battles.</h2><a class="text-link" href="#league">Earn more loot ${icon('arrow')}</a></div><div class="loot-inventory-grid">${loot.map(item=>`<article class="item-card loot-item-card"><div class="item-art">${item.art}</div><h3>${item.name}<span>×${state[item.key]}</span></h3><p>${item.description}</p><small>${item.note}</small>${item.key === 'rareCandies' ? `<button class="btn secondary small" data-action="candy-picker" ${!state.rareCandies || !state.team.some(id=>owned(id).level<100) ? 'disabled' : ''}>${icon('sparkles')}Give a Rare Candy</button>` : ''}</article>`).join('')}</div><section class="healing-station">${icon('heart')}<div><h3>A cozy stop at camp.</h3><p>Heal every Pokémon and refill Potions and Great Balls for free. Special items are earned in trainer and gym battles.</p></div><button class="btn" data-action="heal">Heal & restock ${icon('sparkles')}</button></section><div class="section-heading"><h2>Every step counts.</h2></div><div class="item-grid"><article class="item-card"><h3>${state.trainerWins + state.gymWins}<span>${icon('swords')}</span></h3><p>League victories. ${state.trainerWins} trainer wins and ${state.gymWins} gym wins.</p></article><article class="item-card"><h3>${state.badges.length} / 8<span>${icon('trophy')}</span></h3><p>Gym badges. A collection of challenges your team has overcome.</p></article><article class="item-card"><h3>Level ${rank()}<span>${icon('compass')}</span></h3><p>Your Explorer level. ${state.wins} wild battles won and ${state.captures} successful catches.</p></article></div>`;
}

function render() {
  renderChrome();
  if (page === 'explore') renderExplore();
  else if (page === 'team') renderTeam();
  else if (page === 'pokedex' || page === 'legendary') renderDex();
  else if (page === 'bag') renderBag();
  else if (page === 'league') renderLeague();
  else if (page === 'world') renderWorld();
  else if (page === 'quests') renderQuests();
  else if (page === 'camp') renderCamp();
  else if (page === 'wardrobe') renderWardrobe();
  else if (page === 'tournaments') renderTournaments();
  else if (page === 'battle' && battle) renderBattle();
}
function route() {
  worldWalkToken++;
  const destination = location.hash.slice(1);
  if (destination === 'battle' && battle) { page = 'battle'; }
  else {
    if (battle && !battle.done) toast('You headed back safely. Heal at camp before your next adventure.');
    battle = null;
    const previous = page;
    page = ['explore', 'team', 'pokedex', 'legendary', 'bag', 'league', 'world', 'quests', 'camp', 'wardrobe', 'tournaments'].includes(destination) ? destination : 'explore';
    if (page !== previous && ['pokedex', 'legendary'].includes(page)) filter = { query: '', region: 0, type: '', rarity: '', tab: 'all', page: 0 };
    if (!['explore', 'team', 'pokedex', 'legendary', 'bag', 'league', 'world', 'quests', 'camp', 'wardrobe', 'tournaments'].includes(destination)) history.replaceState(null, '', '#explore');
  }
  if (modal.open) modal.close();
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function evolutionSummary(p, compact = false) {
  const options = E.evolutionOptions(p, EVOLUTIONS);
  if (!options.length) return compact ? '' : `<div class="evolution-final">${icon('check')}No further evolution</div>`;
  const ready = options.some(path => path.ready);
  const next = [...options].sort((a, b) => a.level - b.level)[0];
  if (compact) return `<button class="text-link evolution-link ${ready ? 'ready' : ''}" data-action="evolution-options" data-id="${p.id}">${icon('sparkles')}${ready ? 'Ready to evolve' : 'Evolution paths'}</button>`;
  return `<button class="evolution-strip ${ready ? 'ready' : ''}" data-action="evolution-options" data-id="${p.id}">${icon('sparkles')}<span><strong>${ready ? 'Ready to evolve!' : 'Your next chapter'}</strong><small>${options.length > 1 ? `${options.length} forms to choose from` : esc(BY_ID[next.to].name)} · Level ${next.level}${ready ? '' : ` · ${next.remaining} to go`}</small></span>${icon('chevron')}</button>`;
}
function evolutionPreview(id) {
  const paths = EVOLUTIONS[id] || [];
  if (!paths.length) return '';
  const next = [...paths].sort((a, b) => a.level - b.level)[0];
  return `<div class="evolution-preview"><div><strong>${paths.length > 1 ? `${paths.length} possible evolutions` : `Evolves into ${esc(BY_ID[next.to].name)}`}</strong><small>${paths.length > 1 ? 'Choices start at' : 'Ready at'} level ${next.level}${paths.some(path => path.special) ? ' · Pokéwild level goal' : ''}</small></div><button class="text-link" data-action="evolution-options" data-id="${id}">See paths ${icon('arrow')}</button></div>`;
}
function evolutionNotice(ids) {
  const ready = [...new Set(ids)].filter(id => readyToEvolve(owned(id)));
  if (!ready.length) return '';
  return `<section class="evolution-notice" aria-label="Pokémon ready to evolve"><div class="evolution-notice-title">${icon('sparkles')}<div><h3>A new chapter is ready!</h3><p>${ready.length === 1 ? `${esc(BY_ID[ready[0]].name)} is` : 'Your buddies are'} ready to evolve. You choose when.</p></div></div><div class="evolution-ready-list">${ready.map(id => `<button class="btn small" data-action="evolution-options" data-id="${id}">Evolve ${esc(BY_ID[id].name)} ${icon('arrow')}</button>`).join('')}</div></section>`;
}
function showEvolutionOptions(id) {
  if (battle && !battle.done) { toast('Finish your battle first. Evolution can wait until everyone is safe.'); return; }
  const species = BY_ID[id], friend = owned(id);
  if (!species) return;
  const options = E.evolutionOptions(friend || { id, level: 0 }, EVOLUTIONS);
  if (!options.length) { toast(`${species.name} has no further evolution.`); return; }
  openModal(`<div class="modal-body">${modalHead('Growing together.')}<div class="evolution-source">${art(species)}<div><span class="eyebrow">${friend ? 'YOUR NEXT CHAPTER' : 'AN ADVENTURE TO GROW INTO'}</span><h3>${esc(species.name)}</h3><p>${friend ? `Level ${friend.level} · ${friend.xp} XP toward the next level` : 'Catch this Pokémon to start its evolution journey.'}</p></div></div><p class="modal-description">${options.length > 1 ? 'Choose the next form you like best. ' : ''}Evolution changes your Pokémon’s look, stats, and moves. Their level and experience stay with them.</p><div class="evolution-choices ${options.length === 1 ? 'single' : ''}">${options.map(path => {
    const target = BY_ID[path.to], existing = owned(path.to);
    return `<article class="evolution-choice ${path.ready ? 'ready' : ''}"><div class="evolution-choice-art">${art(target, '', '', Boolean(friend?.shiny || existing?.shiny))}</div><h3>${esc(target.name)}</h3><div class="types">${types(target)}</div><p class="evolution-requirement">${icon(path.ready ? 'check' : 'star')}Level ${path.level}${path.ready ? ' · Ready!' : friend ? ` · ${path.remaining} more to go` : ''}</p>${existing ? `<p class="evolution-existing">You already have ${esc(target.name)}. Your two entries will become one, keeping the higher level, XP at that level, and best health. Both species stay recorded in your Pokédex.</p>` : ''}<button class="btn ${path.ready ? '' : 'secondary'} small" data-action="evolve" data-from="${id}" data-to="${path.to}" ${!friend || !path.ready ? 'disabled' : ''}>${icon('sparkles')}${!friend ? `Catch ${esc(species.name)} first` : path.ready ? `Evolve into ${esc(target.name)}` : `Unlocks at level ${path.level}`}</button></article>`;
  }).join('')}</div>${options.some(path => path.special) ? `<p class="evolution-rule-note">${icon('leaf')}In Pokéwild, stones, friendship, trading, regional forms, and other special conditions use simple level goals. You never need an item or another player.</p>` : ''}<p class="modal-description evolution-record-note">Earlier forms stay recorded in your Pokédex. You can catch them again if you’d like one on your team.</p><div class="modal-actions"><button class="btn secondary" data-action="close-modal">${friend ? 'Maybe later' : 'Back to the adventure'}</button></div></div>`);
}
function evolve(id, target) {
  if (battle && !battle.done) return;
  const wasShiny = Boolean(owned(id)?.shiny);
  const result = E.evolvePokemon(state, id, target, BY_ID, EVOLUTIONS);
  if (!result) { toast('This Pokémon isn’t ready for that evolution yet.'); return; }
  if (battle?.active === id) battle.active = target;
  if (campBuddy === id) campBuddy = target;
  save(); render(); sound('catch');
  const next = E.evolutionOptions(owned(target), EVOLUTIONS);
  openModal(`<div class="modal-body"><div class="modal-header"><span class="eyebrow evolution-eyebrow">A LITTLE GROWTH. A BIG MOMENT.</span><button class="icon-button" data-action="close-modal" aria-label="Close evolution celebration">${icon('close')}</button></div><div class="evolution-celebration"><div class="evolution-transformation"><div class="evolution-before">${art(BY_ID[id], '', '', wasShiny)}<span>${esc(BY_ID[id].name)}</span></div>${icon('arrow')}<div class="evolution-after">${art(BY_ID[target])}<span class="evolution-spark">✧</span></div></div><p class="eyebrow">${esc(BY_ID[id].name)} EVOLVED!</p><h2 id="modal-title">Hello, ${esc(BY_ID[target].name)}!</h2><div class="types">${types(BY_ID[target])}</div><p class="modal-description">A new form, the same good friend. ${esc(BY_ID[target].name)} is level ${result.level}, with updated stats and moves.</p><div class="reward-chips"><span>Level & experience kept</span><span>Pokédex updated</span>${state.lead === target ? '<span>Still your partner</span>' : ''}</div>${next.length ? evolutionSummary(owned(target)) : '<p class="evolution-final">This is their final evolution. What a journey!</p>'}</div><div class="modal-actions"><button class="btn secondary" data-action="result-team">My team</button><button class="btn" data-action="leave-battle">${isTrainerBattle() ? 'Battle league' : 'Keep exploring'} ${icon('arrow')}</button></div></div>`);
}

function detail(id) {
  const p = BY_ID[id];
  if (!p) return;
  const friend = owned(id);
  openModal(`<div class="modal-body"><div class="modal-header"><span class="detail-number">${esc(REGIONS[p.gen])} · #${number(id)}</span><button class="icon-button" data-action="close-modal" aria-label="Close Pokémon details">${icon('close')}</button></div><div class="detail-art">${art(p)}</div><div class="detail-top">${special(p) ? `<span class="rarity-tag">${icon('sparkles')}${p.mythical ? 'Mythical' : 'Legendary'} Pokémon</span>` : ''}<h2 id="modal-title">${esc(p.name)}</h2><div class="types">${types(p)}</div></div><div class="detail-stats"><div class="detail-stat"><strong>${p.stats[0]}</strong><span>Base HP</span></div><div class="detail-stat"><strong>${p.stats[1]}</strong><span>Attack</span></div><div class="detail-stat"><strong>${p.stats[2]}</strong><span>Defense</span></div></div>${evolutionPreview(id)}<p class="modal-description">${friend ? `${esc(p.name)} is already your friend, at level ${friend.level}. ${state.team.includes(id) ? 'They’re on your travel team.' : 'They’re resting at camp, ready for the next adventure.'} You can still meet another in the wild for experience.` : special(p) ? `A rare meeting with an extraordinary Pokémon. ${esc(p.name)} will be at least level 12. Bring a healthy team, weaken them gently, and try a Great Ball.` : `Ready to meet ${esc(p.name)}? Their level will be close to your partner’s. Battle to lower their HP, then throw a Poké Ball to make a new friend.`}</p><div class="modal-actions">${friend && !state.team.includes(id) ? `<button class="btn secondary" data-action="add-team" data-id="${id}">${icon('plus')}Add to team</button>` : ''}<button class="btn ${special(p) ? 'gold' : ''}" data-action="encounter" data-id="${id}">${icon(special(p) ? 'sparkles' : 'compass')}${special(p) ? 'Meet in the wild' : 'Find in the wild'}</button></div></div>`);
}
function healAll(silent = false) {
  if (battle && !battle.done) return;
  state.owned.forEach(p => p.hp = E.maxHP(BY_ID[p.id], p.level));
  state.potions = Math.max(8, state.potions);
  state.greatBalls = Math.max(5, state.greatBalls);
  save();
  if (!silent) { sound('heal'); render(); toast('All rested! Your Pokémon are healed and your supplies are refilled.'); }
}
function makePartner(id) {
  if (!state.team.includes(id)) return;
  state.lead = id; save(); renderTeam();
  toast(`${BY_ID[id].name} will lead the way in your next battle.`);
}
function addToTeam(id) {
  if (!owned(id) || state.team.includes(id)) return;
  if (state.team.length < 6) {
    state.team.push(id); save(); if (modal.open) modal.close(); render();
    toast(`${BY_ID[id].name} is ready to travel with you!`);
  } else {
    openModal(`<div class="modal-body">${modalHead('A little team shuffle.')}<p class="modal-description" style="margin-bottom:20px">Choose who will rest at camp while ${esc(BY_ID[id].name)} joins you. Everyone stays in your collection.</p><div class="switch-list">${state.team.map(member => { const p = owned(member); return `<button class="switch-option" data-action="replace-team" data-id="${id}" data-replace="${member}">${art(BY_ID[member])}<div><strong>${esc(BY_ID[member].name)}</strong><small>Level ${p.level}${state.lead === member ? ' · Your current partner' : ''}</small>${hpBar(p)}</div>${icon('arrow')}</button>`; }).join('')}</div></div>`);
  }
}
function replaceTeam(id, replacement) {
  const index = state.team.indexOf(replacement);
  if (index < 0 || state.team.includes(id) || !owned(id)) return;
  state.team[index] = id;
  if (state.lead === replacement) state.lead = id;
  save(); modal.close(); render();
  toast(`${BY_ID[id].name} joined your team. ${BY_ID[replacement].name} is cozy at camp.`);
}
function removeFromTeam(id) {
  if (state.team.length < 2 || !state.team.includes(id)) return;
  state.team = state.team.filter(member => member !== id);
  if (state.lead === id) state.lead = state.team[0];
  save(); renderTeam(); toast(`${BY_ID[id].name} is resting at camp. You can bring them back anytime.`);
}
function showHelp() {
  const steps = [
    ['Pick a path.', 'Explore a habitat for a surprise, or search the Pokédex to meet any specific Pokémon. Every one of the 1,025 species is available.'],
    ['Battle, then befriend.', 'Choose a move to lower wild Pokémon’s HP. Type advantages help! Gentle tap works on every type and always leaves at least 1 HP. Throw a Poké Ball when the catch chance looks good.'],
    ['Travel with your favorites.', 'You begin with Bulbasaur, Charmander, and Squirtle. Choose your partner in My team. Bring six Pokémon, and change your lineup from your collection. Switching during battle uses a turn, unless your Pokémon just fainted.'],
    ['Take time to rest.', 'Potions heal during battle and use a turn. Camp heals everyone and refills supplies for free. Basic Poké Balls never run out, and a lost battle sends you safely home.'],
    ['Grow together.', 'Evolution unlocks as your Pokémon levels up. Use the evolution button in My team or after a battle. Choose among branching forms, or wait if you love the current one. Special evolutions use simple level goals; no items or trading needed.'],
    ['Wander through your world.', 'Visit World map to walk through Clover Town and three routes. Use arrow keys, WASD, direction buttons, or click a place. The quest book has five adventures and a guaranteed shiny Ponyta reward.'],
    ['Grow together.', 'Visit Buddy camp to feed, pet, and play with any Pokémon. Choose four battle moves from their move notebook. New moves unlock as they level up. Friendship stays through evolution.'],
    ['Make the adventure yours.', 'Enter three-round tournaments for trophies and loot. The Outfit studio has clothes, backpacks, and titles to unlock through quests and cups.'],
    ['Take on a challenge.', 'Visit Battle league to meet eight gym leaders and trainers up to level 100. Defeat each whole team for loot; gym wins also earn permanent badges. Your team is healed before a match. Trainer Pokémon cannot be caught.'],
    ['Put your rewards to work.', 'Ultra Balls help catch rare wild Pokémon. Super Potions heal fully in battle, and Revives bring fainted teammates back with half their HP. Give Rare Candies from Backpack for a level and a chance to evolve.'],
    ['Follow your curiosity.', 'Battling and catching award experience to your whole travel team. Legendary and mythical Pokémon are stronger and harder to catch. Train to level 12 or more, then bring Great Balls!']
  ];
  openModal(`<div class="modal-body">${modalHead('Your little field guide.')}<p class="modal-description">No rush. No timers. Just you, your team, and a whole world of possibility.</p>${steps.map(([title, description], i) => `<div class="help-step"><span class="step-number">${i + 1}</span><div><h3>${title}</h3><p>${description}</p></div></div>`).join('')}<p class="modal-description" style="margin-top:20px">Progress saves automatically in this browser. Use Trainer settings to change difficulty, turn on sound, or export a backup.</p><div class="modal-actions"><button class="btn" data-action="close-modal">Got it. Let’s adventure! ${icon('arrow')}</button></div></div>`);
}
function showSettings() {
  pendingSettings = { ...state.settings };
  renderSettings();
}
function renderSettings() {
  openModal(`<div class="modal-body">${modalHead('Make yourself at home.')}<p class="modal-description">A little adventure, just the way you like it.</p><div class="settings-group"><label for="trainer-name">Your trainer name</label><input id="trainer-name" type="text" maxlength="24" value="${esc(pendingSettings.name)}" autocomplete="off"></div><div class="settings-group"><span class="settings-title">Your adventure style</span><div class="difficulty-options">${[['gentle', 'Gentle', 'A little extra help'], ['balanced', 'Balanced', 'A friendly challenge'], ['brave', 'Brave', 'A bolder adventure']].map(([value, title, subtitle]) => `<button class="difficulty-option ${pendingSettings.difficulty === value ? 'selected' : ''}" data-action="difficulty" data-value="${value}" aria-pressed="${pendingSettings.difficulty === value}"><strong>${title}</strong><small>${subtitle}</small></button>`).join('')}</div></div><div class="settings-row"><span>Little game sounds</span><button class="toggle ${pendingSettings.sound ? 'on' : ''}" data-action="toggle-sound" role="switch" aria-checked="${pendingSettings.sound}" aria-label="Game sound effects"><span></span></button></div><div class="modal-actions"><button class="btn" data-action="save-settings">All set ${icon('check')}</button></div><div class="backup-actions"><button class="text-link" data-action="export">${icon('download')}Export adventure</button><button class="text-link" data-action="import">${icon('book')}Import adventure</button><input id="import-file" type="file" accept="application/json,.json" hidden></div><p class="modal-description" style="font-size:9px;margin-top:9px">Saved on this browser and address. Export a backup to keep your adventure when changing devices or browsers. ${storageAvailable ? '' : 'Browser storage is unavailable right now, so export before closing.'}</p><button class="btn secondary small outfit-settings-link" data-action="adventure-go" data-page="wardrobe">${icon('star')}Customize your trainer</button><button class="text-link" data-action="reset-prompt" style="margin-top:17px;color:#b48e7c">Start a new adventure</button></div>`);
}
function exportSave() {
  const file = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file), link = document.createElement('a');
  link.href = url; link.download = 'pokewild-adventure.json'; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Your adventure backup is ready. Keep it somewhere cozy.');
}
async function importSave(file) {
  if (!file) return;
  try {
    if (file.size > 2000000) throw new Error('That file is too large to be a Pokéwild save.');
    const imported = E.validateSave(JSON.parse(await file.text()), BY_ID);
    openModal(`<div class="modal-body">${modalHead('Welcome back to the trail.')}<p class="modal-description">This backup belongs to <strong>${esc(imported.settings.name)}</strong> and contains <strong>${imported.owned.length} Pokémon</strong>. Importing will replace the adventure in this browser. Export your current adventure first if you want to keep both.</p><div class="modal-actions"><button class="btn secondary" data-action="export">Export current</button><button class="btn" id="confirm-import">Import backup ${icon('check')}</button></div></div>`);
    $('#confirm-import').addEventListener('click', () => { state = imported; battle = null; save(); go('explore'); toast('Your adventure is right where you left it. Welcome back!'); }, { once: true });
  } catch (error) { toast(`Couldn’t import that file. ${error.message === 'Unexpected end of JSON input' ? 'Please choose a complete Pokéwild backup.' : 'Choose a valid Pokéwild adventure backup.'}`); }
}

function chooseWild(habitat) {
  if (state.encounters === 0 && habitat === 'meadow' && (state.region === 0 || state.region === 1)) return BY_ID[25];
  let pool = POKEMON.filter(p => !special(p) && (!state.region || p.gen === state.region) && p.types.some(t => HABITATS[habitat].types.includes(t)));
  if (!pool.length) pool = POKEMON.filter(p => !special(p) && (!state.region || p.gen === state.region));
  const unowned = pool.filter(p => !owned(p.id));
  if (unowned.length && Math.random() < .75) pool = unowned;
  return pool[Math.floor(Math.random() * pool.length)];
}
function startEncounter(id = null, habitat = state.location) {
  const returnTo = page === 'world' ? 'world' : 'explore';
  if (battle && !battle.done && battle.locked) return;
  battle = null;
  if (!HABITATS[habitat]) habitat = 'meadow';
  if (!state.team.some(member => owned(member).hp > 0)) healAll(true);
  const active = owned(state.lead).hp > 0 ? state.lead : state.team.find(member => owned(member).hp > 0);
  const p = id ? BY_ID[id] : chooseWild(habitat);
  if (!p) return;
  if (id) {
    const match = Object.entries(HABITATS).find(([, h]) => h.types.includes(p.types[0]));
    if (match) habitat = match[0];
  }
  state.location = habitat;
  const partner = owned(active), rare = special(p);
  const level = E.clamp(rare ? Math.max(12, partner.level + 2) : partner.level + Math.floor(Math.random() * 3) - 2, 3, 100);
  battle = { kind: 'wild', returnTo, healing: 'potion', enemy: E.makeOwned(p, level), active, habitat, turn: 1, locked: false, done: false, ball: 'poke', failedAttempts: 0, cooldowns: {}, log: [], message: `A wild ${p.name} appeared!`, hint: rare ? 'A rare encounter! Weaken them gently, then try a Great Ball.' : 'Use a move to lower their HP. A gentle tap can help you catch them.', result: null };
  battle.enemy.shiny = A.rollShiny(state);
  if (battle.enemy.shiny) { battle.message = `A shiny ${p.name} appeared!`; battle.hint = 'A sparkling surprise! Catch this Pokémon to keep their special colors.'; }
  battle.log.push(`You met a level ${level} ${p.name} in ${HABITATS[habitat].name}.`);
  state.encounters++;
  if (!state.seen.includes(p.id)) state.seen.push(p.id);
  save();
  if (modal.open) modal.close();
  if (location.hash !== '#battle') location.hash = 'battle';
  else { page = 'battle'; render(); }
  sound('heal');
}
function battleChance() {
  if (isTrainerBattle()) return 0;
  return E.catchChance(BY_ID[battle.enemy.id], battle.enemy, battle.ball, battle.failedAttempts, state.settings.difficulty);
}
function battleHint(move) {
  if (move.gentle) return '<span class="effectiveness">Leaves 1 HP</span>';
  const effect = E.typeEffect(move.type, BY_ID[battle.enemy.id].types, CHART);
  if (effect === 0) return '<span class="effectiveness weak">No effect</span>';
  if (effect > 1) return '<span class="effectiveness">Super effective</span>';
  if (effect < 1) return '<span class="effectiveness weak">Not very effective</span>';
  return '';
}
function battleMoves(species) {
  return A.equippedMoves(owned(battle.active), species, isTrainerBattle());
}
function battleHUD(p, enemy = false) {
  const species = BY_ID[p.id], trainer = isTrainerBattle();
  return `<div class="battle-hud ${enemy ? 'enemy-hud' : 'player-hud'}">${enemy ? `<span class="wild-badge ${special(species) ? 'legend' : ''}">${trainer ? 'TRAINER POKÉMON' : species.mythical ? 'MYTHICAL' : species.legendary ? 'LEGENDARY' : p.shiny ? 'SHINY POKÉMON' : 'WILD POKÉMON'}</span>` : ''}<div class="hud-title"><h3>${esc(species.name)}${p.shiny?' ✧':''}</h3><span>Lv. ${p.level}</span></div><div class="types">${types(species)}</div>${hpBar(p)}<div class="hud-health"><span>${enemy ? trainer ? 'A worthy opponent' : 'Wild spirit' : 'Your travel buddy'}</span><span>${p.hp} / ${E.maxHP(species, p.level)} HP</span></div></div>`;
}
function battleTools(b, active, disabled) {
  const trainer = isTrainerBattle(b), ball = BALLS[b.ball] || BALLS.poke;
  const superPotion = b.healing === 'super', potionStock = superPotion ? state.superPotions : state.potions;
  const fainted = state.team.some(id => owned(id).hp <= 0);
  return `<div class="battle-tools"><div class="moves-label"><span>${trainer ? 'A LITTLE TEAMWORK GOES A LONG WAY' : 'MAKE YOUR NEXT MOVE'}</span></div>${trainer ? `<div class="trainer-battle-note">${icon('shield')}<div><strong>${b.enemyTeam.filter(p=>p.hp > 0).length} Pokémon left to defeat</strong><small>Trainer Pokémon can’t be caught.</small></div></div>` : `<button class="catch-button" data-action="catch" ${disabled ? 'disabled' : ''}><span class="pokeball ${ball.className}"></span><span><strong>Throw a ${ball.name}</strong><small>${ball.inventory ? `${state[ball.inventory]} in your backpack` : 'A new friend? Give it a try.'}</small></span><span class="catch-chance">${Math.round(battleChance() * 100)}%<span>catch chance</span></span></button>`}<div class="battle-tool-row"><button class="btn secondary small" data-action="potion" ${disabled || !potionStock || active.hp >= E.maxHP(BY_ID[active.id], active.level) ? 'disabled' : ''}>${icon('heart')}${superPotion ? 'Super Potion' : 'Potion'} · ${potionStock}</button><button class="btn secondary small" data-action="switch-modal" ${disabled || !state.team.some(id => id !== b.active && owned(id).hp > 0) ? 'disabled' : ''}>${icon('team')}Switch Pokémon</button></div>${trainer || state.revives ? `<button class="btn secondary small revive-control" data-action="revive-picker" ${disabled || !state.revives || !fainted ? 'disabled' : ''}>${icon('plus')}Revive a teammate · ${state.revives}</button>` : ''}${!trainer ? `<label class="ball-selector">Your Poké Balls<select id="battle-ball" aria-label="Choose a Poké Ball" ${disabled ? 'disabled' : ''}>${Object.entries(BALLS).map(([id, item]) => `<option value="${id}" ${b.ball === id ? 'selected' : ''} ${item.inventory && !state[item.inventory] ? 'disabled' : ''}>${item.name} · ${item.inventory ? state[item.inventory]+' left' : 'unlimited'}</option>`).join('')}</select></label>` : ''}${state.superPotions || superPotion ? `<label class="ball-selector">Healing item<select id="battle-healing" aria-label="Choose a healing item" ${disabled ? 'disabled' : ''}><option value="potion" ${!superPotion ? 'selected' : ''} ${!state.potions ? 'disabled' : ''}>Potion · ${state.potions}</option><option value="super" ${superPotion ? 'selected' : ''} ${!state.superPotions ? 'disabled' : ''}>Super Potion · ${state.superPotions}</option></select></label>` : ''}</div>`;
}
function renderBattle() {
  const b = battle, active = owned(b.active), species = BY_ID[active.id], enemy = BY_ID[b.enemy.id], habitat = HABITATS[b.habitat];
  const trainer = isTrainerBattle(b), challenger = trainer ? CHALLENGE_BY_ID[b.opponentId] : null;
  const disabled = b.locked || b.done || active.hp <= 0, moves = battleMoves(species), cooldown = b.cooldowns[b.active] || 0;
  const subtitle = trainer ? `${challenger.title} · ${challenger.name}` : habitat.name;
  main.innerHTML = `<div class="battle-page ${trainer ? 'trainer-match' : ''}"><div class="page-heading battle-heading"><div><div class="eyebrow">${icon(trainer ? 'trophy' : 'pin')}${esc(subtitle)} · TURN ${b.turn}</div><h1>${b.done ? 'Another little story to tell.' : trainer ? 'Your team. Your moment.' : 'A new friendship, perhaps?'}</h1></div><button class="btn secondary small" data-action="leave-battle">${icon('arrow')}${trainer ? 'Leave battle safely' : 'Head back safely'}</button></div>${opponentLineup(b)}<div class="battle-arena">${landscape(b.habitat)}<span class="battle-sky-label">${icon(habitat.icon)}${trainer ? `Pokémon ${b.enemyIndex + 1} of ${b.enemyTeam.length}` : esc(habitat.sky)}</span>${battleHUD(b.enemy, true)}${battleHUD(active)}<div class="battle-creature player-creature" id="player-creature">${art(species, '', '', Boolean(active.shiny))}</div><div class="battle-creature enemy-creature" id="enemy-creature">${art(enemy, '', '', Boolean(b.enemy.shiny))}${special(enemy) ? '<span class="legend-star">✧</span>' : ''}</div></div><section class="battle-controls" aria-label="Battle controls"><div class="battle-message" role="status" aria-live="polite">${icon(b.done ? 'sparkles' : 'compass')}<div><strong>${esc(b.message)}</strong><p>${esc(b.hint)}</p></div></div>${b.done ? `<div class="modal-actions" style="padding:0 25px 25px"><button class="btn secondary" data-action="battle-summary">See your field notes</button><button class="btn" data-action="leave-battle">${trainer ? 'Back to the league' : 'Back to exploring'} ${icon('arrow')}</button></div>` : active.hp <= 0 ? `<div class="modal-actions" style="padding:0 25px 25px"><button class="btn" data-action="switch-modal">${icon('team')}Choose your next Pokémon</button></div>` : `<div class="battle-buttons"><div><div class="moves-label"><span>WHAT WILL ${esc(species.name.toUpperCase())} DO?</span><span>CHOOSE A MOVE</span></div><div class="moves-grid">${moves.map((move, i) => `<button class="move-button" data-action="move" data-index="${i}" ${disabled || move.cooldown && cooldown > 0 ? 'disabled' : ''} title="${esc(move.description)}"><strong>${esc(move.name)}${icon(move.gentle ? 'heart' : 'swords')}</strong><small><span class="type type-${move.type}">${move.type}</span>${move.cooldown && cooldown > 0 ? `${cooldown} turn${cooldown > 1 ? 's' : ''} to recharge` : battleHint(move) || (move.cooldown ? 'Power move' : 'Steady move')}</small></button>`).join('')}</div></div>${battleTools(b, active, disabled)}</div>`}</section><div class="battle-party"><span>YOUR TRAVEL TEAM</span>${state.team.map(id => { const p = owned(id); return `<button class="party-token ${id === b.active ? 'active' : ''} ${p.hp <= 0 ? 'fainted' : ''}" data-action="battle-switch" data-id="${id}" ${b.locked || b.done || id === b.active || p.hp <= 0 ? 'disabled' : ''} aria-label="Switch to ${esc(BY_ID[id].name)}, ${p.hp} HP">${art(BY_ID[id])}<span>${esc(BY_ID[id].name)}<small>${p.hp === 0 ? 'Needs a rest' : `Lv. ${p.level} · ${p.hp} HP`}</small></span></button>`; }).join('')}</div><details class="battle-log"><summary>Field notes · ${b.log.length} ${b.log.length === 1 ? 'moment' : 'moments'}</summary><ol>${b.log.map(line => `<li>${esc(line)}</li>`).join('')}</ol></details></div>`;
}

const delay = ms => new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? Math.min(ms, 80) : ms));
function current(b) { return battle === b && !b.done; }
function canAct() { return battle && !battle.done && !battle.locked && owned(battle.active).hp > 0; }
function announce(b, message, hint) { b.message = message; if (hint !== undefined) b.hint = hint; renderBattle(); }
function describeDamage(name, move, result) {
  return `${name} used ${move.name}. ${result.amount === 0 && !move.gentle ? 'It had no effect.' : `${result.amount} damage!`}${!move.gentle && result.effectiveness > 1 ? ' Super effective!' : !move.gentle && result.effectiveness > 0 && result.effectiveness < 1 ? ' Not very effective.' : ''}`;
}
async function useMove(index) {
  if (!canAct()) return;
  const b = battle, player = owned(b.active), p = BY_ID[player.id], foe = BY_ID[b.enemy.id], move = battleMoves(p)[index];
  if (!move || move.cooldown && (b.cooldowns[b.active] || 0) > 0) return;
  b.locked = true;
  announce(b, `${p.name} used ${move.name}!`, move.gentle ? 'A careful move. Gentle tap will never knock out a wild Pokémon.' : 'Your buddy is giving it their best.');
  $('#player-creature')?.classList.add('attack');
  await delay(320); if (!current(b)) return;
  const result = E.damage(player, b.enemy, move, p, foe, CHART);
  b.enemy.hp -= result.amount;
  if (move.cooldown) b.cooldowns[b.active] = move.cooldown + 1;
  const description = describeDamage(p.name, move, result);
  b.log.push(description);
  announce(b, description, b.enemy.hp <= 0 ? 'A good effort, and a little more experience for your whole team.' : 'Your opponent is getting ready for its turn.');
  $('#enemy-creature')?.classList.add('hit'); sound('hit');
  await delay(430); if (!current(b)) return;
  if (b.enemy.hp <= 0) await enemyDefeated(b); else await enemyTurn(b);
}
async function enemyDefeated(b) {
  if (!current(b)) return;
  if (!isTrainerBattle(b) || b.enemyIndex === b.enemyTeam.length - 1) { finishBattle('win'); return; }
  const c = CHALLENGE_BY_ID[b.opponentId];
  b.log.push(`${BY_ID[b.enemy.id].name} was defeated.`);
  b.enemyIndex++;
  b.enemy = b.enemyTeam[b.enemyIndex];
  b.enemyCooldown = 0;
  Object.keys(b.cooldowns).forEach(id => b.cooldowns[id] = Math.max(0, b.cooldowns[id] - 1));
  b.turn++;
  if (!state.seen.includes(b.enemy.id)) state.seen.push(b.enemy.id);
  const message = `${c.name} sent out ${BY_ID[b.enemy.id].name}!`;
  b.log.push(message);
  announce(b, message, `${b.enemyIndex} down, ${b.enemyTeam.length - b.enemyIndex} to go. You have the next move.`);
  save();
  await delay(350); if (!current(b)) return;
  b.locked = false; renderBattle();
}
async function enemyTurn(b) {
  if (!current(b)) return;
  const player = owned(b.active), p = BY_ID[player.id], foe = BY_ID[b.enemy.id];
  let options = E.moves(foe).slice(0, special(foe) ? 3 : 2).filter(move => E.typeEffect(move.type, p.types, CHART) > 0);
  if (!options.length) options = [{ name: 'Wild strike', type: 'typeless', power: 30 }];
  const trainer = isTrainerBattle(b);
  const move = trainer ? E.trainerMove(b.enemy, player, foe, p, CHART, b.enemyCooldown) : options[Math.floor(Math.random() * options.length)];
  if (trainer) b.enemyCooldown = move.cooldown ? move.cooldown : Math.max(0, b.enemyCooldown - 1);
  const scale = (trainer ? { gentle: .52, balanced: .78, brave: .95 } : { gentle: .46, balanced: .68, brave: .88 })[state.settings.difficulty];
  const result = E.damage(b.enemy, player, move, foe, p, CHART, { scale });
  player.hp -= result.amount;
  const description = describeDamage(foe.name, move, result);
  b.log.push(description);
  Object.keys(b.cooldowns).forEach(id => b.cooldowns[id] = Math.max(0, b.cooldowns[id] - 1));
  b.turn++;
  announce(b, description, player.hp > 0 ? trainer ? 'Your turn. Attack, heal, revive a friend, or switch your teammate.' : 'Your turn. Battle, catch, heal, or let another teammate have a go.' : `${p.name} needs a rest. Another friend can take the lead.`);
  $('#player-creature')?.classList.add('hit'); sound('hit'); save();
  await delay(370); if (!current(b)) return;
  b.locked = false;
  if (player.hp <= 0) {
    if (state.team.some(id => owned(id).hp > 0)) { renderBattle(); showSwitch(); }
    else finishBattle('loss');
  } else renderBattle();
}
async function throwBall() {
  if (!canAct() || isTrainerBattle()) return;
  const b = battle, p = BY_ID[b.enemy.id];
  const ball = BALLS[b.ball] || BALLS.poke;
  if (ball.inventory && !state[ball.inventory]) { b.ball = 'poke'; renderBattle(); return; }
  const chance = battleChance(), ballName = ball.name;
  if (ball.inventory) state[ball.inventory]--;
  b.locked = true;
  announce(b, `You threw a ${ballName}…`, 'One little wobble. Two little wobbles.');
  $('#enemy-creature')?.classList.add('catching'); save();
  await delay(1000); if (!current(b)) return;
  if (Math.random() < chance) {
    b.log.push(`You caught ${p.name} with a ${ballName}!`);
    finishBattle('catch');
  } else {
    b.failedAttempts++;
    if (ball.inventory && !state[ball.inventory]) b.ball = 'poke';
    b.log.push(`${p.name} popped out of the ${ballName}.`);
    announce(b, `${p.name} popped out. Keep trying!`, 'Lower HP makes catching easier. A few tries at low HP will always work.');
    await delay(450); if (!current(b)) return;
    await enemyTurn(b);
  }
}
async function usePotion() {
  if (!canAct()) return;
  const b = battle, p = owned(b.active), max = E.maxHP(BY_ID[p.id], p.level);
  const superPotion = b.healing === 'super', stock = superPotion ? 'superPotions' : 'potions', name = superPotion ? 'Super Potion' : 'Potion';
  if (p.hp >= max || !state[stock]) return;
  b.locked = true; state[stock]--;
  const gain = Math.min(max - p.hp, Math.round(max * (superPotion ? 1 : .6)));
  p.hp += gain; save(); sound('heal');
  if (superPotion && !state.superPotions) b.healing = 'potion';
  b.log.push(`${BY_ID[p.id].name} recovered ${gain} HP with a ${name}.`);
  announce(b, `Feeling better! ${BY_ID[p.id].name} recovered ${gain} HP.`, 'Healing takes your turn. Your opponent goes next.');
  await delay(550); if (!current(b)) return;
  await enemyTurn(b);
}
function showSwitch() {
  if (!battle || battle.done || battle.locked) return;
  const fainted = owned(battle.active).hp <= 0;
  openModal(`<div class="modal-body">${modalHead(fainted ? 'A friend to take the lead.' : 'A little teamwork.')}<p class="modal-description" style="margin-bottom:20px">${fainted ? `${esc(BY_ID[battle.active].name)} needs a rest. Choose a healthy teammate. This switch won’t use your turn.` : 'Choose a healthy teammate. Switching takes a turn, so your opponent will get a move.'}</p><div class="switch-list">${state.team.filter(id => id !== battle.active).map(id => { const p = owned(id); return `<button class="switch-option" data-action="battle-switch" data-id="${id}" ${p.hp <= 0 ? 'disabled' : ''}>${art(BY_ID[id])}<div><strong>${esc(BY_ID[id].name)}</strong><small>Level ${p.level} · ${p.hp <= 0 ? 'Needs a rest' : `${p.hp} / ${E.maxHP(BY_ID[id], p.level)} HP`}</small>${hpBar(p)}</div>${icon('arrow')}</button>`; }).join('')}</div></div>`);
}
async function switchPokemon(id) {
  if (!battle || battle.done || battle.locked || !state.team.includes(id) || id === battle.active || owned(id).hp <= 0) return;
  const b = battle, freeSwitch = owned(b.active).hp <= 0;
  b.active = id;
  if (modal.open) modal.close();
  b.log.push(`${BY_ID[id].name} took the lead.`);
  b.locked = !freeSwitch;
  announce(b, `You’ve got this, ${BY_ID[id].name}!`, freeSwitch ? 'A fresh face, a fresh start. It’s your turn.' : 'Your buddy is ready. Your opponent has the next move.');
  sound('heal');
  if (!freeSwitch) { await delay(450); if (current(b)) await enemyTurn(b); }
}
function finishBattle(kind) {
  if (!battle || battle.done) return;
  if (battle.kind === 'tournament') { finishCupRound(kind); return; }
  const b = battle, p = BY_ID[b.enemy.id], already = Boolean(owned(p.id));
  const trainer = isTrainerBattle(b);
  if (trainer && (kind === 'catch' || kind === 'win' && b.enemyTeam.some(member => member.hp > 0))) return;
  b.done = true; b.locked = false;
  A.afterBattle(state);
  const rewards = [], levels = [];
  let prize = null;
  if (kind === 'loss') {
    healAll(true);
    b.message = 'A little rest. Then a fresh start.';
    b.hint = 'You’re safely back at camp. Your whole collection is healed, and your supplies are refilled.';
  } else if (trainer) {
    const c = CHALLENGE_BY_ID[b.opponentId];
    prize = E.challengeRewards(c, Boolean(c.badge && state.badges.includes(c.badge.id)));
    Object.entries(prize.loot).forEach(([key, count]) => state[key] += count);
    if (prize.newBadge) state.badges.push(prize.newBadge);
    state.challengeWins[c.id] = (state.challengeWins[c.id] || 0) + 1;
    if (c.kind === 'gym') state.gymWins++; else state.trainerWins++;
    state.team.forEach(id => { const gain = E.grantXP(owned(id), BY_ID[id], prize.xp); if (gain) levels.push(`${BY_ID[id].name} → Lv. ${owned(id).level}`); });
    state.trainerXP += prize.trainerXP;
    rewards.push(`+${prize.xp} XP to your team`, ...levels);
    b.message = `Your team defeated ${c.name}!`;
    b.hint = prize.newBadge ? `You earned the ${c.badge.name}! Your loot is in your backpack, and your badge is in the badge case.` : 'A great team effort. Your victory rewards have been added to your backpack.';
  } else {
    if (kind === 'catch') {
      state.captures++;
      if (!state.caught.includes(p.id)) state.caught.push(p.id);
      A.befriend(state, p.id, b.enemy.level, BY_ID, Boolean(b.enemy.shiny));
      if (b.enemy.shiny) rewards.push('Shiny colors added to your collection!');
    } else state.wins++;
    const experience = Math.round((30 + b.enemy.level * 10) * (special(p) ? 1.35 : 1));
    state.team.forEach(id => { const gain = E.grantXP(owned(id), BY_ID[id], experience); if (gain) levels.push(`${BY_ID[id].name} → Lv. ${owned(id).level}`); });
    state.trainerXP += (kind === 'catch' ? 35 : 25) + (special(p) ? 20 : 0);
    state.greatBalls++;
    rewards.push(`+${experience} XP to your team`, '+1 Great Ball', ...levels);
    b.message = kind === 'catch' ? `You caught ${p.name}!` : `A lovely effort. You won the battle!`;
    b.hint = kind === 'catch' ? already ? 'A familiar friend! Your team earned experience for the encounter.' : state.team.includes(p.id) ? `${p.name} joined your travel team, ready for the next adventure.` : `${p.name} is resting at camp. Add them to your team whenever you like.` : `${p.name} is taking a rest. Your whole team gained experience.`;
  }
  b.result = { kind, already, rewards, prize };
  save(); sound(kind === 'loss' ? 'heal' : 'catch'); renderBattle(); showBattleResult();
}
function showBattleResult() {
  if (!battle?.result) return;
  if (isTrainerBattle()) { showChallengeResult(); return; }
  const b = battle, p = BY_ID[b.enemy.id], { kind, rewards } = b.result;
  openModal(`<div class="modal-body"><div class="modal-header"><span class="eyebrow" style="font-size:8px;color:#95a280">A MOMENT FOR THE FIELD NOTES</span><button class="icon-button" data-action="close-modal" aria-label="Close battle result">${icon('close')}</button></div><div class="result-panel"><div class="result-art">${art(kind === 'loss' ? BY_ID[state.lead] : p, '', '', kind === 'loss' ? Boolean(owned(state.lead).shiny) : Boolean(b.enemy.shiny))}</div><div class="eyebrow">${kind === 'catch' ? special(p) ? 'AN EXTRAORDINARY NEW FRIEND' : 'A NEW PAGE IN YOUR STORY' : kind === 'win' ? 'GROWING A LITTLE STRONGER' : 'EVERY TRAINER STARTS SOMEWHERE'}</div><h2 id="modal-title">${kind === 'catch' ? `Hello, ${esc(p.name)}!` : kind === 'win' ? 'Look at you go.' : 'Rest is part of the journey.'}</h2><p>${esc(b.hint)}</p>${rewards.length ? `<div class="reward-chips">${rewards.map(r => `<span>${esc(r)}</span>`).join('')}</div>` : ''}</div>${evolutionNotice(state.team)}${moveLearningNotice()}<div class="modal-actions"><button class="btn secondary" data-action="result-team">Meet your team</button><button class="btn" data-action="leave-battle">Keep exploring ${icon('arrow')}</button></div></div>`);
}
function leaveBattle() {
  const destination = battle?.kind === 'tournament' ? 'tournaments' : battle?.returnTo || (isTrainerBattle() ? 'league' : 'explore');
  if (battle && !battle.done) toast('Back on the trail, safe and sound. You can heal at camp for free.');
  battle = null; save(); go(destination);
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action, id = Number(button.dataset.id);
  switch (action) {
    case 'explore': startEncounter(); break;
    case 'camp-open': campBuddy = id; campMessage = ''; go('camp'); break;
    case 'league-tab': leagueTab = button.dataset.tab === 'trainers' ? 'trainers' : 'gyms'; renderLeague(); break;
    case 'challenge-preview': showChallenge(button.dataset.challenge); break;
    case 'challenge-start': startChallenge(button.dataset.challenge); break;
    case 'candy-picker': itemPicker('candy'); break;
    case 'use-candy': giveCandy(id); break;
    case 'revive-picker': itemPicker('revive'); break;
    case 'use-revive': useRevive(id); break;
    case 'habitat': startEncounter(null, button.dataset.habitat); break;
    case 'encounter': startEncounter(id); break;
    case 'detail': detail(id); break;
    case 'evolution-options': showEvolutionOptions(id); break;
    case 'evolve': evolve(Number(button.dataset.from), Number(button.dataset.to)); break;
    case 'open-dex': go('pokedex'); break;
    case 'help': showHelp(); break;
    case 'settings': if (!battle?.locked) showSettings(); break;
    case 'heal': healAll(); break;
    case 'partner': makePartner(id); break;
    case 'remove-team': removeFromTeam(id); break;
    case 'add-team': addToTeam(id); break;
    case 'replace-team': replaceTeam(id, Number(button.dataset.replace)); break;
    case 'close-modal': modal.close(); break;
    case 'clear-filters': filter = { query: '', region: 0, type: '', rarity: '', tab: 'all', page: 0 }; renderDex(); break;
    case 'dex-tab': filter.tab = button.dataset.tab; filter.page = 0; renderDex(); break;
    case 'dex-prev': filter.page--; renderDexResults(); $('#dex-results').scrollIntoView({ block: 'start' }); break;
    case 'dex-next': filter.page++; renderDexResults(); $('#dex-results').scrollIntoView({ block: 'start' }); break;
    case 'move': useMove(Number(button.dataset.index)); break;
    case 'catch': throwBall(); break;
    case 'potion': usePotion(); break;
    case 'switch-modal': showSwitch(); break;
    case 'battle-switch': switchPokemon(id); break;
    case 'battle-summary': showBattleResult(); break;
    case 'leave-battle': leaveBattle(); break;
    case 'result-team': battle = null; go('team'); break;
    case 'difficulty': pendingSettings.name = $('#trainer-name').value; pendingSettings.difficulty = button.dataset.value; renderSettings(); break;
    case 'toggle-sound': pendingSettings.name = $('#trainer-name').value; pendingSettings.sound = !pendingSettings.sound; renderSettings(); break;
    case 'save-settings': state.settings = { ...pendingSettings, name: $('#trainer-name').value.trim() || 'Rookie Trainer' }; save(); modal.close(); render(); sound('heal'); toast('All set. This is your kind of adventure.'); break;
    case 'export': exportSave(); break;
    case 'import': $('#import-file').click(); break;
    case 'reset-prompt': openModal(`<div class="modal-body">${modalHead('A brand-new beginning?')}<p class="modal-description">This will replace the saved adventure in this browser, including your ${state.owned.length} Pokémon, levels, and progress. You’ll start again with Bulbasaur, Charmander, and Squirtle. Export a backup first if you’d like to revisit this journey.</p><div class="modal-actions"><button class="btn secondary" data-action="export">Export backup</button><button class="btn danger" data-action="reset-confirm">Start fresh</button></div></div>`); break;
    case 'reset-confirm': state = E.freshState(BY_ID); battle = null; save(); go('explore'); toast('Three little friends. One big adventure. Welcome to Pokéwild!'); break;
  }
});
document.addEventListener('input', event => {
  if (event.target.id === 'dex-search') { filter.query = event.target.value; filter.page = 0; renderDexResults(); }
  if (event.target.id === 'storage-search') { storageQuery = event.target.value; renderStorage(); }
});
document.addEventListener('change', event => {
  const { id, value } = event.target;
  if (id === 'explore-region') { state.region = Number(value); save(); renderExplore(); }
  if (id === 'dex-region' || id === 'dex-type' || id === 'dex-rarity') {
    if (id === 'dex-region') filter.region = Number(value);
    if (id === 'dex-type') filter.type = value;
    if (id === 'dex-rarity') filter.rarity = value;
    filter.page = 0; renderDexResults();
  }
  if (id === 'battle-ball' && battle && !battle.locked && ['poke', 'great', 'ultra'].includes(value)) { battle.ball = value; renderBattle(); }
  if (id === 'battle-healing' && battle && !battle.locked && ['potion', 'super'].includes(value)) { battle.healing = value; renderBattle(); }
  if (id === 'import-file') importSave(event.target.files[0]);
});
modal.addEventListener('click', event => { if (event.target === modal) { const box = modal.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) modal.close(); } });
window.addEventListener('hashchange', route);
save();
route();
if (loadNotice) setTimeout(() => toast(loadNotice), 800);
if (!storageAvailable) setTimeout(() => toast('This browser cannot save automatically. Use Trainer settings to export a backup before closing.'), 1000);
