const assert = require('node:assert/strict');
const test = require('node:test');
const sim = require('../dist/simulation.js');
require('../dist/village-layout.js');
const MapGenerator = require('../dist/map.js');
const layout = globalThis.VillageLayout;
const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.z < b.z+b.d && a.z+a.d > b.z;
const inside = (b,x,z) => x >= b.x && x < b.x+b.w && z >= b.z && z < b.z+b.d;
function village(role='rice') { const v={id:role,x:.5,z:.5,role,food:12,wood:4}; sim.ensureVillage(v); return v; }
function check(v) {
  for(let i=0;i<v.buildings.length;i++) for(let j=i+1;j<v.buildings.length;j++) assert.ok(!overlap(v.buildings[i],v.buildings[j]));
  for(const road of v.layout.streets) for(const [x,z] of road.path) assert.ok(!v.buildings.some(b=>inside(b,x,z)), 'road crosses a building');
  const area = v.buildings.reduce((n,b)=>n+b.w*b.d,0);
  assert.equal(layout.orientedGroups(v).reduce((n,b)=>n+b.w*b.d,0),area);
}
function add(v,kind,w=1,d=1,valid=()=>true) { const p=layout.chooseSite(v,kind,w,d,valid); assert.ok(p); v.buildings.push({id:`b${v.buildings.length}`,kind,w,d,...p}); }
test('migration preserves economic state and becomes stable',()=>{
 for(const role of ['rice','wood']) { const v=village(role), before=structuredClone(v);
 assert.ok(layout.migrate(v,()=>true));
 for(const key of Object.keys(before).filter(k=>k!=='buildings')) assert.deepEqual(v[key],before[key]);
 assert.deepEqual(v.buildings.map(({x,z,rotation,...b})=>b).sort((a,b)=>a.id.localeCompare(b.id)),before.buildings.map(({x,z,...b})=>b).sort((a,b)=>a.id.localeCompare(b.id)));
 assert.equal(sim.housing(v),sim.housing(before)); assert.equal(sim.dailyProduction(v,role==='rice'?'food':'wood'),sim.dailyProduction(before,role==='rice'?'food':'wood'));
 const saved=JSON.stringify(v); assert.equal(layout.migrate(v,()=>true),false); assert.equal(JSON.stringify(v),saved); check(v); }
});
test('growth stays clustered, respects access paths, and preserves existing buildings',()=>{
 const v=village(); layout.migrate(v,()=>true);
 for(let i=0;i<2;i++)add(v,'house');
 assert.ok(v.layout.streets.length>=1);
 for(let i=0;i<2;i++)add(v,'house');
 assert.ok(v.buildings.filter(b=>b.kind==='house').length>=6);
 const old=structuredClone(v.buildings); for(let i=0;i<30;i++)add(v,i%3?'rice':'house');
 assert.deepEqual(v.buildings.slice(0,old.length),old); check(v);
});
test('large assets and blocked terrain preserve valid occupancy',()=>{
 const v=village('wood'), valid=(x,z,w,d)=>x>=-55&&x+w<=55&&z>=-55&&z+d<=55&&!(x<=-8&&x+w>-8);
 assert.ok(layout.migrate(v,valid)); for(const [kind,w,d] of [['house',4,6],['wood',4,4],['house',2,3]])add(v,kind,w,d,valid);
 check(v); assert.ok(v.buildings.every(b=>valid(b.x,b.z,b.w,b.d)));
});
test('failed migration and construction are transactional',()=>{
 const v=village(), before=JSON.stringify(v); assert.equal(layout.migrate(v,()=>false),false); assert.equal(JSON.stringify(v),before);
 layout.migrate(v,()=>true); const after=JSON.stringify(v); assert.equal(layout.chooseSite(v,'rice',8,8,()=>false),null); assert.equal(JSON.stringify(v),after);
});
test('terrain seeds never create illegal footprints or cross local streets',()=>{
 let successes=0;
 for(let seed=1;seed<=20;seed++){const map=MapGenerator.make(seed),v=village();
 const valid=(x,z,w,d)=>{if(x< -60||x+w>62||z< -60||z+d>62)return false;for(let dx=0;dx<w;dx++)for(let dz=0;dz<d;dz++){const t=map.typeAt(x+dx+.5,z+dz+.5);if(t===MapGenerator.WATER||t===MapGenerator.HILL)return false}return true};
 if(!layout.migrate(v,valid))continue; successes++; for(let i=0;i<20;i++){const kind=i%2?'house':'rice',p=layout.chooseSite(v,kind,1,1,valid);if(p)v.buildings.push({id:`seed-${i}`,kind,w:1,d:1,...p})}check(v);assert.ok(v.buildings.every(b=>valid(b.x,b.z,b.w,b.d))); }
 assert.ok(successes>0);
});
