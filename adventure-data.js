/* A small world with adventures that can be enjoyed at any pace. */
window.ADVENTURE_DATA = {
  areas: {
    town: { name:'Clover Town', subtitle:'Every adventure needs somewhere to call home.', habitat:'meadow', color:'#dce8cb', spawn:[8,8], pool:[],
      objects:[
        {id:'clinic',x:3,y:3,kind:'clinic',label:'Pokémon Center'},
        {id:'quests',x:8,y:2,kind:'board',label:'Quest board'},
        {id:'wardrobe',x:12,y:3,kind:'shop',label:'Outfit studio'},
        {id:'camp',x:3,y:7,kind:'camp',label:'Buddy camp'},
        {id:'cups',x:12,y:7,kind:'hall',label:'Tournament hall'},
        {id:'forest-gate',x:8,y:0,kind:'gate',label:'Fernwood Trail',to:'forest'},
        {id:'river-gate',x:15,y:5,kind:'gate',label:'Ripplebank Path',to:'river'},
        {id:'cave-gate',x:0,y:5,kind:'gate',label:'Starlight Cavern',to:'cave'}]},
    forest: { name:'Fernwood Trail',subtitle:'Rustling leaves, curious friends, and one little mystery.',habitat:'meadow',color:'#c7dcaf',spawn:[8,8],pool:[10,13,16,25,43,69,114,133,152,252],
      objects:[{id:'forest-home',x:8,y:9,kind:'gate',label:'Clover Town',to:'town'},
        {id:'forest-ranger',x:4,y:3,kind:'trainer',label:'Ranger Rowan',challenge:'ranger-rowan'},
        {id:'lost-eevee',x:12,y:2,kind:'eevee',label:'A lost Eevee'},
        {id:'fern-chest',x:3,y:7,kind:'chest',label:'A mossy treasure chest',loot:{ultraBalls:2,rareCandies:1}},
        {id:'forest-sign',x:10,y:5,kind:'sign',label:'Trail guide',text:'Walk through the grass or choose Look for Pokémon to meet a friend. Eevee was last seen near the northeast clearing.'}]},
    river: {name:'Ripplebank Path',subtitle:'Follow the water. See who follows you home.',habitat:'river',color:'#d5e8d6',spawn:[2,5],pool:[7,54,60,72,79,118,129,183,258,393],
      objects:[{id:'river-home',x:0,y:5,kind:'gate',label:'Clover Town',to:'town'},
        {id:'river-ace',x:12,y:3,kind:'trainer',label:'Ace Kai',challenge:'ace-kai'},
        {id:'ripple-chest',x:12,y:7,kind:'chest',label:'A riverside treasure chest',loot:{ultraBalls:3,superPotions:2}},
        {id:'river-sign',x:4,y:3,kind:'sign',label:'River guide',text:'Three different Water-type friends make a wonderful team. Your quest book counts Water Pokémon you already befriended, too.'}]},
    cave: {name:'Starlight Cavern',subtitle:'A quiet path beneath a thousand little sparkles.',habitat:'dusk',color:'#ccd1dd',spawn:[13,5],pool:[35,41,50,74,92,95,246,304,524,703],
      objects:[{id:'cave-home',x:15,y:5,kind:'gate',label:'Clover Town',to:'town'},
        {id:'cave-veteran',x:4,y:3,kind:'trainer',label:'Veteran Aria',challenge:'veteran-aria'},
        {id:'star-chest',x:3,y:7,kind:'chest',label:'A glittering treasure chest',loot:{revives:2,rareCandies:2}},
        {id:'cave-sign',x:10,y:3,kind:'sign',label:'Cavern guide',text:'Shiny Pokémon have special colors. Any wild meeting could be shiny, and completing all five starter quests guarantees a shiny Ponyta.'}]}
  },
  quests:[
    {id:'field-trip',name:'Three paths, one adventure',text:'Visit Fernwood Trail, Ripplebank Path, and Starlight Cavern.',goal:3,icon:'compass',reward:{rareCandies:2},extra:'Unlocks the Ranger outfit and Pathfinder title.'},
    {id:'water-friends',name:'A splash of friendship',text:'Befriend three different Water-type Pokémon. Earlier catches count, too.',goal:3,icon:'water',reward:{ultraBalls:4},extra:'Unlocks the Ocean backpack.'},
    {id:'lost-eevee',name:'A little friend, a long way home',text:'Find Eevee in Fernwood Trail, then walk back into Clover Town.',goal:2,icon:'heart',reward:{superPotions:2},extra:'Eevee joins your collection. Unlocks the Berry backpack.'},
    {id:'close-buddies',name:'Better together',text:'Help any Pokémon reach 40 friendship. Feed, pet, and play at Buddy camp.',goal:40,icon:'leaf',reward:{rareCandies:2},extra:'Unlocks the Cozy outfit.'},
    {id:'first-challenge',name:'A little courage',text:'Win a trainer battle, a gym battle, or a tournament. Earlier wins count.',goal:1,icon:'trophy',reward:{ultraBalls:3,superPotions:1,rareCandies:1},extra:'Unlocks the Rising Trainer title.'}
  ],
  cups:[
    {id:'meadow',name:'Meadow Cup',division:'Beginner',level:14,color:'grass',prize:{ultraBalls:5,superPotions:3,revives:1,rareCandies:3},xp:650,
      rounds:[{name:'Mia',team:[[133,10],[25,10]]},{name:'Ollie',team:[[43,12],[58,12]]},{name:'Jun',team:[[17,14],[8,14]]}]},
    {id:'river',name:'River Cup',division:'Intermediate',level:45,color:'water',prize:{ultraBalls:9,superPotions:5,revives:3,rareCandies:5},xp:1800,
      rounds:[{name:'Rowan',team:[[153,35],[58,35],[123,35]]},{name:'Kai',team:[[130,40],[135,40],[448,40]]},{name:'Aria',team:[[197,45],[130,45],[445,45]]}]},
    {id:'summit',name:'Summit Cup',division:'Champion',level:100,color:'dragon',prize:{ultraBalls:15,superPotions:8,revives:5,rareCandies:8},xp:4000,
      rounds:[{name:'Lance',team:[[130,80],[142,80],[149,80]]},{name:'Cynthia',team:[[442,90],[350,90],[448,90],[445,90]]},{name:'Red',team:[[25,100],[3,100],[6,100],[9,100],[143,100],[131,100]]}]}
  ],
  outfits:[
    {id:'meadow',name:'Meadow',color:'#73936a',rule:'free',hint:'Ready for your first adventure.'},
    {id:'sunset',name:'Sunset',color:'#bf7765',rule:'free',hint:'A little extra warmth.'},
    {id:'ranger',name:'Ranger',color:'#496d52',rule:'field-trip',hint:'Complete Three paths, one adventure.'},
    {id:'cozy',name:'Cozy',color:'#9b86b0',rule:'close-buddies',hint:'Complete Better together.'},
    {id:'champion',name:'Champion',color:'#c6a654',rule:'summit',hint:'Win the Summit Cup.'}
  ],
  bags:[
    {id:'sand',name:'Sand',color:'#c3a279',rule:'free',hint:'Your trusty first backpack.'},
    {id:'moss',name:'Moss',color:'#687f58',rule:'free',hint:'Made for little adventures.'},
    {id:'ocean',name:'Ocean',color:'#729daf',rule:'water-friends',hint:'Complete A splash of friendship.'},
    {id:'berry',name:'Berry',color:'#b77591',rule:'lost-eevee',hint:'Bring Eevee home and claim the quest.'}
  ],
  titles:[
    {id:'rookie',name:'Rookie Trainer',rule:'free',hint:'Every great story starts here.'},
    {id:'pathfinder',name:'Pathfinder',rule:'field-trip',hint:'Complete Three paths, one adventure.'},
    {id:'rising',name:'Rising Trainer',rule:'first-challenge',hint:'Complete A little courage.'},
    {id:'shiny',name:'Shiny Seeker',rule:'shiny',hint:'Befriend your first shiny Pokémon.'},
    {id:'champion',name:'Cup Champion',rule:'summit',hint:'Win the Summit Cup.'}
  ],
  skinTones:[{id:'peach',color:'#efc49c'},{id:'honey',color:'#c99768'},{id:'cocoa',color:'#916345'},{id:'deep',color:'#624434'}]
};
// Tournament opponents share the same full-team battle rules as gym leaders.
for (const cup of window.ADVENTURE_DATA.cups) cup.rounds.forEach((round,i)=>window.CHALLENGE_DATA.push({
  id:`cup-${cup.id}-${i+1}`,kind:'tournament',cup:cup.id,name:round.name,title:cup.name,location:`Round ${i+1} of 3`,type:cup.color,
  habitat:cup.id==='meadow'?'meadow':cup.id==='river'?'river':'dusk',tagline:'Three rounds. One trophy. A story for your team.',tip:'Check the team, choose your moves, and keep a healing item handy.',
  team:round.team.map(([id,level])=>({id,level})),loot:{ultraBalls:0,superPotions:0,revives:0,rareCandies:0}
}));
