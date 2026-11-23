/* Procedural placement and visual grouping for settlement buildings. */
(function (root) {
  'use strict';

  const MERGE_SIZES = {
    house: [[4, 6], [4, 4], [2, 3], [2, 2]],
    rice: [[8, 8], [4, 4]],
    wood: [[4, 4], [2, 2]]
  };

  function hashNoise(x, z, salt) {
    const n = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function gap(a, b) {
    const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w));
    const dz = Math.max(0, a.z - (b.z + b.d), b.z - (a.z + a.d));
    return Math.hypot(dx, dz);
  }

  function placementScore(village, kind, candidate, buildings, roads, salt) {
    const cx = candidate.x + candidate.w / 2;
    const cz = candidate.z + candidate.d / 2;
    const centerDistance = Math.hypot(cx - village.x, cz - village.z);
    const targetDistance = kind === 'house' ? 4.2 : kind === 'rice' ? 8.2 : 7.0;
    let score = -Math.abs(centerDistance - targetDistance) * 0.28;
    let nearestSame = Infinity;
    let nearestHome = Infinity;
    let nearestAny = Infinity;

    for (const building of buildings) {
      const distance = gap(candidate, building);
      nearestAny = Math.min(nearestAny, distance);
      if (building.kind === kind) nearestSame = Math.min(nearestSame, distance);
      if (building.kind === 'house') nearestHome = Math.min(nearestHome, distance);
    }

    if (nearestSame === 0) score += 3.2;
    else if (nearestSame <= 1) score += 2.1;
    else if (nearestSame <= 3) score += 0.7;

    if (kind !== 'house' && nearestHome <= 2) score += 0.8;
    if (nearestAny > 4) score -= Math.min(2.2, (nearestAny - 4) * 0.18);

    let nearestRoad = Infinity;
    for (const road of roads) {
      for (const point of road.path || []) {
        const dx = Math.max(candidate.x - (point[0] + 0.5), 0, (point[0] + 0.5) - (candidate.x + candidate.w));
        const dz = Math.max(candidate.z - (point[1] + 0.5), 0, (point[1] + 0.5) - (candidate.z + candidate.d));
        nearestRoad = Math.min(nearestRoad, Math.hypot(dx, dz));
      }
    }
    if (nearestRoad < 4) score += (4 - nearestRoad) * 0.38;

    // Small stable variation prevents every village from forming the same rigid ring.
    score += (hashNoise(candidate.x, candidate.z, salt) - 0.5) * 1.5;
    return score;
  }

  function chooseSite(village, kind, w, d, buildings, roads, isValid, salt = 1) {
    const candidates = new Map();
    const centerX = Math.floor(village.x);
    const centerZ = Math.floor(village.z);
    const steps = 64;

    for (let radius = 2; radius <= 15; radius += 0.5) {
      for (let i = 0; i < steps; i++) {
        const angle = i * Math.PI * 2 / steps;
        const x = Math.round(centerX + Math.cos(angle) * radius - w / 2);
        const z = Math.round(centerZ + Math.sin(angle) * radius - d / 2);
        const key = `${x},${z}`;
        if (candidates.has(key) || !isValid(x, z, w, d)) continue;
        candidates.set(key, {
          x,
          z,
          score: placementScore(village, kind, { x, z, w, d }, buildings, roads, salt)
        });
      }
    }

    let best = null;
    for (const candidate of candidates.values()) {
      if (!best || candidate.score > best.score) best = candidate;
    }
    return best && { x: best.x, z: best.z };
  }

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

  root.VillageLayout = { chooseSite, visualGroups };
})(typeof globalThis !== 'undefined' ? globalThis : this);
