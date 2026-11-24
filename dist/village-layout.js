/* Organic settlement planner. Economic buildings remain the source of cost and capacity. */
(function (root) {
  'use strict';

  const VERSION = 10;
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

  function pathToRoad(start, foot, buildings, roadCells, valid, seed, radius, keepouts = []) {
    const cx = Math.floor(foot.x + foot.w / 2), cz = Math.floor(foot.z + foot.d / 2);
    const blocked = (x, z) => {
      if (x < cx - radius || x > cx + radius || z < cz - radius || z > cz + radius) return true;
      if (x >= foot.x && x < foot.x + foot.w && z >= foot.z && z < foot.z + foot.d) return true;
      if (buildings.some(b => x >= b.x && x < b.x + b.w && z >= b.z && z < b.z + b.d)) return true;
      if (keepouts.some(b => x >= b.x && x < b.x + b.w && z >= b.z && z < b.z + b.d)) return true;
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

  function allocate(v, kind, w, d, valid, formation = {}) {
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
        const targetRadius = formation.radius ?? (kind === 'house' ? 4.4 : 10.8);
        const targetAngle = formation.angle ?? Math.atan2(dz, dx);
        const angle = Math.atan2(dz, dx);
        let angleDelta = Math.abs(angle - targetAngle) % (Math.PI * 2);
        angleDelta = Math.min(angleDelta, Math.PI * 2 - angleDelta);
        const anchorDistance = formation.anchor
          ? Math.hypot(x + w / 2 - formation.anchor[0], z + d / 2 - formation.anchor[1])
          : 0;
        const clusterBias = formation.anchor
          ? anchorDistance * 1.1 + (formation.members.length ? nearSame * .72 : nearAny * .08)
          : kind === 'house' ? nearAny * .40 : nearSame * .48 + nearAny * .14;
        const radialBias = Math.abs(dist - targetRadius) * (kind === 'house' ? .42 : .30);
        const angularBias = angleDelta * targetRadius * .34;
        const irregular = noise(x, z, seed) * 1.1;
        candidates.push({ ...candidate, score: clusterBias + radialBias + angularBias + irregular });
      }
    }
    candidates.sort((a, b) => a.score - b.score);

    // Evaluate the best spatial candidates with a route to the existing shared lane network.
    for (const candidate of candidates.slice(0, 16)) {
      const targets = accessTargets(candidate).sort((a, b) =>
        Math.min(...[...roadCells].map(k => { const [x, z] = k.split(',').map(Number); return octile(a.cell[0], a.cell[1], [x, z]); })) -
        Math.min(...[...roadCells].map(k => { const [x, z] = k.split(',').map(Number); return octile(b.cell[0], b.cell[1], [x, z]); }))
      );
      let best = null;
      for (const target of targets) {
        const path = pathToRoad(target.cell, candidate, buildings, roadCells, valid, seed + candidate.x * 41 + candidate.z * 17, radius);
        if (!path) continue;
        const pathLength = path.length;
        const preferredOutwardAccess = formation.anchor
          ? Math.max(0, Math.hypot(target.cell[0] - cx, target.cell[1] - cz) - Math.hypot(candidate.x + w / 2 - cx, candidate.z + d / 2 - cz)) * .5
          : 0;
        if (!best || pathLength - preferredOutwardAccess < best.path.length - (best.preferredOutwardAccess || 0)) {
          best = { ...target, path, preferredOutwardAccess };
        }
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

  function buildingClusters(buildings, villageId) {
    const clusters = [];
    for (const kind of ['house', 'rice', 'wood']) {
      const members = buildings.filter(b => b.kind === kind)
        .sort((a, b) => b.w * b.d - a.w * a.d || String(a.id).localeCompare(String(b.id)));
      let cluster = null;
      for (const building of members) {
        const area = building.w * building.d;
        if (!cluster || cluster.tiles + area > 4) {
          cluster = { id: `${villageId}-${kind}-${clusters.filter(c => c.kind === kind).length}`, kind, tiles: 0, buildings: [] };
          clusters.push(cluster);
        }
        cluster.tiles += area;
        cluster.buildings.push(building);
        if (area >= 4) cluster = null;
      }
    }
    return clusters;
  }

  function packCluster(cluster) {
    if (cluster.tiles > 4) {
      cluster.w = Math.max(...cluster.buildings.map(b => b.w));
      cluster.d = Math.max(...cluster.buildings.map(b => b.d));
      cluster.parts = cluster.buildings.map(b => ({ building: b, x: 0, z: 0 }));
      cluster.grid = false;
      return cluster;
    }
    const parts = [], occupied = new Set();
    const members = [...cluster.buildings].sort((a, b) => b.w * b.d - a.w * a.d || String(a.id).localeCompare(String(b.id)));
    function place(index) {
      if (index >= members.length) return true;
      const building = members[index];
      if (building.w > 2 || building.d > 2) return false;
      for (let z = 0; z <= 2 - building.d; z++) for (let x = 0; x <= 2 - building.w; x++) {
        let clear = true;
        for (let tx = x; tx < x + building.w && clear; tx++) for (let tz = z; tz < z + building.d; tz++) {
          if (occupied.has(key(tx, tz))) { clear = false; break; }
        }
        if (!clear) continue;
        for (let tx = x; tx < x + building.w; tx++) for (let tz = z; tz < z + building.d; tz++) occupied.add(key(tx, tz));
        parts.push({ building, x, z });
        if (place(index + 1)) return true;
        parts.pop();
        for (let tx = x; tx < x + building.w; tx++) for (let tz = z; tz < z + building.d; tz++) occupied.delete(key(tx, tz));
      }
      return false;
    }
    if (!place(0)) {
      // Unexpected footprints stay intact as a dedicated parcel instead of being distorted.
      cluster.w = Math.max(...cluster.buildings.map(b => b.w));
      cluster.d = Math.max(...cluster.buildings.map(b => b.d));
      cluster.parts = cluster.buildings.map(b => ({ building: b, x: 0, z: 0 }));
      cluster.grid = false;
      return cluster;
    }
    cluster.w = 2; cluster.d = 2; cluster.parts = parts; cluster.grid = true;
    return cluster;
  }

  function angularSlot(index) {
    const sequence = [0, 1, -1, 2, -2, 3, -3, 4];
    return sequence[index % sequence.length];
  }

  function allocateCluster(v, cluster, valid, target) {
    const layout = v.layout, cx = Math.floor(v.x), cz = Math.floor(v.z), buildings = v.buildings;
    const seed = hashString(`${v.id}:${layout.generation || 0}:${cluster.id}`);
    const search = Math.min(25, target.radius + 4 + Math.max(cluster.w, cluster.d) * .25);
    const candidates = [];
    for (let x = Math.ceil(cx - search); x <= Math.floor(cx + search - cluster.w + 1); x++) {
      for (let z = Math.ceil(cz - search); z <= Math.floor(cz + search - cluster.d + 1); z++) {
        const candidate = { x, z, w: cluster.w, d: cluster.d };
        const mx = x + cluster.w / 2, mz = z + cluster.d / 2;
        const dx = mx - v.x, dz = mz - v.z, dist = Math.hypot(dx, dz), angle = Math.atan2(dz, dx);
        if (dist < Math.max(1.8, target.radius - 3.6) || dist > search - Math.max(cluster.w, cluster.d) * .25) continue;
        if (buildings.some(b => overlap(candidate, b)) || layout.blocks.some(b => overlap(candidate, b))) continue;
        if (layout.streets.some(road => road.path.some(([rx, rz]) => rx >= x - 1 && rx < x + cluster.w + 1 && rz >= z - 1 && rz < z + cluster.d + 1))) continue;
        if (!valid(x, z, cluster.w, cluster.d, false)) continue;
        let angleDelta = Math.abs(angle - target.angle) % (Math.PI * 2);
        angleDelta = Math.min(angleDelta, Math.PI * 2 - angleDelta);
        const radial = Math.abs(dist - target.radius);
        const anchorDistance = Math.hypot(mx - target.anchor[0], mz - target.anchor[1]);
        const irregular = noise(x, z, seed) * .42;
        const score = anchorDistance * 1.05 + radial * .42 + angleDelta * target.radius * .52 + irregular;
        candidates.push({ ...candidate, score });
      }
    }
    candidates.sort((a, b) => a.score - b.score);
    const roadCells = new Set(layout.streets.flatMap(road => road.path.map(([x, z]) => key(x, z))));
    for (const candidate of candidates.slice(0, 48)) {
      let best = null;
      const accessOptions = accessTargets(candidate).sort((a, b) =>
        Math.min(...[...roadCells].map(cell => { const [x, z] = cell.split(',').map(Number); return octile(a.cell[0], a.cell[1], [x, z]); })) -
        Math.min(...[...roadCells].map(cell => { const [x, z] = cell.split(',').map(Number); return octile(b.cell[0], b.cell[1], [x, z]); }))
      );
      for (const access of accessOptions.slice(0, 2)) {
        const path = pathToRoad(access.cell, candidate, buildings, roadCells, valid, seed,
          Math.max(18, Math.ceil(target.radius + 8)));
        if (path && (!best || path.length < best.path.length)) best = { ...access, path };
      }
      if (best) return { ...candidate, access: best };
    }
    return null;
  }

  function addCurvedRingLane(v, valid, radius, seed, angle) {
    const cx = Math.floor(v.x), cz = Math.floor(v.z), layout = v.layout;
    const buildings = v.buildings, span = 1.12, samples = Math.max(16, Math.ceil(radius * span * 8));
    const cells = [];
    for (let i = 0; i <= samples; i++) {
      const theta = angle - span / 2 + span * i / samples;
      const bend = (noise(i, Math.floor(seed % 997), seed) - .5) * .36;
      const x = Math.round(cx + Math.cos(theta) * (radius + bend));
      const z = Math.round(cz + Math.sin(theta) * (radius + bend));
      const cell = key(x, z);
      if (cells.at(-1)?.key !== cell) cells.push({ key: cell, point: [x, z] });
    }
    if (cells.length > 1 && cells[0].key === cells.at(-1).key) cells.pop();
    const clear = ({ point: [x, z] }) => !buildings.some(b => x >= b.x && x < b.x + b.w && z >= b.z && z < b.z + b.d) && !layout.blocks.some(b => x >= b.x && x < b.x + b.w && z >= b.z && z < b.z + b.d) && valid(x, z, 1, 1, true);
    // Keep the longest clear curved segment; it remains connected to the central plaza.
    let best = [], run = [];
    for (const cell of [...cells, { key: 'break', point: [NaN, NaN] }]) {
      if (cell.key !== 'break' && clear(cell) && (!run.length || Math.max(Math.abs(cell.point[0] - run.at(-1)[0]), Math.abs(cell.point[1] - run.at(-1)[1])) === 1)) run.push(cell.point);
      else {
        if (run.length > best.length) best = run;
        run = cell.key !== 'break' && clear(cell) ? [cell.point] : [];
      }
    }
    if (best.length < 4) return;
    const centerRoads = new Set(layout.streets.flatMap(road => road.path.map(([x, z]) => key(x, z))));
    const start = best[0];
    const join = pathToRoad(start, { x: cx, z: cz, w: 0, d: 0 }, buildings, centerRoads, valid, seed, Math.ceil(radius + 7), layout.blocks);
    if (!join) return;
    layout.streets.push({ kind: 'main', key: join.map(([x, z]) => key(x, z)).join(';'), path: join });
    layout.streets.push({ kind: 'ring', key: best.map(([x, z]) => key(x, z)).join(';'), path: best });
  }

  function plan(v, valid, generation) {
    const cx = Math.floor(v.x), cz = Math.floor(v.z);
    const draft = {
      ...v,
      buildings: [],
      layout: { version: VERSION, generation, lastBuildingCount: v.buildings.length, blocks: [], streets: [], clusters: [] }
    };
    // The plaza and irregular ring lane shape a village rather than a uniform block.
    const roadSeed = [[cx, cz], [cx, cz + 1]];
    draft.layout.streets.push({ kind: 'main', key: roadSeed.map(([x, z]) => key(x, z)).join(';'), path: roadSeed });
    const totalArea = v.buildings.reduce((sum, b) => sum + b.w * b.d, 0);
    const clusters = buildingClusters(v.buildings, v.id);
    const phase = (hashString(`${v.id}:city-ring`) / 4294967295) * Math.PI * 2;
    const homeClusters = clusters.filter(cluster => cluster.kind === 'house');
    const homeRingCount = Math.max(1, Math.ceil(homeClusters.length / 8));
    const counters = { house: 0, rice: 0, wood: 0 };
    const placedClusters = [];
    for (const cluster of clusters) {
      packCluster(cluster);
      const index = counters[cluster.kind]++;
      const ringLayer = Math.floor(index / 8);
      const localIndex = index % 8;
      const sector = angularSlot(localIndex);
      const typeOffset = cluster.kind === 'house' ? -.08 : .08;
      const angle = phase + sector * .78 + typeOffset + (noise(index, cluster.tiles, hashString(v.id + cluster.kind)) - .5) * .18;
      const radius = cluster.kind === 'house'
        ? 3.15 + ringLayer * 3.35
        : 5.65 + (homeRingCount - 1) * 3.35 + ringLayer * 3.45;
      const anchor = [v.x + Math.cos(angle) * radius, v.z + Math.sin(angle) * radius];
      const positioned = allocateCluster(draft, cluster, valid, { radius, angle, anchor });
      if (!positioned) return null;
      cluster.x = positioned.x; cluster.z = positioned.z; cluster.radius = radius; cluster.angle = angle; cluster.ring = ringLayer;
      for (const part of cluster.parts) {
        const building = { ...part.building, x: cluster.x + part.x, z: cluster.z + part.z, rotation: 0 };
        part.building = building;
        draft.buildings.push(building);
      }
      const block = { id: cluster.id, kind: cluster.kind, x: cluster.x, z: cluster.z, w: cluster.w, d: cluster.d, tiles: cluster.tiles };
      // This footprint is both a visual pack and a placement keepout. The
      // economic buildings remain separate entries in draft.buildings.
      draft.layout.blocks.push(block);
      for (const part of cluster.parts) part.building.rotation = positioned.access.rotation;
      if (positioned.access.path.length > 1) draft.layout.streets.push({
        kind: 'lane', key: positioned.access.path.map(([x, z]) => key(x, z)).join(';'), path: positioned.access.path
      });
      cluster.center = [cluster.x + cluster.w / 2, cluster.z + cluster.d / 2];
      draft.layout.clusters.push({ id: cluster.id, kind: cluster.kind, tiles: cluster.tiles, buildingIds: cluster.parts.map(p => p.building.id), x: cluster.x, z: cluster.z, w: cluster.w, d: cluster.d, center: cluster.center, radius, angle, ring: ringLayer, grid: cluster.grid });
      placedClusters.push(cluster);
    }

    const workClusters = placedClusters.filter(cluster => cluster.kind !== 'house');
    if (workClusters.length) {
      const outerRadius = Math.max(...workClusters.map(cluster => cluster.radius));
      const innerRadius = placedClusters.filter(cluster => cluster.kind === 'house').reduce((m, cluster) => Math.max(m, cluster.radius), 0);
      const laneRadius = Math.max(4.4, (outerRadius + (innerRadius || 2.6)) / 2);
      const laneAngle = workClusters[0].angle;
      addCurvedRingLane(draft, valid, laneRadius, hashString(`${v.id}:${generation}:circular-lane`), laneAngle);
    }
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
