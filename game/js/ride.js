// ---------------------------------------------------------------- ride: the Wind Lover movement core, carried over
// Lean-driven steering on a damped spring, short inputs as sidesteps and held inputs as arcs, the float, grip that
// turns slide back into speed, the long pull on straights, road affinity, the auto-hop, ground hugging and walls
// that are real (a scrape below WALL_CRASH, a crash above). Added here: expressway decks, ramps and parapets,
// and the stance (構え) that slows the board and steers it in onto a target.
const P = {
  pos: new V3(), vel: new V3(), yaw: 0, n: new V3(0, 1, 0), grounded: false, air: 0, coyote: 0, hopping: false,
  flow: 0, carve: 0, ajCD: 0, skipT: 0, hull: 3, braking: false, drift: 0, drifting: false, tuck: false,
  yawRate: 0, lean: 0, leanV: 0, assistLean: 0, sway: 0, hold: 0, holdSign: 0, onRoad: false, onWater: false, surf: 'ground',
  shelter: false, invuln: 0, stagger: 0, dead: false, dist: 0, souls: store.get('ukiyo.souls', 0), grazes: 0, kamae: false,
};
const HOVER = BOARD.hover;
const fwd = new V3(0, 0, 1), fPl = new V3(), side = new V3(), tmp = new V3(), tmp2 = new V3(), UP = new V3(0, 1, 0);
const inp = { jx: 0, jy: 0, kx: 0, ky: 0, kamaeHeld: false, keys: {} };
let shake = 0, dashPunch = 0, landSquash = 0, simT = 0, steerSm = 0;

const START_POINTS = [
  { id: 'nihonbashi', name: '日本橋', x: 1950, z: 160, yaw: 0, desc: '五街道の起点、銀座へ南へ' },
  { id: 'toyosu', name: '豊洲', x: 3600, z: 4700, yaw: 0.9, desc: '埋立地の晴海通り' },
  { id: 'odaiba', name: 'お台場', x: 2150, z: 6150, yaw: 0, desc: '海岸通り、観覧車のそば' },
  { id: 'shinagawa', name: '品川', x: -1250, z: 6000, yaw: Math.PI, desc: '第一京浜を北へ' },
  { id: 'shibuya', name: '渋谷', x: -4600, z: 3000, yaw: Math.PI - 0.58, desc: '谷底の交差点から玉川通りへ' },
  { id: 'tamagawa', name: '多摩川の河川敷', x: -12900, z: 9000, yaw: -0.9, desc: '夕暮れの土手と鉄橋' },
  { id: 'okutama', name: '奥多摩の峠', x: -27000, z: -800, yaw: Math.PI - 0.6, desc: '杉林を抜ける中央道' },
  { id: 'tanbo', name: '見沼の田んぼ', x: 1500, z: -17500, yaw: -Math.PI / 2, desc: '稲穂と送電鉄塔の道' },
  { id: 'aqua', name: '海の上の道', x: 2500, z: 16000, yaw: 1.1, desc: '湾を渡る一本の橋' },
];
const START = START_POINTS[0]; // Default: Nihonbashi, facing south down the Ginza main street
function placeAt(x, z, yaw, speed) {
  const g = ground(x, z, Infinity);
  P.pos.set(x, g.h + HOVER + 0.4, z); P.yaw = yaw; P.grounded = false; P.air = 0.01; P.n.copy(g.n);
  fwd.set(Math.sin(yaw), 0, Math.cos(yaw)); P.vel.copy(fwd).multiplyScalar(speed);
  P.lean = P.leanV = P.sway = P.hold = 0; P.stagger = 0;
  if (typeof onPlaced === 'function') onPlaced();
}
function placeStart(startId = null) {
  const sp = START_POINTS.find((q) => q.id === startId) || START;
  // on the sea road, start on the deck; elsewhere on the nearest road
  const kinds = sp.id === 'aqua' ? ['exp'] : ['art', 'rail'];
  const a = nearestPath(sp.x, sp.z, kinds);
  let yaw = a ? Math.atan2(a.tx, a.tz) : sp.yaw;
  if (a && Math.cos(yaw - sp.yaw) < 0) yaw += Math.PI;
  placeAt(a ? a.cx : sp.x, a ? a.cz : sp.z, yaw, S.cruise * 0.6);
  if (a && a.p.kind === 'exp') { P.pos.y = expDeckAt(a) + HOVER + 0.5; }
}
// a random road somewhere in the city: an arterial, away from water and the edges
function randomRoad() {
  const arts = PATHS.filter((p) => p.kind === 'art' && p.len > 1500);
  for (let k = 0; k < 40; k++) {
    const p = arts[(Math.random() * arts.length) | 0], q = p.at(200 + Math.random() * (p.len - 400), {});
    if (!inWorld(q.x, q.z, 1500) || site(q.x, q.z).sd < 30) continue;
    return { x: q.x, z: q.z, yaw: Math.atan2(q.tx, q.tz) + (Math.random() < 0.5 ? Math.PI : 0) };
  }
  return { x: START.x, z: START.z, yaw: 0 };
}
// Select a specific start point by id
function getStartPoint(startId) {
  const found = START_POINTS.find(sp => sp.id === startId);
  return found || START;
}

