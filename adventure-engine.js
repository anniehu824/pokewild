(function(root){
  'use strict';
  const D=root.ADVENTURE_DATA, E=root.PokeEngine;
  const advanced={normal:['Headbutt','Hyper Voice','Giga Impact'],fire:['Flame Wheel','Fire Blast','Overheat'],water:['Bubble Beam','Hydro Pump','Water Spout'],grass:['Razor Leaf','Energy Ball','Leaf Storm'],electric:['Spark','Discharge','Thunder'],ice:['Ice Shard','Blizzard','Freeze Shock'],fighting:['Force Palm','Aura Sphere','Close Combat'],poison:['Acid','Venoshock','Gunk Shot'],ground:['Bulldoze','Earthquake','Precipice Blades'],flying:['Wing Attack','Hurricane','Brave Bird'],psychic:['Psybeam','Extrasensory','Psystrike'],bug:['Bug Bite','X-Scissor','Megahorn'],rock:['Rock Tomb','Stone Edge','Rock Wrecker'],ghost:['Hex','Shadow Punch','Phantom Force'],dragon:['Dragon Tail','Dragon Claw','Draco Meteor'],dark:['Feint Attack','Crunch','Night Daze'],steel:['Iron Head','Flash Cannon','Steel Beam'],fairy:['Draining Kiss','Dazzling Gleam','Fleur Cannon']};
  function movePool(species){
    const base=E.moves(species).map((m,i)=>({...m,id:'base-'+i,level:1}));
    const learned=species.types.flatMap(type=>advanced[type].map((name,i)=>({id:type+'-'+i,name,type,level:[12,25,45][i],power:[50,78,100][i],cooldown:i?[2,2,3][i]:0,description:i?'A powerful move with a recharge.':'A reliable move, learned through training.'})));
    return [...base,{id:'swift',name:'Swift',type:'normal',level:10,power:48,description:'A steady Normal-type attack.'},{id:'rock-smash',name:'Rock Smash',type:'fighting',level:20,power:40,description:'A Fighting-type move for a little extra coverage.'},...learned];
  }
  function equippedMoves(pokemon,species,trainer=false){
    const pool=movePool(species),keys=pokemon?.moves?.length===4?pokemon.moves:['base-0','base-1','base-2','base-3'];
    return keys.map((key,i)=>pool.find(m=>m.id===key && m.level<=(pokemon?.level||1))||pool[i]).map(m=>trainer&&m.gentle?{...m,name:'Steady Strike',gentle:false,type:'normal',power:32,description:'A reliable Normal-type attack.'}:m);
  }
  function equipMove(state,id,key,slot,byId){
    const p=state.owned.find(p=>p.id===id),move=p&&movePool(byId[id]).find(m=>m.id===key && m.level<=p.level);
    if(!move||!Number.isInteger(slot)||slot<0||slot>3)return false;
    const keys=equippedMoves(p,byId[id]).map(m=>m.id);
    if(keys.includes(key))return false;
    keys[slot]=key;p.moves=keys;return true;
  }
  function extendState(state){
    state.world={area:'town',x:8,y:8,visited:['town'],treasures:[],steps:0,grassSteps:0,rescued:false,returned:false};
    state.quests={claimed:[],grand:false};state.shinies=[];state.shinyStreak=0;state.outings=0;
    state.tournamentRun=null;state.trophies={};state.tournamentWins=0;
    state.style={outfit:'meadow',bag:'sand',title:'rookie',skin:'peach'};
    return state;
  }
  function cleanPokemon(raw,species){
    const clean={};
    // Keep the order of optional fields so backup round-trips are stable.
    for(const key of Object.keys(raw)){
      if(key==='shiny'&&raw.shiny===true)clean.shiny=true;
      if(key==='friendship'&&Number.isInteger(raw.friendship)&&raw.friendship>=0&&raw.friendship<=100)clean.friendship=raw.friendship;
      if(key==='care'&&raw.care&&Number.isInteger(raw.care.cycle)&&raw.care.cycle>=0)clean.care={cycle:raw.care.cycle,actions:[...new Set(Array.isArray(raw.care.actions)?raw.care.actions.filter(a=>['feed','pet','play'].includes(a)):[])]};
      if(key==='moves'&&Array.isArray(raw.moves)&&raw.moves.length===4&&new Set(raw.moves).size===4&&raw.moves.every(id=>movePool(species).some(m=>m.id===id&&m.level<=raw.level)))clean.moves=[...raw.moves];
    }
    return clean;
  }
  const integer=(x,max=10000000)=>Number.isInteger(x)&&x>=0&&x<=max;
  function extendSave(raw,clean,byId){
    const w=raw.world;
    if(w&&D.areas[w.area]){
      clean.world.area=w.area;const area=D.areas[w.area];
      if(integer(w.x,15)&&integer(w.y,9)&&walkable(w.area,w.x,w.y)){clean.world.x=w.x;clean.world.y=w.y;}else [clean.world.x,clean.world.y]=area.spawn;
      clean.world.visited=[...new Set(['town',...(Array.isArray(w.visited)?w.visited.filter(id=>D.areas[id]):[]),w.area])];
      clean.world.treasures=[...new Set(Array.isArray(w.treasures)?w.treasures.filter(id=>Object.values(D.areas).some(a=>a.objects.some(o=>o.kind==='chest'&&o.id===id))):[])];
      for(const key of ['steps','grassSteps'])if(integer(w[key]))clean.world[key]=w[key];
      clean.world.rescued=w.rescued===true;clean.world.returned=clean.world.rescued&&w.returned===true;
    }
    clean.quests.claimed=[...new Set(Array.isArray(raw.quests?.claimed)?raw.quests.claimed.filter(id=>D.quests.some(q=>q.id===id)):[])];
    clean.quests.grand=raw.quests?.grand===true&&clean.quests.claimed.length===D.quests.length;
    clean.shinies=[...new Set([...(Array.isArray(raw.shinies)?raw.shinies.filter(id=>Number.isInteger(id)&&byId[id]):[]),...clean.owned.filter(p=>p.shiny).map(p=>p.id)])];
    for(const key of ['outings','tournamentWins','shinyStreak'])if(integer(raw[key]))clean[key]=raw[key];
    clean.shinyStreak=Math.min(79,clean.shinyStreak);
    for(const cup of D.cups)if(integer(raw.trophies?.[cup.id]))clean.trophies[cup.id]=raw.trophies[cup.id];
    if(raw.tournamentRun&&D.cups.some(c=>c.id===raw.tournamentRun.id)&&integer(raw.tournamentRun.round,2))clean.tournamentRun={id:raw.tournamentRun.id,round:raw.tournamentRun.round};
    for(const [key,group] of [['outfit','outfits'],['bag','bags'],['title','titles'],['skin','skinTones']]){
      const item=D[group].find(i=>i.id===raw.style?.[key]);if(item&&(key==='skin'||unlocked(clean,item.rule)))clean.style[key]=item.id;
    }
    return clean;
  }
  function evolveDetails(state,source,existing,evolved){
    if(source.shiny||existing?.shiny){evolved.shiny=true;if(state.shinies)state.shinies=[...new Set([...state.shinies,...(source.shiny?[source.id]:[]),evolved.id])];}
    if(source.friendship!==undefined||existing?.friendship!==undefined)evolved.friendship=Math.max(source.friendship||0,existing?.friendship||0);
    delete evolved.moves; // The new species has its own move choices.
    if(existing?.care?.cycle===state.outings||source.care?.cycle===state.outings)evolved.care={cycle:state.outings,actions:[...new Set([...(source.care?.cycle===state.outings?source.care.actions:[]),...(existing?.care?.cycle===state.outings?existing.care.actions:[])])]};
  }
  function questProgress(state,id,byId){
    if(id==='field-trip')return state.world.visited.filter(id=>id!=='town').length;
    if(id==='water-friends')return Math.min(3,state.caught.filter(id=>byId[id].types.includes('water')).length);
    if(id==='lost-eevee')return state.world.returned?2:state.world.rescued?1:0;
    if(id==='close-buddies')return Math.min(40,Math.max(0,...state.owned.map(p=>p.friendship||0)));
    if(id==='first-challenge')return Math.min(1,state.trainerWins+state.gymWins+state.tournamentWins);
    return 0;
  }
  function grantLoot(state,loot){for(const [key,n]of Object.entries(loot))if(['ultraBalls','superPotions','revives','rareCandies'].includes(key))state[key]+=n;}
  function befriend(state,id,level,byId,shiny=false){
    let p=state.owned.find(p=>p.id===id);
    if(!p){p=E.makeOwned(byId[id],level);state.owned.push(p);if(state.team.length<6)state.team.push(id);}
    if(shiny){p.shiny=true;state.shinies=[...new Set([...state.shinies,id])];}
    state.caught=[...new Set([...state.caught,id])];state.seen=[...new Set([...state.seen,id])];return p;
  }
  function claimQuest(state,id,byId){
    const q=D.quests.find(q=>q.id===id);
    if(!q||state.quests.claimed.includes(id)||questProgress(state,id,byId)<q.goal)return null;
    state.quests.claimed.push(id);grantLoot(state,q.reward);
    if(id==='lost-eevee')befriend(state,133,12,byId);
    return q;
  }
  function claimGrand(state,byId){
    if(state.quests.grand||state.quests.claimed.length!==D.quests.length)return null;
    state.quests.grand=true;return befriend(state,77,15,byId,true);
  }
  function rollShiny(state,rng=Math.random){
    const yes=state.shinyStreak>=79||rng()<1/64;state.shinyStreak=yes?0:state.shinyStreak+1;return yes;
  }
  function care(state,id,action){
    const p=state.owned.find(p=>p.id===id),amount={feed:10,pet:8,play:12}[action];
    if(!p||!amount||(p.friendship||0)>=100)return null;
    if(p.care?.cycle!==state.outings)p.care={cycle:state.outings,actions:[]};
    if(p.care.actions.includes(action))return null;
    p.care.actions.push(action);const before=p.friendship||0;p.friendship=Math.min(100,before+amount);return {gain:p.friendship-before,best:p.friendship===100};
  }
  function afterBattle(state){state.outings++;}
  function unlocked(state,rule){return rule==='free'||rule==='shiny'&&state.shinies.length>0||rule==='summit'&&state.trophies.summit>0||state.quests.claimed.includes(rule);}
  function tile(area,x,y){
    if(x<0||x>15||y<0||y>9)return 'wall';
    if(D.areas[area].objects.some(o=>o.x===x&&o.y===y))return 'path';
    if(area==='town'){
      if(x===8||y===5||y===7&&x>=3&&x<=12||y===3&&x>=3&&x<=12||x===3&&y>=3&&y<=7||x===12&&y>=3&&y<=7||y===8&&x===8)return 'path';
      if((x<=1||x>=14)&&(y<=2||y>=8))return 'tree';
      if(x===8&&y===4)return 'water';return (x+y)%6===0?'flowers':'grass';
    }
    if(area==='river'&&x>=7&&x<=9&&y!==5)return 'water';
    if((x===0||x===15||y===0||y===9)&&!(area==='forest'&&x===8&&y===9)&&y!==5)return area==='cave'?'rock':'tree';
    if(y===5||x===8||y===3&&x>=3&&x<=12||y===7&&x>=3&&x<=12||x===3||x===12)return 'path';
    if(area==='cave')return (x*3+y*5)%7===0?'rock':(x+y)%5===0?'crystal':'grass';
    return (x*3+y*7)%13===0?'tree':(x+y)%7===0?'flowers':'grass';
  }
  function walkable(area,x,y){return D.areas[area]&&!['wall','water','tree','rock'].includes(tile(area,x,y));}
  function pathTo(area,start,end){
    if(!walkable(area,...end))return [];
    const queue=[start],parents=new Map([[start.join(),null]]);
    for(let i=0;i<queue.length;i++){
      const p=queue[i];if(p[0]===end[0]&&p[1]===end[1]){
        const path=[];let k=p.join();while(parents.get(k)!==null){path.unshift(k.split(',').map(Number));k=parents.get(k);}return path;
      }
      for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){const next=[p[0]+dx,p[1]+dy],k=next.join();if(walkable(area,...next)&&!parents.has(k)){parents.set(k,p.join());queue.push(next);}}
    }return [];
  }
  root.AdventureEngine={movePool,equippedMoves,equipMove,extendState,cleanPokemon,extendSave,evolveDetails,questProgress,grantLoot,befriend,claimQuest,claimGrand,rollShiny,care,afterBattle,unlocked,tile,walkable,pathTo};
})(typeof window!=='undefined'?window:globalThis);
