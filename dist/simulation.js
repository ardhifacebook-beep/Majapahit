/* Population, building capacity, reserves and inter-village deliveries. */
(function(root){'use strict';
const RULES={
  foodPerPerson:0.2, productionPerPerson:1, productionPerTile:2.5,
  startingPopulation:{rice:10,wood:5}, maxPopulation:50, peoplePerHouseTile:5,
  buildCostPerTile:{house:3,rice:1,wood:4},
  foodReservePerPerson:{rice:2,wood:3}, foodCapacityPerPerson:{rice:5,wood:6},
  woodCapacity:{rice:10,wood:40}, growthDays:10, immigrantInterval:5,
  foodSlowRate:2,foodFastRate:8,foodFastThreshold:2,woodRate:1,travelDays:2
};
function connected(state,a,b){const seen=new Set([a]),queue=[a];for(let i=0;i<queue.length;i++)for(const road of state.roads){const next=road.a===queue[i]?road.b:road.b===queue[i]?road.a:null;if(next&&!seen.has(next)){seen.add(next);queue.push(next)}}return seen.has(b)}
function incoming(state,id,good){return state.shipments.filter(s=>s.to===id&&s.good===good).reduce((n,s)=>n+s.amount,0)}
function area(b){return Math.max(1,(b.w||1)*(b.d||1))}
function structureArea(v,kind){return (v.buildings||[]).filter(b=>b.kind===kind).reduce((n,b)=>n+area(b),0)}
function population(v){return Math.max(0,Number(v.population)||0)}
function reserve(v){return population(v)*(RULES.foodReservePerPerson[v.role]||RULES.foodReservePerPerson.rice)}
function capacity(v,good){if(good==='food')return population(v)*(RULES.foodCapacityPerPerson[v.role]||RULES.foodCapacityPerPerson.rice);return RULES.woodCapacity[v.role]||RULES.woodCapacity.rice}
function housing(v){return structureArea(v,'house')*RULES.peoplePerHouseTile}
function productionCapacity(v,good){return structureArea(v,good==='food'?'rice':'wood')*RULES.productionPerTile}
function dailyProduction(v,good){if(good==='food'&&v.role!=='rice'||good==='wood'&&v.role!=='wood')return 0;return Math.min(population(v)*RULES.productionPerPerson,productionCapacity(v,good))}
function ensureVillage(v){if(!v.role)v.role='rice';if(!Number.isFinite(v.population))v.population=RULES.startingPopulation[v.role]||10;if(!Array.isArray(v.buildings)){const hx=Math.floor(v.x)-2,hz=Math.floor(v.z)-2;v.buildings=[];const add=(kind,x,z)=>v.buildings.push({id:`${v.id}-${kind}-${v.buildings.length}`,kind,x,z,w:1,d:1});if(v.role==='rice'){add('house',hx,hz);add('house',hx+3,hz);add('rice',hx,hz+3);add('rice',hx+1,hz+3);add('rice',hx+3,hz+3);add('rice',hx+4,hz+3)}else{add('house',hx,hz);add('wood',hx+2,hz+3);add('wood',hx+3,hz+3)}}if(!Number.isFinite(v.growthStreak))v.growthStreak=0;if(!Number.isFinite(v.growthTimer))v.growthTimer=0;if(!Number.isFinite(v.food))v.food=12;if(!Number.isFinite(v.wood))v.wood=4;v.food=Math.max(0,Math.min(v.food,capacity(v,'food')));v.wood=Math.max(0,Math.min(v.wood,capacity(v,'wood')))}
function step(state){state.day++;state.villages.forEach(ensureVillage);
  // Arrivals count against destination storage, including stock from old saves.
  const pending=[];for(const s of state.shipments){s.days--;const dest=state.villages.find(v=>v.id===s.to);if(s.days>0||!dest){pending.push(s);continue}const amount=Math.max(0,Math.min(s.amount,capacity(dest,s.good)-dest[s.good]));dest[s.good]+=amount;if(amount<s.amount)pending.push({...s,amount:s.amount-amount,days:0})}state.shipments=pending;
  for(const v of state.villages){v.food=Math.max(0,v.food-population(v)*RULES.foodPerPerson);const foodCap=capacity(v,'food'),woodCap=capacity(v,'wood');if(v.food<foodCap)v.food=Math.min(foodCap,v.food+dailyProduction(v,'food'));if(v.wood<woodCap)v.wood=Math.min(woodCap,v.wood+dailyProduction(v,'wood'))}
  // Food producers retain their own reserve. Deliveries restore connected
  // wood villages to reserve, with the agreed slow/fast rate tiers.
  for(const src of state.villages.filter(v=>v.role==='rice')){const ownReserve=reserve(src),rate=src.food>=ownReserve*RULES.foodFastThreshold?RULES.foodFastRate:RULES.foodSlowRate;let budget=rate;const targets=state.villages.filter(v=>v.role==='wood'&&connected(state,src.id,v.id)).sort((a,b)=>(reserve(b)-b.food-incoming(state,b.id,'food'))-(reserve(a)-a.food-incoming(state,a.id,'food')));for(const dest of targets){if(budget<=0)break;const target=Math.min(capacity(dest,'food'),reserve(dest)+population(dest)*RULES.foodPerPerson*RULES.travelDays);const deficit=Math.max(0,target-dest.food-incoming(state,dest.id,'food'));const surplus=Math.max(0,src.food-ownReserve);const amount=Math.min(budget,deficit,surplus);if(amount<=0)continue;src.food-=amount;budget-=amount;state.shipments.push({from:src.id,to:dest.id,good:'food',amount,days:RULES.travelDays})}}
  // Wood travels only into available village storage; in-transit wood reserves space.
  for(const src of state.villages.filter(v=>v.role==='wood')){let budget=RULES.woodRate;for(const dest of state.villages.filter(v=>v.role==='rice'&&connected(state,src.id,v.id))){if(budget<=0)break;const room=Math.max(0,capacity(dest,'wood')-dest.wood-incoming(state,dest.id,'wood'));const amount=Math.min(budget,room,src.wood);if(amount<=0)continue;src.wood-=amount;budget-=amount;state.shipments.push({from:src.id,to:dest.id,good:'wood',amount,days:RULES.travelDays})}}
  // A migrant arrives after ten reserve-safe days, then every five days.
  for(const v of state.villages){if(v.food>=reserve(v)){v.growthStreak++;if(v.growthStreak>=RULES.growthDays){if(v.growthTimer>0)v.growthTimer--;if(v.growthTimer<=0&&population(v)<RULES.maxPopulation&&population(v)<housing(v)){v.population++;v.growthTimer=RULES.immigrantInterval}}}else{v.growthStreak=0;v.growthTimer=0}}
}
root.VillageSimulation={RULES,connected,incoming,area,structureArea,reserve,capacity,housing,productionCapacity,dailyProduction,ensureVillage,step};if(typeof module!=='undefined')module.exports=root.VillageSimulation;
})(typeof globalThis!=='undefined'?globalThis:this);
