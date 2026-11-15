/* Battle league screens, badge art, and the items earned by meeting its challenges. */
const CHALLENGES = window.CHALLENGE_DATA || [];
const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map(c => [c.id, c]));
const BALLS = {
  poke: { name: 'Poké Ball', inventory: null, className: '' },
  great: { name: 'Great Ball', inventory: 'greatBalls', className: 'great-ball' },
  ultra: { name: 'Ultra Ball', inventory: 'ultraBalls', className: 'ultra-ball' },
  quick: { name: 'Quick Ball', inventory: 'quickBalls', className: 'quick-ball' },
  net: { name: 'Net Ball', inventory: 'netBalls', className: 'net-ball' },
  dusk: { name: 'Dusk Ball', inventory: 'duskBalls', className: 'dusk-ball' },
  repeat: { name: 'Repeat Ball', inventory: 'repeatBalls', className: 'repeat-ball' }
};
const LOOT_NAMES = { ultraBalls:'Ultra Balls', superPotions:'Super Potions', revives:'Revives', rareCandies:'Rare Candies' };
const LOOT_SINGULAR = { ultraBalls:'Ultra Ball', superPotions:'Super Potion', revives:'Revive', rareCandies:'Rare Candy' };
let leagueTab = 'gyms';

function isTrainerBattle(b = battle) { return Boolean(b && b.kind && b.kind !== 'wild'); }
function challengeLevel(c) { return Math.max(...c.team.map(p => p.level)); }
function lootChips(loot) { return Object.entries(loot).filter(([, count]) => count > 0).map(([key, count]) => `<span class="loot-chip loot-${key}">${icon(key === 'ultraBalls' ? 'compass' : key === 'superPotions' ? 'heart' : key === 'revives' ? 'plus' : 'sparkles')}<strong>${count}</strong> ${count === 1 ? LOOT_SINGULAR[key] : LOOT_NAMES[key]}</span>`).join(''); }
function badgeArt(badge, earned = true) {
  const shape = {
    boulder: '<path d="m32 5 22 14v26L32 59 10 45V19Z" fill="#a2a39a"/><path d="m32 13 14 10v18L32 51 18 41V23Z" fill="#d2d1c3"/><path d="m32 13 14 10-14 9-14-9Z" fill="#eeebdf"/><path d="m32 32 14-9v18L32 51Z" fill="#b8b9aa"/>',
    cascade: '<path d="M32 4C24 16 12 27 12 39a20 20 0 0 0 40 0C52 27 40 16 32 4Z" fill="#82b9c6"/><path d="M32 15C25 26 21 31 21 40a11 11 0 0 0 22 0c0-8-5-14-11-25Z" fill="#c1e0e1"/><path d="M24 38q0 9 7 10" fill="none" stroke="#f4ffff" stroke-width="4" stroke-linecap="round"/>',
    thunder: '<path d="m32 3 7 12 13-2-1 14 10 9-12 7-2 14-15-5-14 5-3-14-12-7 10-9-1-14 13 2Z" fill="#d4b568"/><circle cx="32" cy="32" r="16" fill="#f3df9d"/><path d="m35 15-14 19h10l-3 15 16-23H33Z" fill="#be9850"/>',
    rainbow: '<g fill="#dda4a0"><ellipse cx="32" cy="17" rx="10" ry="15"/><ellipse cx="32" cy="47" rx="10" ry="15"/></g><g fill="#c5cb87"><ellipse cx="17" cy="32" rx="15" ry="10"/><ellipse cx="47" cy="32" rx="15" ry="10"/></g><g fill="#b8bbd8"><ellipse cx="21" cy="21" rx="9" ry="14" transform="rotate(-45 21 21)"/><ellipse cx="43" cy="43" rx="9" ry="14" transform="rotate(-45 43 43)"/></g><g fill="#e5c38e"><ellipse cx="43" cy="21" rx="9" ry="14" transform="rotate(45 43 21)"/><ellipse cx="21" cy="43" rx="9" ry="14" transform="rotate(45 21 43)"/></g><circle cx="32" cy="32" r="11" fill="#f7e8b8"/>',
    soul: '<path d="M32 57 8 32C-8 14 16-3 32 16 48-3 72 14 56 32Z" fill="#c58daa"/><path d="M32 45 17 29c-10-11 4-19 15-7 11-12 25-4 15 7Z" fill="#edd1dd"/>',
    marsh: '<circle cx="32" cy="32" r="26" fill="#c7ac65"/><circle cx="32" cy="32" r="19" fill="#f4e5aa"/><circle cx="32" cy="32" r="11" fill="#cfb36c"/><circle cx="29" cy="28" r="4" fill="#f8edbe"/>',
    volcano: '<path d="m32 3 7 16 13-7-2 16 12 7-15 8-1 16-14-9-14 9-1-16-15-8 12-7-2-16 13 7Z" fill="#cb8b61"/><path d="m32 16 6 13 13 6-12 7-7 10-6-10-13-7 13-6Z" fill="#f0c18d"/><path d="m32 26 7 9-7 9-7-9Z" fill="#db9b64"/>',
    earth: '<path d="M51 6C21 0 5 16 11 40c4 14 26 20 36 6S53 20 51 6Z" fill="#8fae76"/><path d="M17 51 43 14M27 37l-9-9m9 9 15 1m-7-14-8-8" fill="none" stroke="#d8e7b8" stroke-width="4" stroke-linecap="round"/><path d="m17 51-6 8" stroke="#91a470" stroke-width="4" stroke-linecap="round"/>'
  };
  return `<svg class="badge-art ${earned ? 'earned' : 'unearned'}" viewBox="0 0 64 64" role="img" aria-label="${esc(badge.name)}${earned ? ', earned' : ', not yet earned'}">${shape[badge.id] || ''}</svg>`;
}
function opponentPreview(c) {
  return `<div class="opponent-preview">${c.team.map(p => `<div class="opponent-preview-member">${art(BY_ID[p.id], '', '', false)}<strong>${esc(BY_ID[p.id].name)}</strong><span>Level ${p.level}</span></div>`).join('')}</div>`;
}
function challengeCard(c) {
  const max = challengeLevel(c), min = Math.min(...c.team.map(p => p.level));
  const wins = state.challengeWins[c.id] || 0, earned = c.badge && state.badges.includes(c.badge.id);
  const ace = BY_ID[c.team[c.team.length - 1].id];
  const prize = E.challengeRewards(c, Boolean(earned));
  return `<article class="challenge-card type-${c.type}"><div class="challenge-card-top"><span>${esc(c.kind === 'gym' ? c.location : c.title)}</span><span class="challenge-level">Lv. ${max}</span></div><div class="challenge-art">${c.badge ? badgeArt(c.badge, Boolean(earned)) : `<span class="trainer-monogram">${esc(c.name[0])}<small>${max >= 60 ? 'MASTER' : 'TRAINER'}</small></span>`}${art(ace, '', '', false)}</div><div class="challenge-name"><h3>${esc(c.name)}</h3>${earned ? `<span class="challenge-completed">${icon('check')}Badge earned</span>` : wins ? `<span class="challenge-completed">${icon('check')}${wins} ${wins === 1 ? 'win' : 'wins'}</span>` : ''}</div><p class="challenge-subtitle">${c.kind === 'gym' ? esc(c.title) : esc(c.location)}</p><div class="challenge-facts"><span class="type type-${c.type}">${c.type}</span><span>${c.team.length} Pokémon · Lv. ${min === max ? max : `${min}–${max}`}</span></div><p class="challenge-tagline">${esc(c.tagline)}</p><div class="challenge-prize">${icon(c.kind === 'gym' && !earned ? 'trophy' : 'bag')}<span>${c.kind === 'gym' && !earned ? esc(c.badge.name) + ' + supplies' : `${prize.loot.ultraBalls} Ultra Balls + more loot`}</span></div><button class="btn ${earned || wins ? 'secondary' : ''} small" data-action="challenge-preview" data-challenge="${c.id}">${earned || wins ? 'Ready for a rematch?' : 'Meet your challenger'} ${icon('arrow')}</button></article>`;
}
function renderLeague() {
  const gyms = CHALLENGES.filter(c => c.kind === 'gym');
  const challenges = CHALLENGES.filter(c => c.kind === (leagueTab === 'gyms' ? 'gym' : 'trainer'));
  main.innerHTML = `<div class="page-heading"><div><h1>A little courage. A new challenge.</h1><p>Battle a full team, earn useful loot, and collect a badge for every gym you beat.</p></div><button class="btn secondary small" data-action="heal">${icon('heart')}Heal & prepare</button></div><div class="league-cup-link"><a href="#tournaments">${icon('trophy')}New: three-round tournaments<span>Win trophies & unlock outfits ${icon('arrow')}</span></a></div><section class="badge-case"><div class="badge-case-heading"><div><span class="eyebrow">YOUR GYM JOURNEY</span><h2>Eight badges. Your own adventure.</h2></div><span class="badge-total">${icon('trophy')}<strong>${state.badges.length}</strong> / 8</span></div><div class="badge-grid">${gyms.map(c => `<button class="badge-slot ${state.badges.includes(c.badge.id) ? 'collected' : ''}" data-action="challenge-preview" data-challenge="${c.id}" aria-label="${esc(c.badge.name)}${state.badges.includes(c.badge.id) ? ', earned' : ', defeat '+esc(c.name)+' to earn'}">${badgeArt(c.badge, state.badges.includes(c.badge.id))}<strong>${esc(c.badge.name.replace(' Badge',''))}</strong><small>${state.badges.includes(c.badge.id) ? 'Collected' : 'Still to earn'}</small></button>`).join('')}</div></section><div class="collection-tabs league-tabs" role="tablist" aria-label="Battle league challenges"><button class="collection-tab ${leagueTab === 'gyms' ? 'active' : ''}" role="tab" aria-selected="${leagueTab === 'gyms'}" data-action="league-tab" data-tab="gyms">${icon('trophy')}Gym circuit<span>8</span></button><button class="collection-tab ${leagueTab === 'trainers' ? 'active' : ''}" role="tab" aria-selected="${leagueTab === 'trainers'}" data-action="league-tab" data-tab="trainers">${icon('swords')}Trainer challenges<span>Lv. 9–100</span></button></div><div class="league-field-note">${icon(leagueTab === 'gyms' ? 'shield' : 'sparkles')}<p>${leagueTab === 'gyms' ? 'Choose any gym, in any order. Your team starts fully healed. First victories earn a badge and a bigger reward; rematches earn more supplies.' : 'From a friendly trail scout to a level 100 master. Check the full lineup before you battle. Every victory earns Ultra Balls and useful supplies.'}</p></div><div class="league-grid">${challenges.map(challengeCard).join('')}</div><div class="league-bottom-note">${icon('heart')}Every setback is a chance to learn. Losing heals your team; your badges and collected Pokémon stay with you.</div>`;
}
function showChallenge(id) {
  const c = CHALLENGE_BY_ID[id];
  if (!c || battle && !battle.done) return;
  const earned = c.badge && state.badges.includes(c.badge.id);
  const prize = E.challengeRewards(c, Boolean(earned));
  const top = Math.max(...state.team.map(id => owned(id).level));
  openModal(`<div class="modal-body">${modalHead(c.kind === 'gym' ? c.title : c.title + ' ' + c.name)}<div class="challenger-intro type-${c.type}">${c.badge ? badgeArt(c.badge, Boolean(earned)) : `<span class="trainer-monogram">${esc(c.name[0])}<small>TRAINER</small></span>`}<div><span class="eyebrow">${c.kind === 'gym' ? 'GYM LEADER' : 'TRAINER CHALLENGE'}</span><h3>${esc(c.name)}</h3><p>${esc(c.location)} · ${c.team.length} Pokémon</p></div></div><p class="modal-description">${esc(c.tagline)} Defeat the entire team to win. Your team is healed and basic supplies are refilled before the match.</p>${opponentPreview(c)}<div class="challenge-advice ${top + 5 < challengeLevel(c) ? 'tough' : ''}">${icon(top + 5 < challengeLevel(c) ? 'shield' : 'leaf')}<div><strong>${top + 5 < challengeLevel(c) ? 'A big challenge for your current team' : 'A little preparation goes a long way'}</strong><p>Your strongest Pokémon is level ${top}. This team reaches level ${challengeLevel(c)}. ${esc(c.tip)}</p></div></div><div class="challenge-reward-preview"><h3>${earned ? 'Rematch rewards' : 'Victory rewards'}</h3>${c.badge && !earned ? `<p class="badge-reward-label">${icon('trophy')}${esc(c.badge.name)}</p>` : ''}<div class="loot-chips">${lootChips(prize.loot)}</div><p>+${prize.xp} XP for every Pokémon on your team</p></div><p class="modal-description" style="font-size:10px;margin-top:18px">Trainer Pokémon can’t be caught. Losing sends you safely to camp. You can try again anytime.</p><div class="modal-actions"><button class="btn secondary" data-action="close-modal">Prepare a little more</button><button class="btn" data-action="challenge-start" data-challenge="${c.id}">${icon('swords')}Let’s battle</button></div></div>`);
}
function startChallenge(id) {
  const returnTo = page === 'world' ? 'world' : 'league';
  const c = CHALLENGE_BY_ID[id];
  if (!c || battle && !battle.done) return;
  battle = null;
  healAll(true);
  const enemyTeam = c.team.map(p => E.makeOwned(BY_ID[p.id], p.level));
  battle = { kind:c.kind, returnTo, opponentId:c.id, enemyTeam, enemyIndex:0, enemy:enemyTeam[0], active:state.lead, habitat:c.habitat,
    turn:1, locked:false, done:false, ball:'poke', healing:'potion', failedAttempts:0, cooldowns:{}, enemyCooldown:0,
    log:[`${c.name} challenged you with ${c.team.length} Pokémon.`], message:`${c.name} sent out ${BY_ID[enemyTeam[0].id].name}!`,
    hint:'Defeat the whole team to earn the rewards. Switch and heal when you need to.', result:null };
  if (!state.seen.includes(enemyTeam[0].id)) state.seen.push(enemyTeam[0].id);
  save();
  if (modal.open) modal.close();
  if (location.hash !== '#battle') location.hash = 'battle'; else { page='battle'; render(); }
  sound('heal');
}
function opponentLineup(b) {
  if (!isTrainerBattle(b)) return '';
  const c = CHALLENGE_BY_ID[b.opponentId];
  return `<div class="opponent-lineup"><div class="opponent-lineup-label">${icon(c.kind === 'gym' ? 'trophy' : 'swords')}<span><strong>${esc(c.name)}’s team</strong><small>${b.enemyTeam.filter(p => p.hp <= 0).length} / ${b.enemyTeam.length} defeated</small></span></div><div class="opponent-team">${b.enemyTeam.map((p,i) => `<div class="opponent-token ${p.hp <= 0 ? 'defeated' : i === b.enemyIndex ? 'current' : ''}" title="${esc(BY_ID[p.id].name)} · Level ${p.level}${p.hp <= 0 ? ' · Defeated' : ''}">${art(BY_ID[p.id], '', '', false)}<span>${p.hp <= 0 ? icon('check') : 'Lv. '+p.level}</span></div>`).join('')}</div></div>`;
}
function showChallengeResult() {
  if (!battle?.result || !isTrainerBattle()) return;
  if (battle.kind === 'tournament') { showCupResult(); return; }
  const b=battle, c=CHALLENGE_BY_ID[b.opponentId], won=b.result.kind==='win', prize=b.result.prize;
  openModal(`<div class="modal-body"><div class="modal-header"><span class="eyebrow evolution-eyebrow">${won ? 'A CHALLENGE TO REMEMBER' : 'EVERY GREAT TEAM KEEPS LEARNING'}</span><button class="icon-button" data-action="close-modal" aria-label="Close challenge result">${icon('close')}</button></div><div class="result-panel"><div class="result-art challenge-result-art">${won && prize.newBadge ? badgeArt(c.badge,true) : art(BY_ID[state.lead])}</div><div class="eyebrow">${won ? prize.newBadge ? 'GYM BADGE EARNED' : 'LEAGUE VICTORY' : 'REST. REGROUP. TRY AGAIN.'}</div><h2 id="modal-title">${won ? prize.newBadge ? esc(c.badge.name)+'!' : `You beat ${esc(c.name)}!` : 'A little rest. A fresh start.'}</h2><p>${esc(b.hint)}</p>${prize ? `<div class="challenge-won-loot"><strong>Added to your backpack</strong><div class="loot-chips">${lootChips(prize.loot)}</div></div>` : ''}${b.result.rewards.length ? `<div class="reward-chips">${b.result.rewards.map(r=>`<span>${esc(r)}</span>`).join('')}</div>` : ''}${won && state.badges.length===8 ? `<p class="complete-circuit">${icon('trophy')}All eight badges! Your gym circuit is complete.</p>` : ''}</div>${evolutionNotice(state.team)}${moveLearningNotice()}<div class="modal-actions"><button class="btn secondary" data-action="result-team">My team</button><button class="btn" data-action="leave-battle">Battle league ${icon('arrow')}</button></div></div>`);
}
function itemPicker(kind) {
  if (kind === 'candy') {
    if (battle && !battle.done || !state.rareCandies) return;
    openModal(`<div class="modal-body">${modalHead('A little boost for a buddy.')}<p class="modal-description" style="margin-bottom:20px">A Rare Candy gives one travel buddy a level, keeping their current XP. You have ${state.rareCandies}. Add a Pokémon to your team to choose them here.</p><div class="switch-list">${state.team.map(id => { const p=owned(id);return `<button class="switch-option" data-action="use-candy" data-id="${id}" ${p.level >= 100 ? 'disabled' : ''}>${art(BY_ID[id])}<div><strong>${esc(BY_ID[id].name)}</strong><small>${p.level >= 100 ? 'Already at the highest level' : `Level ${p.level} → ${p.level + 1}`}</small></div>${icon('sparkles')}</button>`; }).join('')}</div></div>`);
  } else {
    if (!canAct() || !state.revives) return;
    const fainted = state.team.filter(id => owned(id).hp <= 0);
    if (!fainted.length) return;
    openModal(`<div class="modal-body">${modalHead('Back on their feet.')}<p class="modal-description" style="margin-bottom:20px">Revive a fainted teammate with half their HP. This uses your turn. You have ${state.revives} Revives.</p><div class="switch-list">${fainted.map(id => `<button class="switch-option" data-action="use-revive" data-id="${id}">${art(BY_ID[id])}<div><strong>${esc(BY_ID[id].name)}</strong><small>Restores ${Math.ceil(E.maxHP(BY_ID[id],owned(id).level) / 2)} HP</small></div>${icon('heart')}</button>`).join('')}</div></div>`);
  }
}
function giveCandy(id) {
  if (battle && !battle.done) return;
  const p = E.useRareCandy(state, id, BY_ID);
  if (!p) return;
  save(); render(); sound('heal');
  openModal(`<div class="modal-body">${modalHead('Growing a little stronger.')}<div class="result-panel"><div class="result-art">${art(BY_ID[id])}</div><h3>${esc(BY_ID[id].name)} is level ${p.level}!</h3><p>One Rare Candy used. ${state.rareCandies} left in your backpack.</p></div>${evolutionNotice([id])}<div class="modal-actions"><button class="btn secondary" data-action="close-modal">All done</button>${state.rareCandies && state.team.some(id => owned(id).level < 100) ? `<button class="btn" data-action="candy-picker">Give another candy ${icon('sparkles')}</button>` : ''}</div></div>`);
}
async function useRevive(id) {
  if (!canAct() || !state.revives || !state.team.includes(id) || owned(id).hp > 0) return;
  const b = battle, friend = owned(id);
  b.locked = true; state.revives--; friend.hp = Math.ceil(E.maxHP(BY_ID[id], friend.level) / 2);
  if (modal.open) modal.close();
  b.log.push(`${BY_ID[id].name} recovered ${friend.hp} HP with a Revive.`);
  save(); sound('heal');
  announce(b, `${BY_ID[id].name} is ready to help again!`, 'Using a Revive takes your turn. Your opponent goes next.');
  await delay(450); if (current(b)) await enemyTurn(b);
}
