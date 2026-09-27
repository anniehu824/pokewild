/* Battle-form previews and the one-transformation-per-match controls. */
let formGuideKind = 'mega';
let formGuideQuery = '';
let formGuideSpecies = 0;

function formArt(form, shiny = false, attrs = '') {
  return `<img class="pokemon-img form-art" src="assets/forms/${shiny && form.art.shiny ? 'shiny' : 'normal'}/${form.key}.png" alt="${shiny ? 'Shiny ' : ''}${esc(form.name)}" ${attrs} draggable="false">`;
}
function battleSpecies(pokemon) { return T.species(battle,pokemon,BY_ID[pokemon.id]); }
function battleHealth(pokemon) { return T.health(battle,pokemon,BY_ID[pokemon.id]); }
function battleFormArt(pokemon) {
  const form = T.active(battle,pokemon.id);
  return form ? formArt(form,Boolean(pokemon.shiny)) : art(BY_ID[pokemon.id],'','',Boolean(pokemon.shiny));
}
function formLink(id) {
  const options = T.options(id);
  if (!options.length) return '';
  const label = [...new Set(options.map(form => form.kind === 'mega' ? 'Mega Evolution' : 'Gigantamax'))].join(' + ');
  return `<button class="form-link" data-action="form-guide" data-id="${id}">${icon('sparkles')}<span>${label}</span>${icon('chevron')}</button>`;
}
function showFormGuide(id = 0) {
  if (battle && !battle.done) return;
  formGuideSpecies = BY_ID[id] ? id : 0;
  formGuideQuery = '';
  formGuideKind = T.options(id).some(f => f.kind === 'mega') || !id ? 'mega' : 'gmax';
  renderFormGuide();
}
function formCard(form, choosing = false) {
  const friend = owned(form.species), mega = form.kind === 'mega';
  return `<article class="form-card ${mega ? 'mega' : 'gmax'}">${formArt(form,Boolean(friend?.shiny),'loading="lazy"')}<div><span class="eyebrow">${mega ? 'MEGA EVOLUTION' : 'GIGANTAMAX'}</span><h3>${esc(form.name)}</h3><div class="types">${types(form)}</div><p>${mega ? 'Boosted stats and this form’s types. Lasts until the battle ends or this buddy faints.' : `Double HP for 3 turns. ${esc(form.gmaxMove)} boosts ${form.gmaxType}-type attacks.`}</p>${choosing ? `<button class="btn small ${mega ? 'mega-button' : 'gmax-button'}" data-action="transform" data-form="${form.key}">${icon('sparkles')}${mega ? 'Mega Evolve' : 'Gigantamax'}</button>` : `<span class="form-owned">${friend ? `Your ${esc(BY_ID[form.species].name)} can use this in battle` : `Catch or evolve a ${esc(BY_ID[form.species].name)} to try it`}</span>`}</div></article>`;
}
function renderFormGuide() {
  openModal(`<div class="modal-body form-guide">${modalHead(formGuideSpecies ? `${esc(BY_ID[formGuideSpecies].name)}’s battle forms` : 'A little bond. A big transformation.')}<p class="modal-description">Every eligible buddy is ready—no stones, special items, or extra levels needed. Choose <strong>one Mega Evolution or Gigantamax per battle</strong>. Transforming is free; you still choose your move afterward.</p><div class="form-rules"><span>${icon('sparkles')}Mega: boosted stats & form types</span><span>${icon('shield')}Gigantamax: double HP & stronger Max moves for 3 turns</span></div><p class="form-footnote">Switching ends Gigantamax; Mega Evolution stays when switching. Both end after battle or fainting. Each tournament round is a new battle. Your collection and permanent evolution stay the same.</p>${formGuideSpecies ? '' : `<div class="form-tabs" role="tablist" aria-label="Battle form categories"><button role="tab" aria-selected="${formGuideKind === 'mega'}" data-action="form-tab" data-kind="mega" class="${formGuideKind === 'mega' ? 'selected' : ''}">Mega Evolution</button><button role="tab" aria-selected="${formGuideKind === 'gmax'}" data-action="form-tab" data-kind="gmax" class="${formGuideKind === 'gmax' ? 'selected' : ''}">Gigantamax</button></div><label class="searchbox">${icon('search')}<input id="form-search" type="search" aria-label="Search eligible Pokémon" placeholder="Find an eligible Pokémon…" value="${esc(formGuideQuery)}"></label>`}<div id="form-guide-results" aria-live="polite"></div><p class="form-footnote">Pokéwild uses simplified battle rules. Max moves gain 30% power and have no recharge; Gentle tap still leaves 1 HP. If none of your moves match the G-Max type, your first attack becomes the signature move. Abilities, weather, and extra status effects aren’t part of these battles. Alternate styles are choices for the same collected species.</p></div>`);
  renderFormResults();
}
function renderFormResults() {
  const matches = T.forms.filter(f => formGuideSpecies ? f.species === formGuideSpecies : f.kind === formGuideKind && normalized(f.name).includes(normalized(formGuideQuery)));
  $('#form-guide-results').innerHTML = `<p class="form-result-count">${matches.length} ${matches.length === 1 ? 'form' : 'forms'} to discover</p><div class="form-cards">${matches.map(f => formCard(f)).join('') || '<p class="modal-description">No matching forms. Try another Pokémon.</p>'}</div>`;
}
function transformationControls(b, pokemon, disabled) {
  const form = T.active(b,pokemon.id);
  if (form) return `<div class="transformation-panel active-${form.kind}"><span class="transformation-emblem">✦</span><div><strong>${esc(form.name)}</strong><p>${form.kind === 'mega' ? 'Mega power lasts through this battle.' : `${b.transformation.turns} turn${b.transformation.turns === 1 ? '' : 's'} left · double HP · stronger Max moves`}</p></div><span class="transformation-tag">${form.kind === 'mega' ? 'MEGA' : b.transformation.turns + ' TURNS'}</span></div>`;
  if (b.powerUsed) return `<div class="transformation-used">${icon('sparkles')}Your transformation has been used for this battle.</div>`;
  const options = T.options(pokemon.id), mega = options.some(f => f.kind === 'mega'), gmax = options.some(f => f.kind === 'gmax');
  if (!options.length) {
    const ready = state.team.filter(id => id !== pokemon.id && owned(id).hp > 0 && T.options(id).length);
    return ready.length ? `<div class="transformation-used">${icon('sparkles')}Switch to ${ready.map(id => esc(BY_ID[id].name)).join(' or ')} to use a battle transformation.</div>` : '';
  }
  return `<div class="transformation-panel"><span class="transformation-emblem">✦</span><div><strong>A bigger moment for your buddy.</strong><p>One transformation per battle · choose, then attack</p></div><div class="transformation-actions">${mega ? `<button class="btn small mega-button" data-action="transform-options" data-kind="mega" ${disabled ? 'disabled' : ''}>Mega Evolve</button>` : ''}${gmax ? `<button class="btn small gmax-button" data-action="transform-options" data-kind="gmax" ${disabled ? 'disabled' : ''}>Gigantamax</button>` : ''}</div></div>`;
}
function showTransformOptions(kind) {
  if (!canAct() || battle.powerUsed || !['mega','gmax'].includes(kind)) return;
  const options = T.options(battle.active,kind);
  if (!options.length) return;
  openModal(`<div class="modal-body">${modalHead(kind === 'mega' ? 'Choose your Mega Evolution.' : 'Ready for a gigantic moment?')}<p class="modal-description">${kind === 'mega' ? 'Your buddy gains this form’s stats and types until the battle ends or they faint. Switching keeps the Mega form.' : 'Your buddy gets double HP and stronger Max moves for 3 turns. Attacking, healing, or a failed catch uses a turn. Switching ends Gigantamax.'} This uses your one transformation for the entire battle. You can still attack right away.</p><div class="form-cards transform-choices">${options.map(form => formCard(form,true)).join('')}</div></div>`);
}
function transformPokemon(key) {
  if (!canAct()) return;
  const b = battle, p = owned(b.active), form = T.start(b,p,key);
  if (!form) return;
  if (modal.open) modal.close();
  const message = `${BY_ID[p.id].name} ${form.kind === 'mega' ? 'Mega Evolved' : 'Gigantamaxed'} into ${form.name}!`;
  b.log.push(message);
  announce(b,message,form.kind === 'mega' ? 'Your bond shines bright. Choose a move—Mega power is ready!' : 'Three big turns! Choose a Max move, or use Gentle tap for a safe catch.');
  sound('catch');
}
function tickTransformation(b) {
  const form = T.tick(b,owned(b.active));
  if (form) b.log.push(`${form.name} returned to normal. The three Gigantamax turns are over.`);
  return form;
}
function clearTransformation(b = battle) {
  if (b?.transformation) T.end(b,owned(b.transformation.pokemonId));
}