function stepPhysics(dt) {
  let sx = clamp(inp.jx + inp.kx, -1, 1), sy = clamp(inp.jy + inp.ky, -1, 1);
  if (P.kamae) { sx *= 0.8; sy = 0; }         // in the stance you can still lean out of a line of rounds
  if (P.stagger > 0 || P.dead) { sx = 0; sy = 0; }
  P.stagger = Math.max(0, P.stagger - dt); P.invuln = Math.max(0, P.invuln - dt);
  const steer = Math.sign(sx) * Math.pow(Math.abs(sx), 1.2);
  steerSm = lerp(steerSm, steer, 1 - Math.exp(-10 * dt));
  P.coyote -= dt;
  const speed = P.vel.length(), sf = clamp(speed / S.maxSpeed, 0, 1), V = BOARD;
  const back = sy < -0.35;
  P.drifting = P.grounded && back && Math.abs(steer) > 0.35 && speed > 14;
  P.tuck = sy > 0.35;
  const braking = back && !P.drifting, brakeAmt = braking ? clamp((-sy - 0.35) / 0.65, 0.2, 1) : 0;
  P.braking = braking;

  // lean on a damped spring; yaw from lean ~ tan(lean)/v^0.88
  const maxLean = Math.min(1.2, 0.8 * S.turn) * (P.drifting ? 1.25 : 1) * (P.tuck ? 0.85 : 1);
  const w0 = V.roll * 1.55 * (P.drifting ? 1.3 : 1);
  P.leanV += (w0 * w0 * (steer * maxLean - P.lean) - 2 * 0.62 * w0 * P.leanV) * dt;
  P.lean = clamp(P.lean + P.leanV * dt, -1.3, 1.3);
  const vTurn = Math.pow(Math.max(Math.hypot(P.vel.x, P.vel.z), 10), 0.88);
  // a short input is mostly a sidestep: the heading only comes round as the input is held
  if (Math.abs(steer) > 0.15 && Math.sign(steer) === P.holdSign) P.hold += dt; else { P.hold = Math.max(0, P.hold - dt * 3); if (Math.abs(steer) > 0.15) { P.holdSign = Math.sign(steer); P.hold = 0; } }
  // in town the arc comes in sooner than on the open road: corners are 80 m apart
  const holdK = P.drifting ? 1 : lerp(0.36, 1, smooth(0.35, 1.9, P.hold));
  P.yawRate = clamp(-(P.grounded ? 34 : 27) * holdK * Math.tan(P.lean) / vTurn * (P.drifting ? 1.6 : 1), -2.4, 2.4);
  P.yaw += P.yawRate * dt;
  roadAffinity(steer, dt);
  if (P.kamae) kamaeSteer(dt);
  { const hsx = Math.hypot(P.vel.x, P.vel.z), swayT = P.grounded && !P.drifting && !P.dead ? steer * 8.5 * clamp((hsx - 8) / 30, 0, 1) : 0;
    P.sway += (swayT - P.sway) * (1 - Math.exp(-(Math.abs(swayT) > Math.abs(P.sway) ? 3.2 : 2.0) * dt)); }
  fwd.set(Math.sin(P.yaw), 0, Math.cos(P.yaw));

  if (P.grounded) {
    const n = P.n;
    P.vel.addScaledVector(n, -P.vel.dot(n));
    fPl.copy(fwd).addScaledVector(n, -fwd.dot(n)).normalize();
    side.crossVectors(n, fPl).normalize();
    tmp.set(0, -S.gravity, 0).addScaledVector(n, S.gravity * n.y);
    let gf = tmp.dot(fPl); const gs = tmp.dot(side);
    if (gf < 0) gf *= 0.7 / S.inertia;
    let vf = P.vel.dot(fPl), vs = P.vel.dot(side);
    vf += gf * dt; vs += gs * dt;
    const grip = (P.drifting ? 1.3 : V.grip * lerp(1, 0.78, sf) * (P.onRoad || P.onWater ? 1 : 0.72) * (1 + 0.45 * roadPull)) / S.inertia;
    const nvs = vs * Math.exp(-grip * dt);
    if (vf >= 0) vf += (Math.abs(vs) - Math.abs(nvs)) * (P.drifting ? 0.9 : 0.86); else vf *= Math.exp(-3 * dt);
    const cruiseNow = S.cruise * (1 + P.flow * 0.5), maxNow = S.maxSpeed * (1 + P.flow * 0.3);
    let target = S.auto && !braking && !P.dead ? cruiseNow : 0, acc = V.accel * (vf < 12 ? 0.55 : 1);
    if (P.tuck && target > 0) { target = cruiseNow * 1.35; acc *= 1.6; }
    // in the stance the board glides: it eases toward most of the speed it came in with, never a hard brake
    if (P.kamae) { const kv = IAI.kamaeV || KAMAE_V; target = kv; if (vf > kv && !(IAI.surgeT > 0)) vf -= (vf - kv) * 0.7 * dt; }
    if (vf < target) vf += acc * dt * (1 - clamp(vf / Math.max(target, 1), 0, 1) * 0.5);
    if (braking) vf = Math.max(0, vf - 26 * brakeAmt * dt);
    P.onRoad = P.surf === 'exp' || P.surf === 'ramp' || P.surf === 'bridge' || roadOnNow;
    if (P.onRoad && !P.kamae) vf += 5 * dt;
    if (vf > cruiseNow) vf -= (vf - cruiseNow) * (P.onWater ? 0.02 : P.onRoad ? 0.003 : 0.007) * dt;
    const straight = 1 - smooth(0.3, 0.7, Math.abs(P.lean)), bend = smooth(0.62, 0.95, Math.abs(P.lean));
    if (S.auto && !braking && !P.dead && !P.kamae) { const top = maxNow * 0.96; if (vf > cruiseNow * 0.85 && vf < top) vf += 2.3 * straight * (1 - vf / top) * (P.onRoad ? 1.3 : 1) * dt; }
    if (vf > S.cruise * 1.3) vf -= (vf - S.cruise * 1.3) * 0.55 * bend * dt;
    if (vf > maxNow) vf -= (vf - maxNow) * 1.5 * dt;
    if (P.drifting) {
      P.drift += dt;
      if (Math.random() < dt * 40) fxDust(tmp.copy(P.pos).addScaledVector(fwd, -1).addScaledVector(UP, -HOVER + 0.1), tmp2.copy(side).multiplyScalar(-steer * 4).addScaledVector(P.vel, 0.6));
    } else {
      if (P.drift > 0.45) { const boost = Math.min(22, 6 + P.drift * 10); vf += boost + Math.abs(nvs) * 0.5; dashPunch = Math.max(dashPunch, 0.6); sfx.dash(); }
      P.drift = 0;
    }
    P.vel.copy(fPl).multiplyScalar(vf).addScaledVector(side, nvs);
    P.carve = clamp(Math.abs(nvs) / 14 + Math.abs(P.yawRate) * sf * 0.45, 0, 1);
  } else {
    P.carve = 0;
    const hsNow = Math.hypot(P.vel.x, P.vel.z);
    if (P.vel.y > 10 && !P.hopping) P.vel.y = 10;
    const sinkMax = lerp(34, 10, smooth(22, 80, hsNow));
    if (P.vel.y < -sinkMax) P.vel.y += (-sinkMax - P.vel.y) * (1 - Math.exp(-2.6 * dt));
    P.vel.y -= S.gravity * 1.2 * dt;
    const hx = P.vel.x, hz = P.vel.z, hs = Math.hypot(hx, hz);
    if (hs > 0.5) {
      const k = 1 - Math.exp(-(0.9 / S.inertia) * dt);
      P.vel.x += (fwd.x * hs - hx) * k; P.vel.z += (fwd.z * hs - hz) * k;
      const nh = Math.hypot(P.vel.x, P.vel.z) || 1; P.vel.x *= hs / nh; P.vel.z *= hs / nh;
    }
    P.air += dt; P.drift = 0;
  }
  autoHop();
  if (P.vel.length() > S.maxSpeed * 1.7) P.vel.multiplyScalar(1 - 1.5 * dt);
  P.pos.addScaledVector(P.vel, dt);
  P.pos.x += -fwd.z * P.sway * dt; P.pos.z += fwd.x * P.sway * dt; // the float: to the rider's right for a right input
  collide();
  resolveGround(dt);
  deckWalls();
  P.dist += Math.hypot(P.vel.x, P.vel.z) * dt;
  P.ajCD -= dt; P.skipT -= dt;
  if (!P.dead) { if (braking) P.flow = Math.max(0, P.flow - dt * 0.3); else if (speed > S.cruise * 0.8) P.flow = Math.min(1, P.flow + dt / 50); }
  // the world's edge is a wall of mist
  const m = 500;
  if (P.pos.x < WORLD.x0 + m) { P.pos.x = WORLD.x0 + m; if (P.vel.x < 0) P.vel.x *= -0.3; }
  if (P.pos.x > WORLD.x1 - m) { P.pos.x = WORLD.x1 - m; if (P.vel.x > 0) P.vel.x *= -0.3; }
  if (P.pos.z < WORLD.z0 + m) { P.pos.z = WORLD.z0 + m; if (P.vel.z < 0) P.vel.z *= -0.3; }
  if (P.pos.z > WORLD.z1 - m) { P.pos.z = WORLD.z1 - m; if (P.vel.z > 0) P.vel.z *= -0.3; }
  if (!isFinite(P.pos.x + P.pos.y + P.pos.z + P.vel.x + P.vel.y + P.vel.z)) placeStart();
}

