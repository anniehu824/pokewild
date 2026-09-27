const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const dir=path.resolve(__dirname,'..'),context={window:{},Math};vm.createContext(context);
for(const f of ['data.js','evolutions.js','challenges.js','adventure-data.js','engine.js','adventure-engine.js','transformations-data.js','transformations-engine.js'])vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),context);
const {POKEMON_DATA:all,PokeEngine:E,TransformationEngine:T,AdventureEngine:A,EVOLUTION_DATA:paths,TYPE_CHART:chart}=context.window,byId=Object.fromEntries(all.map(p=>[p.id,p]));
let assertions=0;function check(value,message){assert.ok(value,message);assertions++;}
function battle(id){return {active:id,locked:false,done:false};}
check(T.forms.length===131,'Complete current catalog');
check(new Set(T.forms.map(f=>f.key)).size===131,'Unique form IDs');
check(T.options(1).length===0&&T.options(4).length===0&&T.options(7).length===0,'Unevolved starters cannot transform');
check(T.options(6,'mega').length===2&&T.options(150,'mega').length===2,'Charizard and Mewtwo choices');
check(T.options(25,'gmax').length===1&&T.options(133,'gmax').length===1,'Pikachu and Eevee eligible');
check(T.options(998,'mega').length===1,'Newer Mega forms included');
for(const f of T.forms){
 const s=byId[f.species],p=E.makeOwned(s,50),b=battle(p.id),original=JSON.stringify(p);
 check(!!s&&f.types.every(t=>all.some(s=>s.types.includes(t)))&&f.stats.length===6&&f.stats.every(n=>n>0),'Valid types/stats: '+f.key);
 for(const color of ['normal','shiny'])check(fs.existsSync(path.join(dir,'assets/forms',color,f.key+'.png')),'Local art '+f.key+' '+color);
 check(T.start(b,p,f.key)===f,'Eligible form starts');
 check(JSON.stringify(p)===original,'Transformation does not mutate collection');
 check(T.start(b,p,f.key)===null,'Cannot transform twice');
 check(T.species(b,p,s).name===f.name,'Battle name changes');
 check(JSON.stringify(T.species(b,p,s).types)===JSON.stringify(f.types),'Battle types change');
 const defaults=A.equippedMoves(p,s),before=JSON.stringify(defaults),maxMoves=T.moves(b,p,defaults);
 if(f.kind==='mega'){
   check(T.health(b,p,s).max===E.maxHP(s,50),'Mega HP stays normal');
   check(JSON.stringify(T.species(b,p,s).stats)===JSON.stringify(f.stats),'Mega stats active');
   T.tick(b,p);T.switchOut(b,p);check(T.active(b,p.id)===f,'Mega persists across turns and switching');
 }else{
   check(T.health(b,p,s).hp===p.hp*2&&T.health(b,p,s).max===E.maxHP(s,50)*2,'Gigantamax doubles current and max HP');
   check(maxMoves.some(m=>m.name===f.gmaxMove&&m.type===f.gmaxType),'Every form can use its signature');
   check(maxMoves[3].gentle&&maxMoves[3].power===defaults[3].power,'Gentle tap stays safe');
   check(maxMoves.filter(m=>!m.gentle).every(m=>m.cooldown===0&&m.maxMove),'Max moves need no cooldown');
   T.tick(b,p);check(b.transformation.turns===2,'Second turn');T.tick(b,p);check(b.transformation.turns===1,'Third turn');
   check(T.tick(b,p)===f&&!T.active(b,p.id),'Gigantamax expires after exactly three turns');
 }
 check(JSON.stringify(defaults)===before,'Equipped moves never mutated');
 T.end(b,p);check(JSON.stringify(p)===original,'Expiry does not heal or change collection');
 check(T.start(b,p,f.key)===null,'Spent transformation remains spent after expiry');
}
// Temporary HP does not become permanent healing across saves, switches, or fainting.
for(const hp of [1,2,7,87,200])for(const damage of [0,1,2,3,40,399,400,999]){
 const s=byId[6],p=E.makeOwned(s,70),b=battle(6);p.hp=hp;
 T.start(b,p,'charizard-gmax');T.hurt(b,p,damage);
 const expected=Math.ceil(Math.max(0,hp*2-damage)/2);
 check(p.hp===expected,'Damage stored in ordinary HP units');
 const save=E.freshState(byId);save.owned=[p];save.team=[6];save.lead=6;
 check(E.validateSave(save,byId).owned[0].hp===expected,'Reloaded HP is normalized');
 T.switchOut(b,p);check(p.hp===expected&&!T.active(b,6),'Switch ends Gigantamax without healing');
 if(expected===0)check(T.start(b,p,'charizard-gmax')===null,'Fainted cannot transform');
}
{
 const s=byId[6],p=E.makeOwned(s,40),b=battle(6);p.hp=30;T.start(b,p,'charizard-gmax');T.hurt(b,p,1);
 check(T.health(b,p,s).hp===59,'Odd damage tracked exactly');
 const gain=T.heal(b,p,s,.6);check(gain===Math.round(T.health(b,p,s).max*.6),'Potion heals 60% transformed HP');
 T.heal(b,p,s,1);check(p.hp===E.maxHP(s,40)&&T.health(b,p,s).hp===E.maxHP(s,40)*2,'Super Potion full HP');
 T.end(b,p);check(p.hp===E.maxHP(s,40),'Healing remains bounded after reversion');
}
{
 const p=E.makeOwned(byId[6],50),foe=E.makeOwned(byId[143],50),b=battle(6),move=E.moves(byId[6])[0];
 const base=E.damage(p,foe,move,byId[6],byId[143],chart,{rng:()=>.5}).amount;
 T.start(b,p,'charizard-mega-y');const boosted=E.damage(p,foe,move,T.species(b,p,byId[6]),byId[143],chart,{rng:()=>.5}).amount;
 check(boosted>base,'Mega stats actually boost battle damage');
 const b2=battle(6);T.start(b2,p,'charizard-mega-x');check(T.species(b2,p,byId[6]).types.includes('dragon'),'Charizard X becomes Dragon type');
 check(E.typeEffect('ground',T.species(b2,p,byId[6]).types,chart)>0&&E.typeEffect('ground',byId[6].types,chart)===0,'Mega type changes affect incoming moves');
}
{
 const p=E.makeOwned(byId[1],10),b=battle(1);check(T.start(b,p,'venusaur-mega')===null,'Wrong species denied');
 b.active=6;check(T.start(b,p,'charizard-mega-x')===null,'Non-active Pokémon denied');
 const c=E.makeOwned(byId[6],50);b.locked=true;check(!T.start(b,c,'charizard-gmax'),'Mid-turn activation denied');b.locked=false;b.done=true;check(!T.start(b,c,'charizard-gmax'),'Finished battle denied');
 b.done=false;c.hp=0;check(!T.start(b,c,'charizard-gmax'),'Fainted activation denied');c.hp=100;check(!T.start(b,c,'missing'),'Unknown form denied');
}
console.log(`PASS ${assertions} transformation checks across ${T.forms.length} forms`);
