/* Places to wander, small goals, and ways to grow together. */
const AD = window.ADVENTURE_DATA;
let worldWalkToken=0, lastWorldStep=0, campBuddy=null, campMessage='', moveBuddy=null;
function adventureBusy(){return Boolean(battle&&!battle.done);}
function adventureLinks(){return `<div class="adventure-links"><a href="#world">${icon('compass')}World map</a><a href="#quests">${icon('book')}Quest book <span>${state.quests.claimed.length}/5</span></a><a href="#camp">${icon('heart')}Buddy camp</a><a href="#tournaments">${icon('trophy')}Tournaments</a><a href="#wardrobe">${icon('star')}Outfit studio</a></div>`;}
function trainerDrawing(extra=''){
  const shirt=AD.outfits.find(i=>i.id===state.style.outfit).color,bag=AD.bags.find(i=>i.id===state.style.bag).color,skin=AD.skinTones.find(i=>i.id===state.style.skin).color;
  return `<svg class="trainer-drawing ${extra}" viewBox="0 0 64 80" aria-hidden="true"><ellipse cx="32" cy="73" rx="17" ry="4" fill="#223c2720"/><rect x="17" y="35" width="30" height="28" rx="9" fill="${bag}" stroke="#324c372b" stroke-width="2"/><path d="m24 55-2 16h9l2-13 2 13h9l-4-19Z" fill="#475c62"/><path d="M20 42q12-12 24 0l-3 16H23Z" fill="${shirt}"/><path d="m20 43-4 12m28-12 4 12" stroke="${skin}" stroke-width="7" stroke-linecap="round"/><rect x="25" y="31" width="14" height="10" rx="5" fill="${skin}"/><ellipse cx="32" cy="24" rx="15" ry="16" fill="${skin}"/><path d="M17 25q-5-23 14-22 21-1 17 23l-7-13-8 5-12-2Z" fill="#554940"/><path d="M17 14q2-13 16-12 15 0 17 13Z" fill="${shirt}"/><path d="M17 14h33" stroke="${shirt}" stroke-width="6" stroke-linecap="round"/><circle cx="27" cy="25" r="1.5" fill="#403c35"/><circle cx="38" cy="25" r="1.5" fill="#403c35"/><path d="M29 32q4 3 7 0" fill="none" stroke="#9b6257" stroke-width="1.6" stroke-linecap="round"/><path d="M23 41v12m18-12v12" stroke="${bag}" stroke-width="3"/><circle cx="32" cy="47" r="3" fill="#fff6"/></svg>`;
}
function shinyLabel(p){return p?.shiny?`<span class="shiny-label">${icon('sparkles')}Shiny</span>`:'';}
function worldTerrain(area){
  let out='';
  for(let y=0;y<10;y++)for(let x=0;x<16;x++){
    const kind=A.tile(area,x,y),px=x*50,py=y*50;
    const colors={path:area==='cave'?'#c6c3ce':'#e8dbb4',grass:AD.areas[area].color,flowers:AD.areas[area].color,water:'#9ec8cc',tree:AD.areas[area].color,rock:'#b4b3c3',crystal:'#c4c5d5',wall:'#b8cbb0'};
    out+=`<g transform="translate(${px} ${py})"><rect width="50" height="50" fill="${colors[kind]}"/>`;
    if(kind==='grass')out+=`<path d="m12 30 2-5 3 5m15-15 2-5 3 5" fill="none" stroke="${area==='cave'?'#abb0c4':'#97b27c'}" stroke-width="1.4" opacity=".6"/>`;
    if(kind==='flowers')out+='<g fill="#fff6cb"><circle cx="15" cy="16" r="3"/><circle cx="32" cy="32" r="3"/></g><g fill="#d7a398"><circle cx="32" cy="14" r="2"/><circle cx="16" cy="34" r="2"/></g>';
    if(kind==='tree')out+='<rect x="23" y="28" width="5" height="19" rx="2" fill="#8e9170"/><ellipse cx="25" cy="27" rx="23" ry="17" fill="#799b73"/><ellipse cx="25" cy="17" rx="19" ry="16" fill="#8aac7e"/><ellipse cx="23" cy="12" rx="10" ry="8" fill="#a8c18b"/>';
    if(kind==='water')out+='<path d="M8 15q8 5 16 0m-4 22q10 5 20 0" fill="none" stroke="#d9e9e0" stroke-width="2" stroke-linecap="round"/>';
    if(kind==='rock')out+='<path d="m6 37 7-23 23-6 12 30-20 9Z" fill="#a0a2b4"/><path d="m13 14 12 13 11-19M25 27l3 20" fill="none" stroke="#c1c2d0" stroke-width="2"/>';
    if(kind==='crystal')out+='<path d="m16 37 3-22 7-9 9 9-2 23Z" fill="#e2deef"/><path d="m26 6 1 32 8-23Z" fill="#beb2d9"/><path d="m9 32 4-15 7 22Z" fill="#b0cccf"/>';
    out+='</g>';
  }return out;
}
function worldObject(o){
  if(o.kind==='eevee'&&state.world.rescued)return '';
  const x=o.x*50+25,y=o.y*50+25,used=state.world.treasures.includes(o.id);
  let drawing='';
  if(['clinic','shop','hall','camp'].includes(o.kind)){
    const color={clinic:'#c58276',shop:'#b69bc1',hall:'#c6ae6c',camp:'#81a08a'}[o.kind];
    drawing=o.kind==='camp'?`<path d="m-23 16 23-40 23 40Z" fill="${color}"/><path d="m-8 16 8-20 8 20Z" fill="#4a6957"/><path d="m0-24 0 20" stroke="#fff5" stroke-width="2"/>`:`<rect x="-22" y="-12" width="44" height="33" rx="3" fill="#fcf3d9"/><path d="m-28-10 28-20 28 20Z" fill="${color}"/><rect x="-6" y="4" width="12" height="17" rx="3" fill="#637867"/><rect x="-16" y="0" width="7" height="7" rx="1" fill="#acd2d0"/><rect x="9" y="0" width="7" height="7" rx="1" fill="#acd2d0"/>${o.kind==='clinic'?'<path d="M-5-8H5M0-13v10" stroke="#fff" stroke-width="3"/>':''}`;
  }else if(o.kind==='eevee')drawing=`<image href="assets/sprites/133.png" x="-30" y="-39" width="60" height="60" style="image-rendering:pixelated"/><circle cx="22" cy="-22" r="8" fill="#fcf5d5"/><text x="22" y="-18" text-anchor="middle" fill="#9b8356" font-size="12">?</text>`;
  else if(o.kind==='trainer')drawing='<circle cy="-16" r="10" fill="#e6be91"/><path d="m-11-18 3-10h16l5 10Z" fill="#8b9d70"/><path d="m-9-2-4 21H13L9-2Z" fill="#688871"/><path d="M-5 18v9m10-9v9" stroke="#667276" stroke-width="5"/>';
  else if(o.kind==='chest')drawing=`<rect x="-19" y="-9" width="38" height="27" rx="4" fill="${used?'#aaa28c':'#bc965e'}"/><path d="M-19 0h38" stroke="#79674d" stroke-width="3"/><rect x="-3" y="-3" width="6" height="9" rx="1" fill="#f4d98c"/>${used?'<path d="m-6-19 5 5 9-10" stroke="#6e8959" stroke-width="3" fill="none"/>':'<text y="-17" text-anchor="middle" fill="#ab8b4c" font-size="20">✧</text>'}`;
  else if(o.kind==='gate')drawing=`<circle r="18" fill="#fff9" stroke="#899d75" stroke-width="1.4" stroke-dasharray="3 3"/><path d="m-6 0 6-6 6 6m-6-6v15" stroke="#6b8557" stroke-width="2" fill="none" transform="rotate(${o.y===0?0:o.y===9?180:o.x===0?270:90})"/>`;
  else drawing=`<path d="M0 0v24" stroke="#9a8665" stroke-width="5"/><rect x="-18" y="-19" width="36" height="27" rx="3" fill="${o.kind==='board'?'#bb9a68':'#c5ac7e'}"/><path d="M-11-12h22m-22 7h17" stroke="#f6ecd1" stroke-width="2"/>`;
  return `<g class="world-object" transform="translate(${x} ${y})" data-action="world-object" data-object="${o.id}"><title>${esc(o.label)}</title><ellipse cy="24" rx="22" ry="5" fill="#30483012"/>${drawing}</g>`;
}
function renderWorld(){
  const w=state.world,area=AD.areas[w.area],near=area.objects.find(o=>Math.abs(o.x-w.x)+Math.abs(o.y-w.y)<=1&&!(o.kind==='eevee'&&w.rescued));
  main.innerHTML=`<div class="page-heading"><div><div class="eyebrow adventure-eyebrow">A SMALL WORLD. A WHOLE LOT TO FIND.</div><h1>${esc(area.name)}</h1><p>${esc(area.subtitle)}</p></div><a class="btn secondary small" href="#quests">${icon('book')}Quest book · ${state.quests.claimed.length}/5</a></div>${adventureLinks()}<div class="world-layout"><section class="world-stage"><div class="world-map-frame"><svg id="world-map" viewBox="0 0 800 500" role="img" aria-label="${esc(area.name)} map. Use arrow keys or the direction buttons to walk; Enter to interact.">${worldTerrain(w.area)}${Array.from({length:160},(_,i)=>`<rect class="world-tile-target" x="${i%16*50}" y="${Math.floor(i/16)*50}" width="50" height="50" fill="transparent" data-action="world-tile" data-x="${i%16}" data-y="${Math.floor(i/16)}"/>`).join('')}${area.objects.map(worldObject).join('')}<g class="world-player" transform="translate(${w.x*50+5} ${w.y*50-13})" pointer-events="none"><svg width="40" height="60" viewBox="0 0 64 80">${trainerDrawing().replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</svg></g></svg><div class="world-location-chip">${icon('pin')}${esc(area.name)}</div></div><div class="world-controls"><div class="world-directions"><button class="walk-up" data-action="world-step" data-dx="0" data-dy="-1" aria-label="Walk north">↑</button><button class="walk-left" data-action="world-step" data-dx="-1" data-dy="0" aria-label="Walk west">←</button><span>${icon('compass')}</span><button class="walk-right" data-action="world-step" data-dx="1" data-dy="0" aria-label="Walk east">→</button><button class="walk-down" data-action="world-step" data-dx="0" data-dy="1" aria-label="Walk south">↓</button></div><div class="world-controls-copy"><strong>${near?esc(near.label):'Which way will you wander?'}</strong><p>Arrow keys or WASD to walk. Enter to interact. You can click a place to walk there, too.</p><button class="btn small" data-action="world-interact" ${!near?'disabled':''}>${icon('sparkles')}${near?'Interact':'Nothing nearby yet'}</button>${w.area!=='town'?'<button class="btn secondary small" data-action="world-encounter">Look for Pokémon</button>':''}</div></div><div class="world-caption">${icon('leaf')}Your spot on the map saves automatically. No rushing. No wrong turns.</div></section><aside class="world-notebook"><div class="eyebrow">YOUR LITTLE FIELD MAP</div><h2>Somewhere new.</h2><div class="world-travel">${Object.entries(AD.areas).map(([id,a])=>`<button class="travel-place ${id===w.area?'selected':''}" data-action="world-travel" data-area="${id}" ${!w.visited.includes(id)?'disabled':''}>${icon(id==='town'?'heart':id==='river'?'water':id==='forest'?'leaf':'sparkles')}<span><strong>${esc(a.name)}</strong><small>${id===w.area?'You are here':w.visited.includes(id)?'Fast travel':'Follow the gate from town'}</small></span>${w.visited.includes(id)?icon('check'):''}</button>`).join('')}</div><h3>Places & little discoveries</h3><div class="world-places">${area.objects.filter(o=>!(o.kind==='eevee'&&w.rescued)).map(o=>`<button data-action="world-object" data-object="${o.id}">${icon(o.kind==='chest'?'bag':o.kind==='gate'?'arrow':o.kind==='trainer'?'swords':o.kind==='eevee'?'heart':'pin')}<span>${esc(o.label)}</span>${o.kind==='chest'&&w.treasures.includes(o.id)?icon('check'):''}</button>`).join('')}</div>${area.pool.length?`<div class="world-wild-note"><strong>Who might you meet?</strong><div>${area.pool.slice(0,5).map(id=>art(BY_ID[id],'','',false)).join('')}</div><p>Every meeting could be a shiny surprise.</p></div>`:`<div class="world-wild-note"><strong>A new adventure, at your pace.</strong><p>Start at the quest board. Visit the three routes, make a few friends, and come back to camp whenever you like.</p></div>`}</aside></div>`;
}
function enterWorldArea(id){
  if(!AD.areas[id]||adventureBusy())return;worldWalkToken++;
  const w=state.world;w.area=id;[w.x,w.y]=AD.areas[id].spawn;
  if(!w.visited.includes(id))w.visited.push(id);
  let returned=false;if(id==='town'&&w.rescued&&!w.returned){w.returned=true;returned=true;}
  save();renderWorld();
  if(returned)openModal(`<div class="modal-body">${modalHead('Home, together.')}<div class="result-panel"><div class="result-art">${art(BY_ID[133],'','',false)}</div><h3>Eevee found the way home!</h3><p>They would love to join your adventure. Claim the reward in your quest book.</p></div><div class="modal-actions"><button class="btn" data-action="adventure-go" data-page="quests">Open quest book ${icon('arrow')}</button></div></div>`);
}
function worldStep(dx,dy){
  if(page!=='world'||modal.open||adventureBusy()||Math.abs(dx)+Math.abs(dy)!==1)return false;
  const w=state.world,nx=w.x+dx,ny=w.y+dy;
  if(!A.walkable(w.area,nx,ny))return false;
  w.x=nx;w.y=ny;w.steps++;if(w.steps%20===0)state.outings++;
  const gate=AD.areas[w.area].objects.find(o=>o.kind==='gate'&&o.x===nx&&o.y===ny);
  if(gate){enterWorldArea(gate.to);return false;}
  if(w.area!=='town'&&A.tile(w.area,nx,ny)==='grass')w.grassSteps++;
  save();renderWorld();
  if(w.area!=='town'&&A.tile(w.area,nx,ny)==='grass'&&w.grassSteps%6===0&&Math.random()<.22){worldEncounter();return false;}
  return true;
}
async function worldWalkTo(x,y,objectId){
  if(page!=='world'||modal.open||adventureBusy())return;
  const token=++worldWalkToken,w=state.world,path=A.pathTo(w.area,[w.x,w.y],[x,y]);
  if(!path.length&&(w.x!==x||w.y!==y)){toast('Try a path around the trees, rocks, or water.');return;}
  for(const [nx,ny]of path){
    if(token!==worldWalkToken||page!=='world'||modal.open||adventureBusy())return;
    if(!worldStep(nx-state.world.x,ny-state.world.y))return;
    await new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?20:95));
  }
  if(objectId&&token===worldWalkToken)worldInteract(objectId);
}
function worldInteract(objectId){
  if(page!=='world'||adventureBusy())return;
  const w=state.world,o=AD.areas[w.area].objects.find(o=>(!objectId||o.id===objectId)&&Math.abs(o.x-w.x)+Math.abs(o.y-w.y)<=1);
  if(!o)return;
  if(o.kind==='gate'){enterWorldArea(o.to);return;}
  if(o.kind==='board'){go('quests');return;}
  if(o.kind==='camp'){go('camp');return;}
  if(o.kind==='shop'){go('wardrobe');return;}
  if(o.kind==='hall'){go('tournaments');return;}
  if(o.kind==='trainer'){showChallenge(o.challenge);return;}
  if(o.kind==='clinic'){healAll(true);toast('Everyone is rested! Potions and Great Balls are restocked.');sound('heal');renderWorld();return;}
  if(o.kind==='eevee'){
    if(w.rescued)return;
    w.rescued=true;save();renderWorld();
    openModal(`<div class="modal-body">${modalHead('A friend in the ferns.')}<div class="result-panel"><div class="result-art">${art(BY_ID[133],'','',false)}</div><h3>Eevee trusts you!</h3><p>They lost their way while chasing a butterfly. Walk back into Clover Town to help them home.</p></div><div class="modal-actions"><button class="btn" data-action="close-modal">Let’s head home ${icon('heart')}</button></div></div>`);return;
  }
  if(o.kind==='chest'){
    if(w.treasures.includes(o.id)){toast('You already tucked this treasure into your backpack.');return;}
    w.treasures.push(o.id);A.grantLoot(state,o.loot);save();renderWorld();sound('catch');
    openModal(`<div class="modal-body">${modalHead('A little treasure!')}<p class="modal-description">Found along the way, and added to your backpack.</p><div class="loot-chips treasure-loot">${lootChips(o.loot)}</div><div class="modal-actions"><button class="btn" data-action="close-modal">Keep wandering ${icon('arrow')}</button></div></div>`);return;
  }
  openModal(`<div class="modal-body">${modalHead(esc(o.label))}<p class="modal-description">${esc(o.text)}</p><div class="modal-actions"><button class="btn" data-action="close-modal">Keep wandering</button></div></div>`);
}
function worldEncounter(){
  if(adventureBusy())return;
  const area=AD.areas[state.world.area];if(!area.pool.length)return;
  const unfamiliar=area.pool.filter(id=>!owned(id)),pool=unfamiliar.length&&Math.random()<.65?unfamiliar:area.pool;
  startEncounter(pool[Math.floor(Math.random()*pool.length)],area.habitat);
}
function renderQuests(){
  main.innerHTML=`<div class="page-heading"><div><div class="eyebrow adventure-eyebrow">LITTLE GOALS. LOVELY MEMORIES.</div><h1>A story you get to write.</h1><p>Five first adventures. Take them in any order, and at your own pace.</p></div><span class="quest-total">${state.quests.claimed.length} / 5 completed</span></div>${adventureLinks()}<div class="quest-layout"><div class="quest-list">${AD.quests.map(q=>{
    const n=A.questProgress(state,q.id,BY_ID),claimed=state.quests.claimed.includes(q.id),ready=n>=q.goal;
    return `<article class="quest-card ${claimed?'claimed':ready?'ready':''}"><div class="quest-card-icon">${icon(claimed?'check':q.icon)}</div><div class="quest-card-content"><div class="quest-heading"><h2>${q.name}</h2><span>${claimed?'Completed':ready?'Ready to claim':`${n} / ${q.goal}`}</span></div><p>${q.text}</p><div class="quest-track"><span style="width:${Math.min(100,n/q.goal*100)}%"></span></div><div class="loot-chips">${lootChips(q.reward)}</div><small>${q.extra}</small><button class="btn ${claimed||!ready?'secondary':''} small" data-action="claim-quest" data-quest="${q.id}" ${claimed||!ready?'disabled':''}>${claimed?'A memory to keep':ready?'Claim reward':'Keep exploring'}</button></div></article>`;
  }).join('')}</div><aside class="quest-finale"><span class="eyebrow">A SPARKLING THANK-YOU</span><div class="quest-shiny-art">${art(BY_ID[77],'','',true)}<span>✧</span></div><h2>A very special Ponyta.</h2><p>Finish and claim all five starter quests to meet a guaranteed shiny Ponyta. Their blue flames make this friendship easy to spot.</p><span class="shiny-label">${icon('sparkles')}Guaranteed shiny reward</span><button class="btn" data-action="claim-grand" ${state.quests.grand||state.quests.claimed.length<5?'disabled':''}>${state.quests.grand?'Ponyta is your friend!':'Meet shiny Ponyta'}</button><small>Already have a Ponyta? Keep their level and XP, and add their shiny colors.</small></aside></div>`;
}
function claimQuest(id){
  if(adventureBusy())return;const q=A.claimQuest(state,id,BY_ID);if(!q)return;
  save();renderQuests();sound('catch');
  openModal(`<div class="modal-body">${modalHead('One lovely little adventure.')}<div class="quest-result-icon">${icon(q.icon)}</div><h3 class="quest-result-name">${q.name}</h3><p class="modal-description">${q.extra}</p><div class="loot-chips treasure-loot">${lootChips(q.reward)}</div><div class="modal-actions"><button class="btn secondary" data-action="adventure-go" data-page="wardrobe">See new styles</button><button class="btn" data-action="close-modal">Back to my quests ${icon('check')}</button></div></div>`);
}
function claimGrand(){
  if(adventureBusy())return;const p=A.claimGrand(state,BY_ID);if(!p)return;
  save();renderQuests();sound('catch');
  openModal(`<div class="modal-body">${modalHead('A friendship that sparkles.')}<div class="result-panel"><div class="result-art">${art(BY_ID[77],'','',true)}</div><span class="shiny-label">${icon('sparkles')}Shiny Ponyta</span><h3>Look at those blue flames!</h3><p>Ponyta is in your collection at level ${p.level}. Shiny Pokémon have the same battle strength, with special colors all their own.</p></div><div class="modal-actions"><button class="btn" data-action="adventure-go" data-page="team">Meet your team ${icon('heart')}</button></div></div>`);
}
function renderCamp(){
  if(!owned(campBuddy))campBuddy=state.lead;
  const p=owned(campBuddy),species=BY_ID[p.id],friendship=p.friendship||0,done=p.care?.cycle===state.outings?p.care.actions:[];
  const label=friendship===100?'Best buddies':friendship>=60?'A wonderful friendship':friendship>=40?'Close companions':friendship>=20?'Getting to know you':'A friendship just beginning';
  main.innerHTML=`<div class="page-heading"><div><div class="eyebrow adventure-eyebrow">A COZY PLACE TO GROW.</div><h1>Good company. Happy hearts.</h1><p>Feed, pet, and play with your Pokémon. Every little kindness counts.</p></div><button class="btn secondary small" data-action="heal">${icon('heart')}Rest together</button></div>${adventureLinks()}<div class="camp-layout"><section class="camp-scene"><div class="camp-art">${landscape('meadow')}${art(species,'camp-pokemon')}<span class="camp-floating-heart">♡</span><span class="camp-location">${icon('leaf')}CLOVER TOWN · BUDDY CAMP</span></div><div class="camp-buddy-info"><div><h2>${esc(species.name)} ${shinyLabel(p)}</h2><p>Level ${p.level} · ${label}</p></div><div class="friendship-hearts" aria-label="${friendship} out of 100 friendship">${[20,40,60,80,100].map(n=>`<span class="${friendship>=n?'filled':''}">♥</span>`).join('')}<strong>${friendship} / 100</strong></div></div><div class="camp-actions">${[['feed','A berry snack','A full basket, always.','leaf',10],['pet','A gentle pat','A little kindness.','heart',8],['play','Play together','A very good game.','sparkles',12]].map(([id,title,desc,ico,gain])=>`<button data-action="care-buddy" data-care="${id}" ${done.includes(id)||friendship===100?'disabled':''}>${icon(ico)}<strong>${title}</strong><small>${done.includes(id)?'A lovely moment shared':friendship===100?'Best buddies!':desc}</small><span>${done.includes(id)?'✓':'+'+gain+' friendship'}</span></button>`).join('')}</div><p class="camp-message" role="status">${esc(campMessage||'Your buddy is happy you stopped by.')}</p><p class="camp-note">Each activity is available once per outing. Finish a battle or walk 20 map steps to enjoy another round. Friendship never fades, and food is always free.</p><div class="camp-bottom"><button class="btn secondary small" data-action="move-picker" data-id="${p.id}">${icon('swords')}Choose battle moves</button>${friendship===100?`<span class="friendship-ribbon">${icon('star')}Best Buddy ribbon</span>`:''}${evolutionSummary(p,true)}</div></section><aside class="camp-roster"><h2>Who’s coming to camp?</h2><label class="camp-select-label" for="camp-select">Choose from your whole collection</label><select id="camp-select">${state.owned.map(p=>`<option value="${p.id}" ${p.id===campBuddy?'selected':''}>${esc(BY_ID[p.id].name)} · Lv. ${p.level}${p.shiny?' · Shiny':''}</option>`).join('')}</select><div class="camp-team">${state.team.map(p=>owned(p)).map(p=>`<button class="camp-friend ${p.id===campBuddy?'selected':''}" data-action="camp-buddy" data-id="${p.id}">${art(BY_ID[p.id])}<span><strong>${esc(BY_ID[p.id].name)}</strong><small>♥ ${p.friendship||0} friendship${p.shiny?' · Shiny':''}</small></span>${p.id===campBuddy?icon('check'):''}</button>`).join('')}</div><div class="camp-tip">${icon('book')}<h3>Small moments matter.</h3><p>Reach 40 friendship for the Better together quest. At 100, your Pokémon earns a Best Buddy ribbon. Their friendship stays with them through evolution.</p><a class="text-link" href="#quests">Open quest book ${icon('arrow')}</a></div></aside></div>`;
}
function careBuddy(action){
  if(adventureBusy())return;const result=A.care(state,campBuddy,action);if(!result)return;
  const name=BY_ID[campBuddy].name;
  campMessage=result.best?`${name} is your best buddy! A little ribbon for a wonderful friendship.`:{feed:`${name} loved that berry. A happy little snack!`,pet:`${name} leans in for one more pat. They feel right at home.`,play:`${name} brought the ball back! Best game ever.`}[action];
  save();renderCamp();sound(result.best?'catch':'heal');$('.camp-art')?.classList.add('camp-reacting');
}
function showMovePicker(id){
  if(adventureBusy()||!owned(id))return;moveBuddy=id;
  const p=owned(id),species=BY_ID[id],equipped=A.equippedMoves(p,species),keys=equipped.map(m=>m.id),pool=A.movePool(species);
  openModal(`<div class="modal-body move-workshop">${modalHead('A little practice. A new move.')}<div class="move-buddy">${art(species)}<div><h3>${esc(species.name)}</h3><p>Level ${p.level} · Choose four battle moves</p></div></div><p class="modal-description">Pick a move below, then choose the slot it should take. Change your mind anytime outside battle. Gentle tap is useful for catching wild friends.</p><div class="equipped-moves">${equipped.map((m,i)=>`<div><small>SLOT ${i+1}</small><strong>${m.name}</strong><span class="type type-${m.type}">${m.type}</span></div>`).join('')}</div><h3 class="move-library-title">Your move notebook</h3><div class="move-library">${pool.map(m=>`<article class="learnable-move ${p.level<m.level?'locked':''}"><div><span class="type type-${m.type}">${m.type}</span><span>${m.gentle?'Leaves 1 HP':m.power+' power'}${m.cooldown?' · '+m.cooldown+'-turn recharge':''}</span></div><strong>${m.name}</strong><p>${p.level<m.level?'Learn at level '+m.level:m.level===1?'A familiar move':'Unlocked at level '+m.level}</p><button class="btn secondary small" data-action="equip-pick" data-move="${m.id}" data-id="${id}" ${keys.includes(m.id)||p.level<m.level?'disabled':''}>${keys.includes(m.id)?'Equipped':p.level<m.level?'Keep growing':'Equip move'}</button></article>`).join('')}</div><p class="camp-note">Pokéwild uses a simplified move library. New type moves unlock at levels 12, 25, and 45. Swift unlocks at 10, and Rock Smash at 20.</p></div>`);
}
function chooseMoveSlot(id,key){
  if(adventureBusy()||!owned(id))return;
  const p=owned(id),s=BY_ID[id],move=A.movePool(s).find(m=>m.id===key&&m.level<=p.level);if(!move)return;
  openModal(`<div class="modal-body">${modalHead('Make room for '+esc(move.name)+'.')}<p class="modal-description">Choose a move to replace. You can equip it again later.</p><div class="switch-list move-slot-list">${A.equippedMoves(p,s).map((m,i)=>`<button class="switch-option" data-action="equip-confirm" data-id="${id}" data-move="${key}" data-slot="${i}"><span class="slot-number">${i+1}</span><div><strong>${m.name}</strong><small>${m.gentle?'Gentle tap helps with catching':m.type+' · '+m.power+' power'}</small></div>${icon('arrow')}</button>`).join('')}</div><div class="modal-actions"><button class="btn secondary" data-action="move-picker" data-id="${id}">Back to moves</button></div></div>`);
}
function moveLearningNotice(){
  const candidates=state.team.filter(id=>owned(id).level>=10);if(!candidates.length)return '';
  return `<div class="move-learning-note">${icon('swords')}<span>Growing Pokémon have new moves to choose.</span><button class="text-link" data-action="move-picker" data-id="${candidates[0]}">Open move notebook ${icon('arrow')}</button></div>`;
}
function renderWardrobe(){
  const title=AD.titles.find(i=>i.id===state.style.title).name;
  main.innerHTML=`<div class="page-heading"><div><div class="eyebrow adventure-eyebrow">YOUR ADVENTURE. YOUR OWN LOOK.</div><h1>A little more you.</h1><p>Choose an outfit, a backpack, and a title. Earn new styles through your adventures.</p></div></div>${adventureLinks()}<div class="wardrobe-layout"><section class="trainer-portrait"><div class="portrait-circle">${trainerDrawing()}</div><h2>${esc(state.settings.name)}</h2><span class="trainer-title">${esc(title)}</span><p>Your look follows you onto the map and into your trainer profile.</p><div class="skin-choices" role="group" aria-label="Skin tone">${AD.skinTones.map((s,i)=>`<button style="--swatch:${s.color}" class="${state.style.skin===s.id?'selected':''}" data-action="style-pick" data-group="skin" data-value="${s.id}" aria-label="Skin tone ${i+1}" aria-pressed="${state.style.skin===s.id}">${state.style.skin===s.id?icon('check'):''}</button>`).join('')}</div></section><div class="wardrobe-options">${[['outfit','outfits','An outfit for the journey'],['bag','bags','Your trusty backpack'],['title','titles','A title to grow into']].map(([key,group,title])=>`<section class="style-section"><h2>${title}</h2><div class="style-grid">${AD[group].map(item=>{const available=A.unlocked(state,item.rule),selected=state.style[key]===item.id;return `<button class="style-choice ${selected?'selected':''} ${!available?'locked':''}" data-action="style-pick" data-group="${key}" data-value="${item.id}" ${!available?'disabled':''} aria-pressed="${selected}">${item.color?`<span class="style-swatch" style="--swatch:${item.color}">${icon(key==='bag'?'bag':'star')}</span>`:icon('star')}<strong>${item.name}</strong><small>${available?selected?'Wearing it proudly':'Ready to choose':item.hint}</small>${selected?`<span class="style-check">${icon('check')}</span>`:''}</button>`;}).join('')}</div></section>`).join('')}</div></div>`;
}
function chooseStyle(group,value){
  if(adventureBusy())return;const list={outfit:AD.outfits,bag:AD.bags,title:AD.titles,skin:AD.skinTones}[group],item=list?.find(i=>i.id===value);
  if(!item||group!=='skin'&&!A.unlocked(state,item.rule))return;state.style[group]=value;save();renderWardrobe();
}
function cupById(id){return AD.cups.find(c=>c.id===id);}
function cupRoundId(cup,round){return `cup-${cup.id}-${round+1}`;}
function renderTournaments(){
  const run=state.tournamentRun,cup=run&&cupById(run.id);
  main.innerHTML=`<div class="page-heading"><div><div class="eyebrow adventure-eyebrow">THREE ROUNDS. ONE GREAT STORY.</div><h1>A moment for your whole team.</h1><p>Beginner, intermediate, and champion cups. Earn trophies and a backpack full of rewards.</p></div><a href="#league" class="btn secondary small">${icon('swords')}Gyms & trainers</a></div>${adventureLinks()}${run?`<section class="cup-resume">${icon('trophy')}<div><h2>${cup.name} is waiting for you.</h2><p>${run.round} of 3 rounds won. Next up: ${cup.rounds[run.round].name}. Your team heals before each round.</p></div><button class="btn small" data-action="cup-resume">Continue round ${run.round+1}</button><button class="text-link" data-action="cup-abandon-prompt">End this run</button></section>`:''}<div class="cup-grid">${AD.cups.map(c=>`<article class="cup-card type-${c.color}"><div class="cup-division">${c.division}<span>Lv. ${c.rounds[0].team[0][1]}–${c.level}</span></div><div class="cup-art ${state.trophies[c.id]?'won':''}">${icon('trophy')}<span>${state.trophies[c.id]?'✧':'·'}</span></div><h2>${c.name}</h2><p>${state.trophies[c.id]?`${state.trophies[c.id]} ${state.trophies[c.id]===1?'trophy':'trophies'} earned`:'A trophy waiting for your team.'}</p><div class="cup-rounds">${c.rounds.map((r,i)=>`<div><span>${i+1}</span><strong>${r.name}</strong><small>${r.team.length} Pokémon · Lv. ${r.team[0][1]}</small></div>`).join('')}</div><div class="loot-chips">${lootChips(c.prize)}</div><small class="cup-xp">+${c.xp} XP to every travel buddy</small><button class="btn small" data-action="cup-preview" data-cup="${c.id}" ${run&&run.id!==c.id?'disabled':''}>${run?.id===c.id?'See current cup':'View cup & enter'} ${icon('arrow')}</button></article>`).join('')}</div><div class="league-field-note cup-rules">${icon('heart')}<p>Your team heals before every round, and completed rounds save automatically. Beat all three teams to earn the trophy, loot, and XP. Losing ends that run safely; you keep your Pokémon and previous trophies. You can pause and return to the same round.</p></div>`;
}
function showCup(id){
  if(adventureBusy())return;const cup=cupById(id);if(!cup||state.tournamentRun&&state.tournamentRun.id!==id)return;
  openModal(`<div class="modal-body cup-preview">${modalHead(cup.name)}<p class="modal-description">${cup.division} division · Three rounds · Levels ${cup.rounds[0].team[0][1]}–${cup.level}. Your team heals before each round. Win every round to earn the trophy and rewards.</p>${cup.rounds.map((r,i)=>`<h3 class="cup-round-title">Round ${i+1} · ${r.name}</h3>${opponentPreview(CHALLENGE_BY_ID[cupRoundId(cup,i)])}`).join('')}<div class="loot-chips">${lootChips(cup.prize)}</div><p class="camp-note">+${cup.xp} XP for every travel buddy. ${cup.id==='summit'?'Win to unlock the Champion outfit and Cup Champion title.':''}</p><div class="modal-actions"><button class="btn secondary" data-action="close-modal">Prepare my team</button><button class="btn" data-action="cup-enter" data-cup="${id}">${state.tournamentRun?'Continue cup':'Enter cup'} ${icon('trophy')}</button></div></div>`);
}
function enterCup(id){
  if(adventureBusy())return;const cup=cupById(id);if(!cup||state.tournamentRun&&state.tournamentRun.id!==id)return;
  state.tournamentRun||={id,round:0};save();startCupRound();
}
function startCupRound(){
  if(adventureBusy()||!state.tournamentRun)return;
  const run=state.tournamentRun,cup=cupById(run.id);startChallenge(cupRoundId(cup,run.round));
}
function finishCupRound(kind){
  const b=battle,run=state.tournamentRun;if(!b||b.done||!run||b.opponentId!==cupRoundId(cupById(run.id),run.round))return;
  if(kind==='catch'||kind==='win'&&b.enemyTeam.some(p=>p.hp>0))return;
  clearTransformation(b);
  const cup=cupById(run.id),round=run.round;b.done=true;b.locked=false;A.afterBattle(state);
  let prize=null;const rewards=[];
  if(kind==='loss'){state.tournamentRun=null;healAll(true);b.message='A fresh start is waiting.';b.hint='Your team is healed. Your Pokémon, items, and earlier trophies are safe. Try the cup again whenever you like.';}
  else if(round<2){state.tournamentRun.round++;b.message=`Round ${round+1} won!`;b.hint=`${cup.rounds[round].name} cheered for your team. ${3-round-1} ${round===1?'round':'rounds'} to go. Your team will heal before the next match.`;}
  else{
    A.grantLoot(state,cup.prize);state.trophies[cup.id]=(state.trophies[cup.id]||0)+1;state.tournamentWins++;state.trainerXP+=150;state.tournamentRun=null;
    state.team.forEach(id=>{const n=E.grantXP(owned(id),BY_ID[id],cup.xp);if(n)rewards.push(`${BY_ID[id].name} → Lv. ${owned(id).level}`);});
    rewards.unshift(`+${cup.xp} XP to your whole team`);prize={loot:cup.prize};b.message=`You won the ${cup.name}!`;b.hint='Three wonderful team efforts. Your trophy is in the hall, and your rewards are in your backpack.';
  }
  b.result={kind,prize,rewards,cup:cup.id,round,champion:kind==='win'&&round===2};save();sound(kind==='loss'?'heal':'catch');renderBattle();showCupResult();
}
function showCupResult(){
  const b=battle,r=b?.result;if(!r?.cup)return;const cup=cupById(r.cup),won=r.kind==='win';
  openModal(`<div class="modal-body">${modalHead(r.champion?cup.name+' champion!':won?'One round closer.':'Another chance to grow.')}<div class="result-panel"><div class="cup-result-art">${r.champion?icon('trophy'):art(BY_ID[state.lead])}</div><span class="eyebrow">${r.champion?'TOURNAMENT TROPHY EARNED':won?`ROUND ${r.round+1} OF 3 COMPLETE`:'A SAFE RETURN TO CAMP'}</span><h3>${esc(b.message)}</h3><p>${esc(b.hint)}</p>${r.prize?`<div class="loot-chips treasure-loot">${lootChips(r.prize.loot)}</div>`:''}${r.rewards.length?`<div class="reward-chips">${r.rewards.map(s=>`<span>${esc(s)}</span>`).join('')}</div>`:''}</div>${evolutionNotice(state.team)}${moveLearningNotice()}<div class="modal-actions"><button class="btn secondary" data-action="leave-battle">${won&&!r.champion?'Pause & explore':'Tournament hall'}</button>${won&&!r.champion?`<button class="btn" data-action="cup-resume">Next round ${icon('arrow')}</button>`:`<button class="btn" data-action="adventure-go" data-page="${r.champion?'wardrobe':'team'}">${r.champion?'Celebrate in style':'My team'} ${icon('arrow')}</button>`}</div></div>`);
}