// road affinity, generalised from the Wind Lover highway to every road: settle onto the line with the stick
// near centre, finish a turn onto a road without overshooting, nudge back from an edge. Strong steering wins.
let roadPull = 0, roadOnNow = false, roadCur = null;
function roadAffinity(steer, dt) {
  roadPull = Math.max(0, roadPull - dt * 2);
  P.assistLean *= Math.exp(-6 * dt);
  const hw = roadNear(P.pos.x, P.pos.z, P.pos.y, P.yaw); roadCur = hw;
  roadOnNow = !!hw && hw.d < hw.half + 0.5;
  if (!P.grounded || P.drifting || !hw || window.__noAssist) return;
  const HALF = hw.half, reach = HALF + (hw.kind === 'local' ? 10 : 30);
  if (hw.d > reach) return;
  let ty = Math.atan2(hw.tx, hw.tz); if (Math.cos(ty - P.yaw) < 0) ty += Math.PI;
  const dy = wrapA(ty - P.yaw), ady = Math.abs(dy), as = Math.abs(steer);
  const turningToward = as > 0.12 && Math.sign(P.yawRate) === Math.sign(dy) && Math.sign(P.yawRate) !== 0;
  const onRoad = hw.d < HALF + 2;
  let k = 0;
  if (onRoad && as < 0.3 && ady < 0.7) k = 2.6 * (1 - as / 0.3) * (1 - ady / 0.7);
  else if (turningToward && ady < 1.1) {
    const near = onRoad ? 1 : 1 - (hw.d - HALF - 2) / (reach - HALF - 2);
    k = 1.3 * near * smooth(0.02, 0.25, ady) * (1 - smooth(0.7, 1.1, ady));
    if (ady < 0.14) P.lean *= Math.exp(-4 * (1 - ady / 0.14) * near * dt);
  } else if (as < 0.12 && ady < 0.35) {
    const near = onRoad ? 1 : 1 - (hw.d - HALF - 2) / (reach - HALF - 2);
    if (Math.sign(P.yawRate) === -Math.sign(dy)) P.lean *= Math.exp(-6 * near * dt);
    if (onRoad) k = 1.2 * (1 - ady / 0.35);
  }
  const yaw0 = P.yaw;
  if (k > 0 && !P.kamae) { P.yaw += dy * (1 - Math.exp(-k * dt)); roadPull = Math.max(roadPull, Math.min(1, k)); }
  if (dt > 0) { const vT = Math.pow(Math.max(Math.hypot(P.vel.x, P.vel.z), 10), 0.88), rate = (P.yaw - yaw0) / dt; P.assistLean = lerp(P.assistLean, clamp(Math.atan(-rate * vT / 43), -0.55, 0.55), 1 - Math.exp(-8 * dt)); }
  if (onRoad && !P.kamae) {
    // near the edge and heading out without firm steering: a soft nudge back, and the outward slide bleeds off
    const off = (P.pos.x - hw.cx) * hw.nx + (P.pos.z - hw.cz) * hw.nz, sg = Math.sign(off) || 1, edge = smooth(HALF - Math.min(6, HALF * 0.5), HALF - 0.8, Math.abs(off));
    const out = (Math.sin(P.yaw) * hw.nx + Math.cos(P.yaw) * hw.nz) * sg;
    if (edge > 0 && out > 0 && ady < 0.6) {
      const fight = as > 0.45 && Math.sign(P.yawRate) === -Math.sign(dy) && ady > 0.05;
      if (!fight) {
        P.yaw += dy * (1 - Math.exp(-edge * (as < 0.3 ? 1.1 : 0.7) * dt));
        const vout = (P.vel.x * hw.nx + P.vel.z * hw.nz) * sg;
        if (vout > 0) { const kk = vout * edge * 1.4 * dt; P.vel.x -= hw.nx * sg * kk; P.vel.z -= hw.nz * sg * kk; }
        roadPull = Math.max(roadPull, edge * 0.6);
      }
    }
  }
}

