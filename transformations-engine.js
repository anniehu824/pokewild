/* Temporary battle forms. Collection IDs, moves, and saved HP always stay normal. */
(function (root) {
  'use strict';
  const forms = root.TRANSFORMATION_DATA || [];
  const byKey = Object.fromEntries(forms.map(form => [form.key, form]));
  const maxNames = {normal:'Max Strike',fire:'Max Flare',water:'Max Geyser',grass:'Max Overgrowth',electric:'Max Lightning',ice:'Max Hailstorm',fighting:'Max Knuckle',poison:'Max Ooze',ground:'Max Quake',flying:'Max Airstream',psychic:'Max Mindstorm',bug:'Max Flutterby',rock:'Max Rockfall',ghost:'Max Phantasm',dragon:'Max Wyrmwind',dark:'Max Darkness',steel:'Max Steelspike',fairy:'Max Starfall'};
  function options(id, kind) { return forms.filter(form => form.species === id && (!kind || form.kind === kind)); }
  function active(battle, id) {
    return battle && !battle.done && battle.transformation?.pokemonId === id ? byKey[battle.transformation.key] || null : null;
  }
  function species(battle, pokemon, base) {
    const form = active(battle, pokemon.id);
    return form ? {...base, name:form.name, types:form.types, stats:form.kind === 'mega' ? form.stats : base.stats, battleForm:form.key} : base;
  }
  function health(battle, pokemon, base) {
    const max = root.PokeEngine.maxHP(base, pokemon.level);
    return active(battle, pokemon.id)?.kind === 'gmax' ? {hp:battle.transformation.hp, max:max * 2} : {hp:pokemon.hp, max};
  }
  function combatant(battle, pokemon, base) { return {...pokemon, hp:health(battle,pokemon,base).hp}; }
  function start(battle, pokemon, key) {
    const form = byKey[key];
    if (!battle || battle.done || battle.locked || battle.powerUsed || !pokemon || pokemon.hp <= 0 || pokemon.id !== battle.active || !form || form.species !== pokemon.id) return null;
    battle.powerUsed = true;
    battle.transformation = {key, pokemonId:pokemon.id, turns:form.kind === 'gmax' ? 3 : null, hp:pokemon.hp * 2};
    return form;
  }
  function hurt(battle, pokemon, amount) {
    amount = Math.max(0, Math.round(amount));
    if (active(battle,pokemon.id)?.kind === 'gmax') {
      battle.transformation.hp = Math.max(0, battle.transformation.hp - amount);
      // Persist only ordinary HP, including while an animation or reload interrupts a turn.
      pokemon.hp = Math.ceil(battle.transformation.hp / 2);
    } else pokemon.hp = Math.max(0, pokemon.hp - amount);
    if (pokemon.hp === 0) end(battle,pokemon);
  }
  function heal(battle, pokemon, base, fraction) {
    const before = health(battle,pokemon,base);
    const gain = Math.min(before.max - before.hp, Math.round(before.max * fraction));
    if (active(battle,pokemon.id)?.kind === 'gmax') {
      battle.transformation.hp += gain;
      pokemon.hp = Math.ceil(battle.transformation.hp / 2);
    } else pokemon.hp += gain;
    return gain;
  }
  function end(battle, pokemon) {
    if (!battle?.transformation || battle.transformation.pokemonId !== pokemon?.id) return null;
    const form = byKey[battle.transformation.key];
    if (form?.kind === 'gmax') pokemon.hp = Math.ceil(battle.transformation.hp / 2);
    battle.transformation = null;
    return form;
  }
  function tick(battle, pokemon) {
    if (active(battle,pokemon.id)?.kind !== 'gmax') return null;
    battle.transformation.turns--;
    return battle.transformation.turns <= 0 ? end(battle,pokemon) : null;
  }
  function switchOut(battle, pokemon) {
    return active(battle,pokemon.id)?.kind === 'gmax' ? end(battle,pokemon) : null;
  }
  function moves(battle, pokemon, equipped) {
    const form = active(battle,pokemon.id);
    if (form?.kind !== 'gmax') return equipped;
    const signatureSlot = equipped.some(move => !move.gentle && move.type === form.gmaxType) ? -1 : equipped.findIndex(move => !move.gentle);
    return equipped.map((move,index) => {
      if (move.gentle) return move; // Catching always has a safe option.
      const signature = move.type === form.gmaxType || index === signatureSlot;
      return {...move, type:signature ? form.gmaxType : move.type, name:signature ? form.gmaxMove : maxNames[move.type] || 'Max Strike', power:Math.round(move.power * 1.3), cooldown:0, maxMove:true,
        description:`${signature ? 'G-Max' : 'Max'} move · 30% more power · no recharge while Gigantamaxed`};
    });
  }
  root.TransformationEngine = {forms,byKey,options,active,species,health,combatant,start,hurt,heal,end,tick,switchOut,moves};
})(typeof window !== 'undefined' ? window : globalThis);