document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
  const id=Number(b.dataset.id);
  switch(b.dataset.action){
    case 'adventure-go':go(b.dataset.page);break;
    case 'world-step':worldWalkToken++;worldStep(Number(b.dataset.dx),Number(b.dataset.dy));break;
    case 'world-tile':worldWalkTo(Number(b.dataset.x),Number(b.dataset.y));break;
    case 'world-object':{const o=AD.areas[state.world.area].objects.find(o=>o.id===b.dataset.object);if(o)worldWalkTo(o.x,o.y,o.id);break;}
    case 'world-interact':worldInteract();break;
    case 'world-travel':if(state.world.visited.includes(b.dataset.area))enterWorldArea(b.dataset.area);break;
    case 'world-encounter':worldEncounter();break;
    case 'claim-quest':claimQuest(b.dataset.quest);break;
    case 'claim-grand':claimGrand();break;
    case 'camp-buddy':campBuddy=id;campMessage='';renderCamp();break;
    case 'care-buddy':careBuddy(b.dataset.care);break;
    case 'move-picker':showMovePicker(id);break;
    case 'equip-pick':chooseMoveSlot(id,b.dataset.move);break;
    case 'equip-confirm':if(!adventureBusy()&&A.equipMove(state,id,b.dataset.move,Number(b.dataset.slot),BY_ID)){save();showMovePicker(id);sound('heal');}break;
    case 'style-pick':chooseStyle(b.dataset.group,b.dataset.value);break;
    case 'cup-preview':showCup(b.dataset.cup);break;
    case 'cup-enter':enterCup(b.dataset.cup);break;
    case 'cup-resume':startCupRound();break;
    case 'cup-abandon-prompt':openModal(`<div class="modal-body">${modalHead('End this cup run?')}<p class="modal-description">Completed rounds in this run will reset. Your Pokémon, items, and earlier trophies stay with you.</p><div class="modal-actions"><button class="btn secondary" data-action="close-modal">Keep my place</button><button class="btn" data-action="cup-abandon">End this run</button></div></div>`);break;
    case 'cup-abandon':if(!adventureBusy()){state.tournamentRun=null;save();modal.close();renderTournaments();}break;
  }
});
document.addEventListener('change',event=>{if(event.target.id==='camp-select'){campBuddy=Number(event.target.value);campMessage='';renderCamp();}});
document.addEventListener('keydown',event=>{
  if(page!=='world'||modal.open||adventureBusy()||event.target.closest('input,textarea,select')||event.metaKey||event.ctrlKey||event.altKey)return;
  const directions={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};
  if(directions[event.key]){event.preventDefault();if(performance.now()-lastWorldStep<75)return;lastWorldStep=performance.now();worldWalkToken++;worldStep(...directions[event.key]);}
  else if(event.key==='Enter'&&!event.target.closest('button,a')){event.preventDefault();worldInteract();}
});
