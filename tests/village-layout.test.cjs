const assert = require('node:assert/strict');
const test = require('node:test');
const sim = require('../dist/simulation.js');
require('../dist/village-layout.js');
const MapGenerator = require('../dist/map.js');
const layout = globalThis.VillageLayout;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z;
const inside = (b, x, z) => x >= b.x && x < b.x + b.w && z >= b.z && z < b.z + b.d;

function village(role = 'rice', id = role) {
  const v = { id, x: .5, z: .5, role, food: 12, wood: 100 };
  sim.ensureVillage(v);
  return v;
}

function validOn(map) {
  return (x, z, w, d) => {
    if (x < -60 || x + w > 62 || z < -60 || z + d > 62) return false;
    for (let dx = 0; dx < w; dx++) for (let dz = 0; dz < d; dz++) {
      const tile = map.typeAt(x + dx + .5, z + dz + .5);
      if (tile === MapGenerator.WATER || tile === MapGenerator.HILL) return false;
    }
    return true;
  };
}

function check(v) {
  for (let i = 0; i < v.buildings.length; i++) for (let j = i + 1; j < v.buildings.length; j++) {
    assert.ok(!overlap(v.buildings[i], v.buildings[j]), 'building footprints overlap');
  }
  for (const road of v.layout.streets) for (let i = 0; i < road.path.length; i++) {
    const [x, z] = road.path[i];
    assert.ok(!v.buildings.some(b => inside(b, x, z)), 'road crosses a building');
    if (i) {
      const [px, pz] = road.path[i - 1];
      assert.ok(Math.max(Math.abs(x - px), Math.abs(z - pz)) === 1, 'road contains a disconnected jump');
    }
  }
  const area = v.buildings.reduce((n, b) => n + b.w * b.d, 0);
  assert.equal(layout.orientedGroups(v).reduce((n, b) => n + b.w * b.d, 0), area, 'visual merging preserves economic tile area');
}

function add(v, kind, w = 1, d = 1, valid = () => true) {
  const pos = layout.chooseSite(v, kind, w, d, valid);
  assert.ok(pos, `could not place ${kind} ${w}x${d}`);
  v.buildings.push({ id: `b${v.buildings.length}`, kind, w, d, ...pos });
}

function streetSignature(v) {
  return JSON.stringify({
    buildings: v.buildings.map(({ id, x, z, rotation }) => [id, x, z, rotation]),
    streets: v.layout.streets.map(({ kind, path }) => [kind, path])
  });
}

function assertStreetNetwork(v) {
  const cells = new Set(v.layout.streets.flatMap(road => road.path.map(([x, z]) => `${x},${z}`)));
  assert.ok(cells.size > 1, 'settlement has visible local streets');
  const [sx, sz] = v.layout.streets[0].path[0];
  const seen = new Set([`${sx},${sz}`]), queue = [[sx, sz]];
  while (queue.length) {
    const [x, z] = queue.shift();
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const next = `${x + dx},${z + dz}`;
      if ((dx || dz) && cells.has(next) && !seen.has(next)) { seen.add(next); queue.push([x + dx, z + dz]); }
    }
  }
  assert.equal(seen.size, cells.size, 'all village roads connect back to the plaza');
  for (const b of v.buildings) {
    let served = false;
    for (let x = b.x - 1; x <= b.x + b.w && !served; x++) for (let z = b.z - 1; z <= b.z + b.d && !served; z++) {
      if (x >= b.x && x < b.x + b.w && z >= b.z && z < b.z + b.d) continue;
      if (cells.has(`${x},${z}`)) served = true;
    }
    assert.ok(served, `building ${b.id} has a nearby road or shared courtyard access`);
  }
}

test('migration preserves economic state and becomes stable', () => {
  for (const role of ['rice', 'wood']) {
    const v = village(role), before = structuredClone(v);
    assert.ok(layout.migrate(v, () => true));
    for (const key of Object.keys(before).filter(k => k !== 'buildings')) assert.deepEqual(v[key], before[key]);
    assert.deepEqual(
      v.buildings.map(({ x, z, rotation, ...b }) => b).sort((a, b) => a.id.localeCompare(b.id)),
      before.buildings.map(({ x, z, ...b }) => b).sort((a, b) => a.id.localeCompare(b.id))
    );
    assert.equal(sim.housing(v), sim.housing(before));
    assert.equal(sim.dailyProduction(v, role === 'rice' ? 'food' : 'wood'), sim.dailyProduction(before, role === 'rice' ? 'food' : 'wood'));
    const saved = JSON.stringify(v);
    assert.equal(layout.migrate(v, () => true), false);
    assert.equal(JSON.stringify(v), saved);
    check(v);
    assertStreetNetwork(v);
  }
});

