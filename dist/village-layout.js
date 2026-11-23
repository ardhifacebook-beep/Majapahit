/* Street-front parcels. Economic buildings remain the source of capacity and cost. */
(function(root){'use strict';
const VERSION=6;
const MERGE_SIZES={house:[[4,6],[4,4],[2,3],[2,2]],rice:[[8,8],[4,4]],wood:[[4,4],[2,2]]};
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.z<b.z+b.d&&a.z+a.d>b.z;
function line(a,b){const out=[a];let [x,z]=a;while(x!==b[0]||z!==b[1]){if(x!==b[0])x+=Math.sign(b[0]-x);else z+=Math.sign(b[1]-z);out.push([x,z])}return out}
function hash(x,z,seed=0){const n=Math.sin(x*127.1+z*311.7+seed*74.7)*43758.5453;return n-Math.floor(n)}
function allocate(v,kind,w,d,valid){
 const layout=v.layout, cx=Math.floor(v.x),cz=Math.floor(v.z), buildings=v.buildings;
 const candidates=[];
 // Try positions around lived-in edges first; the preferred direction varies by settlement and history.
 const seed=String(v.id||'').split('').reduce((n,c)=>n+c.charCodeAt(0),0)+buildings.length*17;
 for(let radius=1;radius<=13;radius++)for(let x=cx-radius-5;x<=cx+radius+5;x++)for(let z=cz-radius-5;z<=cz+radius+5;z++){
   const dist=Math.hypot(x+w/2-cx,z+d/2-cz);if(dist>radius+1||dist<1.55)continue;
   for(const rot of [0,Math.PI]){const rw=w,rd=d;const b={x,z,w:rw,d:rd};
     if(buildings.some(o=>overlap(b,o))||layout.streets.some(r=>r.path.some(([rx,rz])=>rx>=x&&rx<x+rw&&rz>=z&&rz<z+rd))||!valid(x,z,rw,rd))continue;
     const same=buildings.filter(o=>o.kind===kind),all=buildings;
     const nearSame=same.length?Math.min(...same.map(o=>Math.hypot(x+rw/2-o.x-o.w/2,z+rd/2-o.z-o.d/2))):8;
     const nearAny=all.length?Math.min(...all.map(o=>Math.hypot(x+rw/2-o.x-o.w/2,z+rd/2-o.z-o.d/2))):dist;
     const radial=kind==='house'?dist:dist+3;
     const crowd=all.reduce((n,o)=>n+Math.max(0,2.5-Math.hypot(x+rw/2-o.x-o.w/2,z+rd/2-o.z-o.d/2)),0);
     const noise=hash(x,z,seed)*1.2+(rot?hash(x,z,seed+9)*.9:0);
     let score=radial*.55+nearAny*.35+crowd*.25+noise;
     if(same.length)score+=Math.min(nearSame,8)*.32;
     if(kind==='rice')score+=dist<3?6:0;
     if(kind==='wood')score+=dist<2?5:0;
     candidates.push({x,z,w:rw,d:rd,rotation:rot,score,dist});
   }
 }
 candidates.sort((a,b)=>a.score-b.score);
 // Try candidates in score order; route to a free cell beside the footprint.
 const route=(goal,foot)=>{const start=[cx,cz],q=[start],prev=new Map([[start.join(','),null]]);let end=null;for(let h=0;h<q.length;h++){const [x,z]=q[h];if(x===goal[0]&&z===goal[1]){end=[x,z];break}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=nx+','+nz;if(prev.has(k)||nx<cx-20||nx>cx+20||nz<cz-20||nz>cz+20)continue;if(buildings.some(o=>nx>=o.x&&nx<o.x+o.w&&nz>=o.z&&nz<o.z+o.d)||nx>=foot.x&&nx<foot.x+foot.w&&nz>=foot.z&&nz<foot.z+foot.d)continue;prev.set(k,[x,z]);q.push([nx,nz])}}if(!end)return null;const path=[];while(end){path.push(end);end=prev.get(end.join(','))}return path.reverse()};
 let chosen=null,clean=null;
 for(const c of candidates){const targets=[[c.x-1,Math.floor(c.z+c.d/2)],[c.x+c.w,Math.floor(c.z+c.d/2)],[Math.floor(c.x+c.w/2),c.z-1],[Math.floor(c.x+c.w/2),c.z+c.d]].sort((a,b)=>Math.hypot(a[0]-cx,a[1]-cz)-Math.hypot(b[0]-cx,b[1]-cz));let best=null;for(const t of targets){const p=route(t,c);if(p&&(!best||p.length<best.length))best=p}if(best){chosen=c;clean=best;break}}
 if(!chosen)return null;
 if(clean.length>1){const key=clean.map(p=>p.join(',')).join(';');if(!layout.streets.some(r=>r.key===key))layout.streets.push({kind:layout.streets.length?'lane':'main',key,path:clean})}
 return {x:chosen.x,z:chosen.z,rotation:chosen.rotation};
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
 const members=v.buildings.filter(b=>b.kind===item.kind&&b.x>=item.x-item.w/2&&b.x<item.x+item.w/2&&b.z>=item.z-item.d/2&&b.z<item.z+item.d/2);
 return {...item,rotation:members[0]?.rotation||0};
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
                if (!member || member.kind !== building.kind || member.rotation !== building.rotation || !remaining.has(member)) {
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
