/* Street-front parcels. Economic buildings remain the source of capacity and cost. */
(function(root){'use strict';
const VERSION=4;
const MERGE_SIZES={house:[[4,6],[4,4],[2,3],[2,2]],rice:[[8,8],[4,4]],wood:[[4,4],[2,2]]};
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.z<b.z+b.d&&a.z+a.d>b.z;
function line(a,b){const out=[a];let [x,z]=a;while(x!==b[0]||z!==b[1]){if(x!==b[0])x+=Math.sign(b[0]-x);else z+=Math.sign(b[1]-z);out.push([x,z])}return out}
function allocate(v,kind,w,d,valid){
 const cx=Math.floor(v.x),cz=Math.floor(v.z),layout=v.layout;
 const fit=block=>{
   if(block.kind!==kind||w>block.w||d>block.d)return null;
   // Complete the row along the street before growing the block inward.
   for(let row=0;row<=block.d-d;row++)for(let col=0;col<=block.w-w;col++){
     const x=block.x+col,z=block.front==='south'?block.z+block.d-d-row:block.z+row;
     const b={x,z,w,d};
     if(v.buildings.some(other=>overlap(b,other))||!valid(x,z,w,d))continue;
     return {x,z,rotation:block.front==='south'?Math.PI:0};
   }return null;
 };
 for(const block of layout.blocks){const pos=fit(block);if(pos)return pos}
 const bw=Math.max(w,kind==='house'?2:4),bd=Math.max(d,kind==='house'?3:4);
 const candidates=[];
 for(let offset=2;offset<=23;offset++)for(const side of [-1,1])for(const direction of [-1,1]){
   const front=direction<0?'south':'north';
   const block={kind,w:bw,d:bd,x:side<0?cx-1-bw:cx+2,z:direction<0?cz-offset-bd+1:cz+offset,front};
   const laneZ=front==='south'?block.z+bd:block.z-1;
   const outerX=side<0?block.x:block.x+bw-1;
   const street=line([cx,cz],[cx,laneZ]).concat(line([cx,laneZ],[outerX,laneZ]).slice(1));
   const expanded={x:block.x-.5,z:block.z-.5,w:bw+1,d:bd+1};
   if(layout.blocks.some(other=>overlap(expanded,other)))continue;
   if(layout.streets.some(road=>road.path.some(([x,z])=>x>=block.x&&x<block.x+bw&&z>=block.z&&z<block.z+bd)))continue;
   if(!valid(block.x,block.z,bw,bd))continue;
   if(street.some(([x,z])=>!valid(x,z,1,1,true)||layout.blocks.some(b=>x>=b.x&&x<b.x+b.w&&z>=b.z&&z<b.z+b.d)))continue;
   const preference=kind==='house'?direction<0:direction>0;
   const score=offset+(preference?0:9)+(side<0?0:.25);
   candidates.push({block,street,score});
 }
 candidates.sort((a,b)=>a.score-b.score);
 for(const candidate of candidates){layout.blocks.push(candidate.block);const pos=fit(candidate.block);if(pos){layout.streets.push({path:candidate.street});return pos}layout.blocks.pop()}
 return null;
}
function migrate(v,valid){
 if(v.layout?.version===VERSION)return false;
 const draft={...v,buildings:[],layout:{version:VERSION,blocks:[],streets:[]}};
 // Plan transactionally: a cramped settlement retains its original buildings.
 const originals=[...v.buildings].sort((a,b)=>(a.kind==='house'?0:1)-(b.kind==='house'?0:1)||b.w*b.d-a.w*a.d);
 for(const b of originals){const pos=allocate(draft,b.kind,b.w,b.d,valid);if(!pos)return false;draft.buildings.push({...b,...pos})}
 v.buildings=draft.buildings;v.layout=draft.layout;return true;
}
function chooseSite(v,kind,w,d,valid){
 if(v.layout?.version!==VERSION&&!migrate(v,valid))return null;
 // Only commit reserved parcels once a construction can actually be placed.
 const draft={...v,layout:JSON.parse(JSON.stringify(v.layout))};
 const pos=allocate(draft,kind,w,d,valid);if(!pos)return null;
 v.layout=draft.layout;return pos;
}
function orientedGroups(v){return visualGroups(v.buildings).map(item=>{
 const block=v.layout?.blocks?.find(b=>item.x-item.w/2>=b.x&&item.z-item.d/2>=b.z&&item.x+item.w/2<=b.x+b.w&&item.z+item.d/2<=b.z+b.d);
 return {...item,rotation:block?.front==='south'?Math.PI:0};
})}
  function visualGroups(buildings) {
    const remaining = new Set(buildings);
    const output = [];
    const occupancy = new Map();

    for (const building of buildings) {
      for (let x = building.x; x < building.x + building.w; x++) {
        for (let z = building.z; z < building.z + building.d; z++) {
          occupancy.set(`${x},${z}`, building);
        }
      }
    }

    for (const building of buildings) {
      if (!remaining.has(building)) continue;
      let merged = false;
      for (const [w, d] of MERGE_SIZES[building.kind] || []) {
        for (let x = building.x - w + building.w; x <= building.x && !merged; x++) {
          for (let z = building.z - d + building.d; z <= building.z && !merged; z++) {
            const members = new Set();
            let complete = true;
            for (let tx = x; tx < x + w && complete; tx++) {
              for (let tz = z; tz < z + d; tz++) {
                const member = occupancy.get(`${tx},${tz}`);
                if (!member || member.kind !== building.kind || !remaining.has(member)) {
                  complete = false;
                  break;
                }
                members.add(member);
              }
            }

            if (!complete || members.size < 2) continue;
            let area = 0;
            for (const member of members) {
              if (member.x < x || member.z < z || member.x + member.w > x + w || member.z + member.d > z + d) {
                complete = false;
                break;
              }
              area += member.w * member.d;
            }
            if (!complete || area !== w * d) continue;

            for (const member of members) remaining.delete(member);
            output.push({ kind: building.kind, x: x + w / 2, z: z + d / 2, w, d, merged: true });
            merged = true;
          }
        }
        if (merged) break;
      }
      if (!merged && remaining.delete(building)) {
        output.push({
          kind: building.kind,
          x: building.x + building.w / 2,
          z: building.z + building.d / 2,
          w: building.w,
          d: building.d
        });
      }
    }
    return output;
  }

root.VillageLayout={VERSION,migrate,chooseSite,visualGroups,orientedGroups};
})(globalThis);
