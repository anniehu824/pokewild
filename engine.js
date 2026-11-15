/* Small, testable rules for a forgiving Pokémon adventure. */
(function (root) {
  'use strict';
  const MOVES = {
    normal: ['Tackle', 'Body Slam'], fire: ['Ember', 'Flamethrower'], water: ['Water Gun', 'Surf'],
    grass: ['Vine Whip', 'Solar Beam'], electric: ['Thunder Shock', 'Thunderbolt'], ice: ['Powder Snow', 'Ice Beam'],
    fighting: ['Karate Chop', 'Brick Break'], poison: ['Poison Sting', 'Sludge Bomb'], ground: ['Mud Shot', 'Earth Power'],
    flying: ['Gust', 'Air Slash'], psychic: ['Confusion', 'Psychic'], bug: ['Struggle Bug', 'Bug Buzz'],
    rock: ['Rock Throw', 'Rock Slide'], ghost: ['Lick', 'Shadow Ball'], dragon: ['Dragon Breath', 'Dragon Pulse'],
    dark: ['Bite', 'Dark Pulse'], steel: ['Metal Claw', 'Flash Cannon'], fairy: ['Fairy Wind', 'Moonblast']
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const maxHP = (species, level) => Math.round(25 + level * 4 + species.stats[0] * .32);
  const nextXP = level => 35 + level * 12;
  function makeOwned(species, level = 8) { return { id: species.id, level, xp: 0, hp: maxHP(species, level) }; }
  function typeEffect(type, targetTypes, chart) { return targetTypes.reduce((n, t) => n * (chart[type]?.[t] ?? 1), 1); }
  function moves(species) {
    const primary = species.types[0], second = species.types[1];
    return [
      { name: MOVES[primary][0], type: primary, power: 40, description: 'A steady, reliable move' },
      { name: second ? MOVES[second][0] : 'Quick Attack', type: second || 'normal', power: 38, description: second ? 'Try a different type' : 'A reliable Normal-type move' },
      { name: MOVES[primary][1], type: primary, power: 65, cooldown: 2, description: 'Power move · 2-turn recharge' },
      { name: 'Gentle tap', type: 'normal', power: 18, gentle: true, description: 'Always leaves at least 1 HP' }
    ];
  }
  function damage(attacker, defender, move, attackerSpecies, defenderSpecies, chart, options = {}) {
    let effect = move.gentle ? 1 : typeEffect(move.type, defenderSpecies.types, chart);
    if (effect === 0) return { amount: 0, effectiveness: 0 };
    const attack = attackerSpecies.stats[move.type === 'normal' || move.gentle ? 1 : 3];
    const defense = defenderSpecies.stats[move.type === 'normal' || move.gentle ? 2 : 4];
    const stab = !move.gentle && attackerSpecies.types.includes(move.type) ? 1.12 : 1;
    const rng = options.rng || Math.random;
    const variance = .93 + rng() * .14;
    const base = ((2 * attacker.level / 5 + 2) * move.power * (.65 + attack / 200) / (.65 + defense / 200)) / 16 + 3;
    let amount = Math.max(1, Math.round(base * clamp(effect, .35, 2) * stab * variance * (options.scale ?? 1)));
    if (move.gentle) amount = Math.min(amount, Math.max(0, defender.hp - 1));
    return { amount: Math.min(amount, defender.hp), effectiveness: effect };
  }
  function catchChance(species, enemy, ball = 'poke', failedAttempts = 0, difficulty = 'balanced', context = {}) {
    const health = enemy.hp / maxHP(species, enemy.level);
    const special = species.legendary || species.mythical;
    let chance = special ? .065 + (1 - health) * .48 + species.capture / 255 * .045 : .28 + (1 - health) * .53 + species.capture / 255 * .13;
    if (ball === 'great') chance *= 1.35;
    if (ball === 'ultra') chance *= 1.75;
    if (ball === 'quick' && context.turn === 1) chance *= 2;
    if (ball === 'net' && species.types.some(type => type === 'water' || type === 'bug')) chance *= 2;
    if (ball === 'dusk' && context.habitat === 'dusk') chance *= 2;
    if (ball === 'repeat' && context.caught) chance *= 2;
    if (difficulty === 'gentle') chance += .1;
    if (difficulty === 'brave') chance -= .045;
    // Repeated attempts at low health guarantee eventual success.
    if (health <= .25 && failedAttempts >= (special ? 4 : 2)) return 1;
    return clamp(chance, .05, .97);
  }
  function grantXP(owned, species, amount) {
    const oldLevel = owned.level;
    owned.xp += amount;
    while (owned.level < 100 && owned.xp >= nextXP(owned.level)) {
      owned.xp -= nextXP(owned.level);
      const oldMax = maxHP(species, owned.level);
      owned.level++;
      if (owned.hp > 0) owned.hp += maxHP(species, owned.level) - oldMax;
    }
    if (owned.level === 100) owned.xp = 0;
    owned.hp = clamp(owned.hp, 0, maxHP(species, owned.level));
    return owned.level - oldLevel;
  }
  function evolutionOptions(pokemon, paths) {
    if (!pokemon) return [];
    return (paths[pokemon.id] || []).map(path => ({ ...path, ready: pokemon.level >= path.level, remaining: Math.max(0, path.level - pokemon.level) }));
  }
  function evolvePokemon(state, from, to, byId, paths) {
    const source = state.owned.find(p => p.id === from);
    const option = evolutionOptions(source, paths).find(path => path.to === to);
    if (!source || !option || !option.ready || !byId[to] || from === to) return null;
    const existing = state.owned.find(p => p.id === to);
    const history = state.caught || state.owned.map(p => p.id);
    const evolved = { ...source, id: to };
    const newMax = maxHP(byId[to], evolved.level);
    evolved.hp = source.hp === 0 ? 0 : clamp(source.hp + newMax - maxHP(byId[from], source.level), 1, newMax);
    // The collection has one entry per species. Preserve the best progression
    // and health if the destination species is already in the collection.
    if (existing) {
      const best = existing.level > evolved.level || existing.level === evolved.level && existing.xp > evolved.xp ? existing : evolved;
      const max = maxHP(byId[to], best.level);
      const healthAtLevel = p => p.hp === 0 ? 0 : clamp(p.hp + max - maxHP(byId[to], p.level), 1, max);
      const hp = Math.max(healthAtLevel(evolved), healthAtLevel(existing));
      evolved.level = best.level;
      evolved.xp = best.xp;
      evolved.hp = hp;
    }
    root.AdventureEngine?.evolveDetails(state, source, existing, evolved);
    state.owned = state.owned.flatMap(p => p.id === from ? [evolved] : p.id === to ? [] : [p]);
    state.team = [...new Set(state.team.map(id => id === from ? to : id))];
    if (state.lead === from) state.lead = to;
    state.caught = [...new Set([...history, from, to])];
    state.seen = [...new Set([...state.seen, from, to])];
    state.evolutions = (state.evolutions || 0) + 1;
    return { from, to, level: evolved.level, combined: Boolean(existing), pokemon: evolved };
  }
  function challengeRewards(challenge, hasBadge = false) {
    const rematch = challenge.kind === 'gym' && hasBadge;
    const loot = Object.fromEntries(Object.entries(challenge.loot).map(([item, count]) => [item, rematch ? Math.ceil(count / 2) : count]));
    const xp = Math.round(challenge.team.reduce((total, p) => total + 30 + p.level * 10, 0) * (challenge.kind === 'gym' ? 1.5 : 1.25));
    return { loot, xp, trainerXP: challenge.kind === 'gym' ? 70 : 45, newBadge: challenge.kind === 'gym' && !hasBadge ? challenge.badge.id : null };
  }
  function trainerMove(enemy, player, enemySpecies, playerSpecies, chart, cooldown = 0, rng = Math.random) {
    const available = moves(enemySpecies).slice(0, 3).filter(move => (!move.cooldown || cooldown === 0) && typeEffect(move.type, playerSpecies.types, chart) > 0);
    if (!available.length) return { name: 'Wild strike', type: 'typeless', power: 30 };
    const strongest = [...available].sort((a, b) => damage(enemy, player, b, enemySpecies, playerSpecies, chart, { rng: () => .5 }).amount - damage(enemy, player, a, enemySpecies, playerSpecies, chart, { rng: () => .5 }).amount)[0];
    return rng() < .7 ? strongest : available[Math.floor(rng() * available.length)];
  }
  function useRareCandy(state, id, byId) {
    const pokemon = state.owned.find(p => p.id === id);
    if (!pokemon || !state.team.includes(id) || !state.rareCandies || pokemon.level >= 100) return null;
    state.rareCandies--;
    grantXP(pokemon, byId[id], nextXP(pokemon.level));
    return pokemon;
  }
  function freshState(byId) {
    const state = { version: 1, owned: [1, 4, 7].map(id => makeOwned(byId[id])), team: [1, 4, 7], lead: 1,
      seen: [1, 4, 7], caught: [1, 4, 7], evolutions: 0, wins: 0, captures: 0, encounters: 0, trainerXP: 0, potions: 8, greatBalls: 5,
      ultraBalls: 0, quickBalls: 2, netBalls: 2, duskBalls: 2, repeatBalls: 2,
      superPotions: 0, revives: 0, rareCandies: 0, badges: [], trainerWins: 0, gymWins: 0, challengeWins: {},
      region: 1, location: 'meadow', settings: { name: 'Rookie Trainer', difficulty: 'balanced', sound: false } };
    return root.AdventureEngine ? root.AdventureEngine.extendState(state) : state;
  }
  function validateSave(raw, byId) {
    if (!raw || raw.version !== 1 || !Array.isArray(raw.owned) || !Array.isArray(raw.team) || !raw.owned.length) throw new Error('This is not a Pokéwild save.');
    const clean = freshState(byId), seenOwned = new Set();
    const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
    clean.owned = raw.owned.map(p => {
      if (!byId[p.id] || seenOwned.has(p.id) || !integer(p.level, 1, 100) || !integer(p.xp, 0, nextXP(p.level) - 1) || !integer(p.hp, 0, maxHP(byId[p.id], p.level))) throw new Error('Some Pokémon in this save could not be read.');
      seenOwned.add(p.id);
      return { id: p.id, level: p.level, xp: p.xp, hp: p.hp, ...(root.AdventureEngine?.cleanPokemon(p, byId[p.id]) || {}) };
    });
    if (raw.team.length < 1 || raw.team.length > 6 || new Set(raw.team).size !== raw.team.length || raw.team.some(id => !seenOwned.has(id))) throw new Error('The team in this save is invalid.');
    clean.team = [...raw.team];
    clean.lead = clean.team.includes(raw.lead) ? raw.lead : clean.team[0];
    clean.caught = [...new Set([...(Array.isArray(raw.caught) ? raw.caught.filter(id => Number.isInteger(id) && byId[id]) : []), ...seenOwned])];
    clean.seen = [...new Set([...(Array.isArray(raw.seen) ? raw.seen.filter(id => Number.isInteger(id) && byId[id]) : []), ...clean.caught])];
    for (const key of ['wins', 'captures', 'encounters', 'trainerXP', 'potions', 'greatBalls', 'evolutions', 'ultraBalls', 'quickBalls', 'netBalls', 'duskBalls', 'repeatBalls', 'superPotions', 'revives', 'rareCandies', 'trainerWins', 'gymWins']) {
      if (integer(raw[key], 0, 10000000)) clean[key] = raw[key];
    }
    const badgeIds = ['boulder', 'cascade', 'thunder', 'rainbow', 'soul', 'marsh', 'volcano', 'earth'];
    clean.badges = [...new Set(Array.isArray(raw.badges) ? raw.badges.filter(id => badgeIds.includes(id)) : [])];
    if (raw.challengeWins && typeof raw.challengeWins === 'object' && !Array.isArray(raw.challengeWins)) {
      for (const [id, count] of Object.entries(raw.challengeWins)) {
        if (/^[a-z]+(?:-[a-z]+)+$/.test(id) && id.length <= 60 && integer(count, 0, 10000000)) clean.challengeWins[id] = count;
      }
    }
    if (integer(raw.region, 0, 9)) clean.region = raw.region;
    if (['meadow', 'river', 'volcano', 'dusk'].includes(raw.location)) clean.location = raw.location;
    clean.settings.name = typeof raw.settings?.name === 'string' ? raw.settings.name.trim().slice(0, 24) || 'Rookie Trainer' : 'Rookie Trainer';
    if (['gentle', 'balanced', 'brave'].includes(raw.settings?.difficulty)) clean.settings.difficulty = raw.settings.difficulty;
    clean.settings.sound = raw.settings?.sound === true;
    return root.AdventureEngine ? root.AdventureEngine.extendSave(raw, clean, byId) : clean;
  }
  root.PokeEngine = { clamp, maxHP, nextXP, makeOwned, typeEffect, moves, damage, catchChance, grantXP, evolutionOptions, evolvePokemon, challengeRewards, trainerMove, useRareCandy, freshState, validateSave };
})(typeof window !== 'undefined' ? window : globalThis);