function autoHop() {
  if (P.ajCD > 0 || P.dead || !(P.grounded || P.coyote > 0)) return;
  const hs = Math.hypot(P.vel.x, P.vel.z); if (hs < 12) return;
  const ux = P.vel.x / hs, uz = P.vel.z / hs, feet = P.pos.y - HOVER, reach = hs * 0.6;
  const near = colNear(P.pos.x + ux * reach * 0.5, P.pos.z + uz * reach * 0.5).filter((c) => !c.noHop);
  if (!near.length) return;
  for (let d = 2; d <= reach; d += 2) {
    const qx = P.pos.x + ux * d, qz = P.pos.z + uz * d; let need = -Infinity;
    for (const c of near) {
      const dx = qx - c.x, dz = qz - c.z, lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
      if (Math.abs(lx) > c.hw + 1 || Math.abs(lz) > c.hd + 1) continue;
      if (c.top <= feet + 0.8 || P.pos.y > c.top + 0.6) continue;
      need = Math.max(need, c.top + 1.6 - feet);
    }
    if (need > -Infinity) {
      const tq = d / hs, vy = need / tq + 0.5 * S.gravity * 1.2 * tq;
      if (vy > 0 && vy <= 24) { P.vel.y = Math.max(P.vel.y, vy); P.hopping = true; P.grounded = false; P.air = 0.01; P.coyote = 0; P.ajCD = 0.4; landSquash = -0.3; sfx.hop(); }
      return;
    }
  }
}
function collide() {
  const list = colNear(P.pos.x, P.pos.z);
  for (const c of list) {
    const dx = P.pos.x - c.x, dz = P.pos.z - c.z, r = Math.max(c.hw, c.hd) + 4;
    if (dx * dx + dz * dz > r * r * 2) continue;
    let lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
    if (P.pos.y >= c.top - 0.4 || P.pos.y < c.bottom) continue;
    // a near miss: skimming past a pillar or a wall at speed is rewarded with a whoosh and a little flow
    { const ox = Math.max(Math.abs(lx) - c.hw, 0), oz = Math.max(Math.abs(lz) - c.hd, 0), od = Math.hypot(ox, oz), hsp = Math.hypot(P.vel.x, P.vel.z);
      if (od > 0 && od < 2.6 && hsp > 36 && (c.nm || 0) < simT && !P.dead) { c.nm = simT + 2.5; nearMiss(); } }
    const pad = 0.55, px = c.hw + pad - Math.abs(lx), pz = c.hd + pad - Math.abs(lz);
    if (px <= 0 || pz <= 0) continue;
    let nx, nz;
    if (px < pz) { const sg = Math.sign(lx) || 1; lx = sg * (c.hw + pad); nx = c.c * sg; nz = -c.s * sg; }
    else { const sg = Math.sign(lz) || 1; lz = sg * (c.hd + pad); nx = c.s * sg; nz = c.c * sg; }
    P.pos.x = c.x + lx * c.c + lz * c.s; P.pos.z = c.z - lx * c.s + lz * c.c;
    if (P.vel.x * nx + P.vel.z * nz < 0 && wallImpact(nx, nz)) return;
  }
}
// n points from the wall into free space. Head-on above WALL_CRASH is a crash; shallower is a scrape.
const WALL_CRASH = 24;
let scrapeT = 0;
function wallImpact(nx, nz, soft) {
  const vn = P.vel.x * nx + P.vel.z * nz;
  if (vn >= 0) return false;
  const hit = -vn;
  if (hit > WALL_CRASH * (soft ? 1.6 : 1) && P.invuln <= 0) { P.vel.x += nx * hit * 0.3; P.vel.z += nz * hit * 0.3; crash(hit); P.yawRate = 0; return true; }
  P.vel.x -= vn * nx * 1.15; P.vel.z -= vn * nz * 1.15;
  const fr = 1 - Math.min(0.22, 0.004 + hit * 0.011); P.vel.x *= fr; P.vel.z *= fr;
  P.flow *= 1 - Math.min(0.5, hit / 36);
  const ty = Math.atan2(P.vel.x, P.vel.z), dy = wrapA(ty - P.yaw);
  P.yaw += dy * 0.7; P.yawRate *= 0.35; P.lean *= 0.6; P.leanV *= 0.3; P.sway *= 0.3; fwd.set(Math.sin(P.yaw), 0, Math.cos(P.yaw));
  tmp.set(P.pos.x - nx * 0.8, P.pos.y - HOVER + 0.5, P.pos.z - nz * 0.8);
  fxSparks(tmp, nx, nz, 3 + Math.min(14, hit * 1.4));
  shake = Math.max(shake, Math.min(0.7, 0.1 + hit / 26));
  if (scrapeT < simT) { sfx.scrape(Math.min(1, 0.25 + hit / 16)); scrapeT = simT + 0.09; if (hit > 6) buzz(16); }
  return false;
}
function crash(hit) {
  shake = 1.4; P.vel.multiplyScalar(0.08); P.vel.y = 4; P.grounded = false; P.air = 0.01; P.flow = 0; P.invuln = 1.0; P.stagger = 0.7;
  fxDust(tmp.copy(P.pos), tmp2.set(0, 4, 0)); fxDust(tmp.copy(P.pos), tmp2.set(3, 3, 0)); fxDust(tmp.copy(P.pos), tmp2.set(-3, 3, 0)); sfx.crash(); buzz([60, 30, 120]);
  if (hit > 36) hurt('激突');
  else toast('激突', '', 900);
}
// parapets on the decks: soft walls you can still fly over, open where a ramp runs alongside
function deckWalls() {
  if (P.surf !== 'exp' || !GR_last.exp) return;
  const e = GR_last.exp, ao = Math.abs(e.off), lim = EXP_HALF - 0.5;
  if (ao <= lim) return;
  const sg = Math.sign(e.off) || 1;
  if (e.p.ramps.some((r) => r.side === sg && e.s > r.s0 - 6 && e.s < r.s0 + r.L + 6)) return;
  if (P.pos.y > expDeckAt(e) + HOVER + 1.6) return;
  const p = e.off - sg * lim; P.pos.x -= e.nx * p; P.pos.z -= e.nz * p; wallImpact(-sg * e.nx, -sg * e.nz, true);
}
let GR_last = { exp: null };
function resolveGround(dt) {
  const g = ground(P.pos.x, P.pos.z, P.pos.y - HOVER + 0.5);
  GR_last = { exp: g.exp }; P.surf = g.surf; P.shelter = g.shelter;
  const target = g.h + HOVER, gap = P.pos.y - target, wasG = P.grounded, hsg = Math.hypot(P.vel.x, P.vel.z);
  if (gap <= 0 || (wasG && !P.hopping && gap < 1.1 + hsg * 0.03 && P.vel.dot(g.n) < 6)) {
    if (!wasG) { landing(g); P.hopping = false; }
    if (g.n.y < 0.5 && !g.water) { const l = Math.hypot(g.n.x, g.n.z) || 1; wallImpact(g.n.x / l, g.n.z / l, true); }
    P.pos.y = target; P.n.copy(g.n);
    const vn = P.vel.dot(P.n); if (vn < 0 || wasG) P.vel.addScaledVector(P.n, -vn);
    P.grounded = true; P.air = 0; P.onWater = g.water;
    const hsw = Math.hypot(P.vel.x, P.vel.z);
    if (g.water && hsw > 30 && P.skipT <= 0) { // skipping over water at speed
      P.vel.y = Math.min(5 + hsw * 0.03, 9); P.grounded = false; P.air = 0.01; P.skipT = 0.6;
      fxSplash(tmp.copy(P.pos).addScaledVector(UP, -HOVER)); sfx.splash();
    }
  } else {
    if (wasG) P.coyote = 0.12;
    P.grounded = false;
  }
}
function landing(g) {
  const impact = -P.vel.dot(g.n);
  if (P.air > 0.35) {
    landSquash = impact > 12 ? 0.5 : 0.25; if (impact > 12) shake = Math.min(0.5, impact / 40);
    sfx.land(Math.min(1, impact / 25)); buzz(10);
    fxDust(tmp.copy(P.pos).addScaledVector(UP, -HOVER), tmp2.copy(P.vel).multiplyScalar(0.5));
  }
}
function nearMiss() { P.flow = Math.min(1, P.flow + 0.04); dashPunch = Math.max(dashPunch, 0.35); sfx.whoosh(); }
function buzz(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }
