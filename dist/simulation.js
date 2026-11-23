/* Daily economy: all stocks and shipments use whole units. */
(function(root){'use strict';
const RULES={foodCapacity:70,foodTarget:50,woodVillageFoodTarget:30,foodProduction:10,foodVillageConsumption:2,woodVillageConsumption:1,foodSlowRate:2,foodFastRate:8,foodRestart:65,woodVillageCapacity:40,foodVillageWoodCapacity:10,woodProduction:5,woodRate:1,travelDays:2};
function connected(state,a,b){const seen=new Set([a]),queue=[a];for(let i=0;i<queue.length;i++)for(const road of state.roads){const next=road.a===queue[i]?road.b:road.b===queue[i]?road.a:null;if(next&&!seen.has(next)){seen.add(next);queue.push(next)}}return seen.has(b)}
function incoming(state,id,good){return state.shipments.filter(s=>s.to===id&&s.good===good).reduce((n,s)=>n+s.amount,0)}
function capacity(v,good){return good==='food'?RULES.foodCapacity:v.role==='wood'?RULES.woodVillageCapacity:RULES.foodVillageWoodCapacity}
function destinations(state,src){return state.villages.filter(v=>v.role==='wood'&&connected(state,src.id,v.id))}
function step(state){state.day++;
 // Arrivals retain any excess from older saves instead of deleting goods.
 const pending=[];for(const s of state.shipments){s.days--;const dest=state.villages.find(v=>v.id===s.to);if(s.days>0||!dest){pending.push(s);continue}const amount=Math.max(0,Math.min(s.amount,capacity(dest,s.good)-dest[s.good]));dest[s.good]+=amount;if(amount<s.amount)pending.push({...s,amount:s.amount-amount,days:0})}state.shipments=pending;
 // Remember the stop state so production resumes only at the agreed threshold.
 for(const v of state.villages.filter(v=>v.role==='rice')){const receiving=destinations(state,v),all=[v,...receiving];if(v.foodPaused){if(all.some(d=>d.food<=RULES.foodRestart))v.foodPaused=false}else if(all.every(d=>d.food>=RULES.foodCapacity))v.foodPaused=true}
 for(const v of state.villages)v.food=Math.max(0,v.food-(v.role==='rice'?RULES.foodVillageConsumption:RULES.woodVillageConsumption));
 for(const v of state.villages.filter(v=>v.role==='wood'))v.wood+=Math.max(0,Math.min(RULES.woodProduction,capacity(v,'wood')-v.wood-incoming(state,v.id,'wood')));
 // Food production may be split before/after dispatch: a full village can
 // replace exported food without exceeding its storage or daily output.
 for(const src of state.villages.filter(v=>v.role==='rice')){let remaining=src.foodPaused?0:RULES.foodProduction;let made=Math.max(0,Math.min(remaining,capacity(src,'food')-src.food-incoming(state,src.id,'food')));src.food+=made;remaining-=made;const fast=src.food>=RULES.foodTarget;let budget=fast?RULES.foodFastRate:RULES.foodSlowRate;for(const dest of destinations(state,src)){if(!budget)break;const room=Math.max(0,capacity(dest,'food')-dest.food-incoming(state,dest.id,'food'));const available=fast?Math.max(0,src.food-RULES.foodTarget):src.food;const amount=Math.min(budget,room,available);if(amount<=0)continue;src.food-=amount;budget-=amount;state.shipments.push({from:src.id,to:dest.id,good:'food',amount,days:RULES.travelDays})}made=Math.max(0,Math.min(remaining,capacity(src,'food')-src.food-incoming(state,src.id,'food')));src.food+=made}
 for(const src of state.villages.filter(v=>v.role==='wood')){let budget=RULES.woodRate;for(const dest of state.villages.filter(v=>v.role==='rice'&&connected(state,src.id,v.id))){if(!budget)break;const room=Math.max(0,capacity(dest,'wood')-dest.wood-incoming(state,dest.id,'wood'));const amount=Math.min(budget,room,src.wood);if(amount<=0)continue;src.wood-=amount;budget-=amount;state.shipments.push({from:src.id,to:dest.id,good:'wood',amount,days:RULES.travelDays})}}
}
root.VillageSimulation={RULES,step,incoming,capacity};if(typeof module!=='undefined')module.exports=root.VillageSimulation;
})(typeof globalThis!=='undefined'?globalThis:this);
