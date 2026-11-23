/* Organic settlement planner. Economic buildings remain the source of cost and capacity. */
(function (root) {
  'use strict';

  const VERSION = 7;
  const REORGANIZE_EVERY = 5;
  const MERGE_SIZES = {
    house: [[4, 6], [4, 4], [2, 3], [2, 2]],
    rice: [[8, 8], [4, 4]],
    wood: [[4, 4], [2, 2]]
  };
  const DIRECTIONS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z;
  const key = (x, z) => `${x},${z}`;

  function hashString(value) {
    let h = 2166136261;
    for (const char of String(value || '')) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
    return h >>> 0;
  }

  function noise(x, z, seed) {
    let n = Math.imul((x + 4096) | 0, 374761393) + Math.imul((z + 4096) | 0, 668265263) + Math.imul(seed | 0, 1442695041);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  function push(heap, item) {
    let i = heap.length;
    heap.push(item);
    while (i) {
      const p = (i - 1) >> 1;
      if (heap[p].priority <= item.priority) break;
      heap[i] = heap[p]; i = p;
    }
    heap[i] = item;
  }

  function pop(heap) {
    const first = heap[0], last = heap.pop();
    if (heap.length) {
      let i = 0;
      while (true) {
        const left = i * 2 + 1, right = left + 1;
        if (left >= heap.length) break;
        const child = right < heap.length && heap[right].priority < heap[left].priority ? right : left;
        if (heap[child].priority >= last.priority) break;
        heap[i] = heap[child]; i = child;
      }
      heap[i] = last;
    }
    return first;
  }

  function octile(x, z, target) {
    const dx = Math.abs(x - target[0]), dz = Math.abs(z - target[1]);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  }

  function pathToRoad(start, foot, buildings, roadCells, valid, seed, radius) {
    const cx = Math.floor(foot.x + foot.w / 2), cz = Math.floor(foot.z + foot.d / 2);
    const blocked = (x, z) => {
      if (x < cx - radius || x > cx + radius || z < cz - radius || z > cz + radius) return true;
      if (x >= foot.x && x < foot.x + foot.w && z >= foot.z && z < foot.z + foot.d) return true;
      if (buildings.some(b => x >= b.x && x < b.x + b.w && z >= b.z && z < b.z + b.d)) return true;
      return !valid(x, z, 1, 1, true);
    };
    if (blocked(start[0], start[1])) return null;

    const targets = [...roadCells].map(k => k.split(',').map(Number));
    if (!targets.length) return null;
    const heuristic = (x, z) => Math.min(...targets.map(t => octile(x, z, t)));
    const startState = `${start[0]},${start[1]},8`;
    const heap = [], costs = new Map([[startState, 0]]), previous = new Map([[startState, null]]);
    push(heap, { x: start[0], z: start[1], dir: 8, state: startState, priority: heuristic(start[0], start[1]) });
    let found = null;
    const limit = Math.max(400, radius * radius * 16);
    let visited = 0;

    while (heap.length && visited++ < limit) {
      const current = pop(heap), baseCost = costs.get(current.state);
      if (baseCost === undefined) continue;
      if (roadCells.has(key(current.x, current.z))) { found = current.state; break; }
      for (let i = 0; i < DIRECTIONS.length; i++) {
        const [dx, dz] = DIRECTIONS[i], nx = current.x + dx, nz = current.z + dz;
        if (blocked(nx, nz)) continue;
        if (dx && dz && blocked(current.x + dx, current.z) && blocked(current.x, current.z + dz)) continue;
        const step = dx && dz ? Math.SQRT2 : 1;
        const turn = current.dir === 8 || current.dir === i ? 0 : .10;
        const variation = noise(nx, nz, seed) * .16;
        const nextCost = baseCost + step + turn + variation;
        const nextState = `${nx},${nz},${i}`;
        if (nextCost >= (costs.get(nextState) ?? Infinity)) continue;
        costs.set(nextState, nextCost);
        previous.set(nextState, current.state);
        push(heap, { x: nx, z: nz, dir: i, state: nextState, priority: nextCost + heuristic(nx, nz) });
      }
    }
    if (!found) return null;
    const path = [];
    for (let state = found; state; state = previous.get(state)) {
      const [x, z] = state.split(',').map(Number);
      path.push([x, z]);
    }
    return path.reverse();
  }

  function accessTargets(candidate) {
    const midX = Math.floor(candidate.x + candidate.w / 2), midZ = Math.floor(candidate.z + candidate.d / 2);
    const targets = [
      { cell: [midX, candidate.z - 1], rotation: 0, side: 'north' },
      { cell: [midX, candidate.z + candidate.d], rotation: Math.PI, side: 'south' }
    ];
    // Square assets can turn toward an east or west lane without changing their footprint.
    if (candidate.w === candidate.d) {
      targets.push({ cell: [candidate.x - 1, midZ], rotation: -Math.PI / 2, side: 'west' });
      targets.push({ cell: [candidate.x + candidate.w, midZ], rotation: Math.PI / 2, side: 'east' });
    }
    return targets;
  }

  function allocate(v, kind, w, d, valid) {
    const layout = v.layout, cx = Math.floor(v.x), cz = Math.floor(v.z), buildings = v.buildings;
    const seed = hashString(`${v.id}:${layout.generation || 0}:${buildings.length}:${kind}`);
    const totalArea = buildings.reduce((sum, b) => sum + b.w * b.d, w * d);
    const radius = Math.min(24, Math.max(9, Math.ceil(Math.sqrt(totalArea) * 1.55 + 4)));
    const occupiedRoad = new Set();
    for (const road of layout.streets) for (const [x, z] of road.path) occupiedRoad.add(key(x, z));
    const roadCells = new Set(layout.streets.flatMap(road => road.path.map(([x, z]) => key(x, z))));
    if (!roadCells.size) roadCells.add(key(cx, cz));

    const same = buildings.filter(b => b.kind === kind);
    const candidates = [];
    for (let x = cx - radius; x <= cx + radius - w + 1; x++) {
      for (let z = cz - radius; z <= cz + radius - d + 1; z++) {
        const candidate = { x, z, w, d };
        const dx = x + w / 2 - v.x, dz = z + d / 2 - v.z, dist = Math.hypot(dx, dz);
        if (dist < 2.1 || dist > radius - Math.max(w, d) * .3) continue;
        if (buildings.some(b => overlap(candidate, b))) continue;
        let roadCollision = false;
        for (let tx = x; tx < x + w && !roadCollision; tx++) for (let tz = z; tz < z + d; tz++) {
          if (occupiedRoad.has(key(tx, tz))) { roadCollision = true; break; }
        }
        if (roadCollision || !valid(x, z, w, d, false)) continue;

        const nearAny = buildings.length ? Math.min(...buildings.map(b => Math.hypot(x + w / 2 - b.x - b.w / 2, z + d / 2 - b.z - b.d / 2))) : dist;
        const nearSame = same.length ? Math.min(...same.map(b => Math.hypot(x + w / 2 - b.x - b.w / 2, z + d / 2 - b.z - b.d / 2))) : 5;
        const idealRadius = kind === 'house' ? 4.2 : 7.4;
        const clusterBias = kind === 'house' ? nearAny * .40 : nearSame * .48 + nearAny * .14;
        const radialBias = Math.abs(dist - idealRadius) * (kind === 'house' ? .30 : .23);
        const irregular = noise(x, z, seed) * 1.35;
        candidates.push({ ...candidate, score: clusterBias + radialBias + irregular });
      }
    }
    candidates.sort((a, b) => a.score - b.score);

    // Evaluate the best spatial candidates with a route to the existing shared lane network.
    for (const candidate of candidates.slice(0, 48)) {
      const targets = accessTargets(candidate).sort((a, b) =>
        Math.min(...[...roadCells].map(k => { const [x, z] = k.split(',').map(Number); return octile(a.cell[0], a.cell[1], [x, z]); })) -
        Math.min(...[...roadCells].map(k => { const [x, z] = k.split(',').map(Number); return octile(b.cell[0], b.cell[1], [x, z]); }))
      );
      let best = null;
      for (const target of targets) {
        const path = pathToRoad(target.cell, candidate, buildings, roadCells, valid, seed + candidate.x * 41 + candidate.z * 17, radius);
        if (path && (!best || path.length < best.path.length)) best = { ...target, path };
      }
      if (!best) continue;
      if (best.path.length > 1) {
        const roadKind = layout.streets.length ? 'lane' : 'main';
        const routeKey = best.path.map(([x, z]) => key(x, z)).join(';');
        layout.streets.push({ kind: roadKind, key: routeKey, path: best.path });
        for (const [x, z] of best.path) roadCells.add(key(x, z));
      }
      return { x: candidate.x, z: candidate.z, rotation: best.rotation };
    }
    return null;
  }

  function plan(v, valid, generation) {
    const cx = Math.floor(v.x), cz = Math.floor(v.z);
    const draft = {
      ...v,
      buildings: [],
      layout: { version: VERSION, generation, lastBuildingCount: v.buildings.length, blocks: [], streets: [] }
    };
    // Homes establish the settlement core; work areas then cluster along its growing edge.
    const originals = [...v.buildings].sort((a, b) => {
      const order = { house: 0, rice: 1, wood: 2 };
      return (order[a.kind] ?? 3) - (order[b.kind] ?? 3) || b.w * b.d - a.w * a.d || String(a.id).localeCompare(String(b.id));
    });
    // A short plaza lane gives the road tree a visible and consistent village center.
    const roadSeed = [[cx, cz], [cx, cz + 1]];
    draft.layout.streets.push({ kind: 'main', key: roadSeed.map(([x, z]) => key(x, z)).join(';'), path: roadSeed });
    for (const building of originals) {
      const pos = allocate(draft, building.kind, building.w, building.d, valid);
      if (!pos) return null;
      draft.buildings.push({ ...building, ...pos });
    }
    // Make the entrance segment the main route; the smaller branches remain lanes.
    if (draft.layout.streets.length > 1) draft.layout.streets[1].kind = 'main';
    return draft;
  }

  function reorganize(v, valid, force = false) {
    if (!Array.isArray(v.buildings) || !v.buildings.length) return false;
    const previous = v.layout || {};
    if (!force && v.layout?.version === VERSION && !isDue(v)) return false;
    const generation = (Number(previous.generation) || 0) + (previous.version === VERSION ? 1 : 0);
    const draft = plan(v, valid, generation);
    if (!draft) return false;
    v.buildings = draft.buildings;
    v.layout = draft.layout;
    return true;
  }

  function isDue(v) {
    const last = Number(v.layout?.lastBuildingCount);
    return Number.isFinite(last) && v.buildings.length - last >= REORGANIZE_EVERY;
  }

  function migrate(v, valid) {
    if (v.layout?.version === VERSION) return false;
    return reorganize(v, valid, true);
  }

  function chooseSite(v, kind, w, d, valid) {
    if (v.layout?.version !== VERSION && !migrate(v, valid)) return null;
    const draft = { ...v, buildings: [...v.buildings], layout: JSON.parse(JSON.stringify(v.layout)) };
    const pos = allocate(draft, kind, w, d, valid);
    if (!pos) return null;
    v.layout = draft.layout;
    return pos;
  }

  function orientedGroups(v) {
    return visualGroups(v.buildings).map(item => {
      const members = v.buildings.filter(b => b.kind === item.kind && b.x >= item.x - item.w / 2 && b.x < item.x + item.w / 2 && b.z >= item.z - item.d / 2 && b.z < item.z + item.d / 2);
      return { ...item, rotation: members[0]?.rotation || 0 };
    });
  }

  function visualGroups(buildings) {
    const remaining = new Set(buildings), output = [], occupancy = new Map();
    for (const building of buildings) for (let x = building.x; x < building.x + building.w; x++) for (let z = building.z; z < building.z + building.d; z++) occupancy.set(key(x, z), building);
    for (const building of buildings) {
      if (!remaining.has(building)) continue;
      let merged = false;
      for (const [w, d] of MERGE_SIZES[building.kind] || []) {
        for (let x = building.x - w + building.w; x <= building.x && !merged; x++) {
          for (let z = building.z - d + building.d; z <= building.z && !merged; z++) {
            const members = new Set(); let complete = true;
            for (let tx = x; tx < x + w && complete; tx++) for (let tz = z; tz < z + d; tz++) {
              const member = occupancy.get(key(tx, tz));
              if (!member || member.kind !== building.kind || member.rotation !== building.rotation || !remaining.has(member)) { complete = false; break; }
              members.add(member);
            }
            if (!complete || members.size < 2) continue;
            let area = 0;
            for (const member of members) {
              if (member.x < x || member.z < z || member.x + member.w > x + w || member.z + member.d > z + d) { complete = false; break; }
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
      if (!merged && remaining.delete(building)) output.push({ kind: building.kind, x: building.x + building.w / 2, z: building.z + building.d / 2, w: building.w, d: building.d });
    }
    return output;
  }

  root.VillageLayout = { VERSION, REORGANIZE_EVERY, migrate, chooseSite, reorganize, isDue, visualGroups, orientedGroups };
})(globalThis);