test('reorganizes after five new buildings, not five tiles, and preserves every building', () => {
  const v = village('rice', 'milestone'), valid = () => true;
  assert.ok(layout.migrate(v, valid));
  const originalIds = v.buildings.map(b => b.id).sort();
  const beforeSignature = streetSignature(v), economy = {
    food: v.food, wood: v.wood, population: v.population,
    housing: sim.housing(v), foodOutput: sim.dailyProduction(v, 'food'), foodCapacity: sim.capacity(v, 'food')
  };
  for (let i = 0; i < 4; i++) {
    add(v, i % 2 ? 'house' : 'rice', 1, 1, valid);
    assert.equal(layout.isDue(v), false, `building ${i + 1} should not trigger a re-layout`);
  }
  add(v, 'house', 2, 2, valid); // One building entity, four economic tiles.
  assert.equal(layout.isDue(v), true);
  const beforeReorganization = {
    food: v.food, wood: v.wood, population: v.population, housing: sim.housing(v),
    foodOutput: sim.dailyProduction(v, 'food'), foodCapacity: sim.capacity(v, 'food')
  };
  assert.ok(layout.reorganize(v, valid));
  assert.equal(layout.isDue(v), false);
  assert.equal(v.layout.lastBuildingCount, v.buildings.length);
  assert.equal(v.layout.generation, 1);
  assert.notEqual(streetSignature(v), beforeSignature, 'the village receives a new deterministic composition');
  assert.deepEqual(v.buildings.map(b => b.id).sort(), [...originalIds, ...Array.from({ length: 5 }, (_, i) => `b${originalIds.length + i}`)].sort());
  assert.equal(v.food, beforeReorganization.food);
  assert.equal(v.wood, beforeReorganization.wood);
  assert.equal(v.population, beforeReorganization.population);
  assert.equal(sim.housing(v), beforeReorganization.housing);
  assert.equal(sim.dailyProduction(v, 'food'), beforeReorganization.foodOutput);
  assert.equal(sim.capacity(v, 'food'), beforeReorganization.foodCapacity);
  check(v);
  assertStreetNetwork(v);
  const saved = JSON.stringify(v);
  assert.equal(layout.reorganize(v, valid), false, 'reload or redraw does not reroll the layout');
  assert.equal(JSON.stringify(v), saved);
});

test('the same village history produces the same streets and layout', () => {
  function make() {
    const v = village('wood', 'deterministic'), valid = () => true;
    assert.ok(layout.migrate(v, valid));
    for (const [kind, w, d] of [['house', 1, 1], ['wood', 1, 1], ['house', 2, 2], ['wood', 1, 1], ['house', 1, 1]]) add(v, kind, w, d, valid);
    assert.ok(layout.reorganize(v, valid));
    return streetSignature(v);
  }
  assert.equal(make(), make());
});

test('a 50-person village with several growth stages keeps capacity and connected streets', () => {
  const v = village('rice', 'large-village'), valid = () => true;
  v.population = 50;
  assert.ok(layout.migrate(v, valid));
  for (let i = 0; i < 8; i++) {
    add(v, 'house', 1, 1, valid);
    if (layout.isDue(v)) assert.ok(layout.reorganize(v, valid));
  }
  assert.equal(sim.housing(v), 50);
  assert.equal(v.buildings.filter(b => b.kind === 'house').length, 10);
  assert.equal(v.buildings.length, 14);
  assert.ok(v.layout.generation >= 1);
  check(v);
  assertStreetNetwork(v);
});

test('large assets and blocked terrain preserve valid occupancy', () => {
  const v = village('wood'), valid = (x, z, w, d) => x >= -55 && x + w <= 55 && z >= -55 && z + d <= 55 && !(x <= -8 && x + w > -8);
  assert.ok(layout.migrate(v, valid));
  for (const [kind, w, d] of [['house', 4, 6], ['wood', 4, 4], ['house', 2, 3]]) add(v, kind, w, d, valid);
  check(v);
  assert.ok(v.buildings.every(b => valid(b.x, b.z, b.w, b.d)));
});

test('failed migration, construction, and reorganization are transactional', () => {
  const v = village(), before = JSON.stringify(v);
  assert.equal(layout.migrate(v, () => false), false);
  assert.equal(JSON.stringify(v), before);
  layout.migrate(v, () => true);
  const after = JSON.stringify(v);
  assert.equal(layout.chooseSite(v, 'rice', 8, 8, () => false), null);
  assert.equal(JSON.stringify(v), after);
  for (let i = 0; i < 5; i++) add(v, 'house');
  assert.equal(layout.isDue(v), true);
  const pending = JSON.stringify(v);
  assert.equal(layout.reorganize(v, () => false), false);
  assert.equal(JSON.stringify(v), pending);
  assert.equal(layout.isDue(v), true, 'a failed layout remains due for a later retry');
});

test('terrain seeds never create illegal footprints or disconnected village roads', () => {
  let successes = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const map = MapGenerator.make(seed), v = village('rice', `seed-${seed}`), valid = validOn(map);
    if (!layout.migrate(v, valid)) continue;
    successes++;
    for (let i = 0; i < 10; i++) {
      const kind = i % 2 ? 'house' : 'rice';
      const pos = layout.chooseSite(v, kind, 1, 1, valid);
      if (pos) v.buildings.push({ id: `seed-${seed}-b${i}`, kind, w: 1, d: 1, ...pos });
      if (layout.isDue(v)) assert.ok(layout.reorganize(v, valid));
    }
    check(v);
    assertStreetNetwork(v);
    assert.ok(v.buildings.every(b => valid(b.x, b.z, b.w, b.d)));
  }
  assert.ok(successes > 0);
});
