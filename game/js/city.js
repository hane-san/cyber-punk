// ---------------------------------------------------------------- city: colliders, streamed chunks, towers and landmarks
// Streets, low buildings and props are built in 320 m chunks around the rider. Towers and landmarks are built once
// for the whole map, so the skyline is always there, sinking into mist with distance.

// ---- colliders: oriented boxes in an 80 m hash. c/s rotate local x (along the box) into the world.
// { x, z, hw, hd, c, s, top, bottom, noHop }
const COLS = new Map(), CK = 80;
const ckey = (ix, iz) => (ix + 1000) * 4096 + (iz + 1000);
function addCol(list, x, z, hw, hd, top, bottom, rot = 0, noHop = false) {
  const c = { x, z, hw, hd, c: Math.cos(rot), s: Math.sin(rot), top, bottom, noHop };
  const r = Math.max(hw, hd);
  for (let ix = Math.floor((x - r) / CK); ix <= Math.floor((x + r) / CK); ix++) for (let iz = Math.floor((z - r) / CK); iz <= Math.floor((z + r) / CK); iz++) {
    const k = ckey(ix, iz); let a = COLS.get(k); if (!a) COLS.set(k, a = []); a.push(c); if (list) list.push(k, c);
  }
  return c;
}
function dropCols(list) { for (let i = 0; i < list.length; i += 2) { const a = COLS.get(list[i]); if (!a) continue; const j = a.indexOf(list[i + 1]); if (j >= 0) a.splice(j, 1); } }
const _near = []; let _stamp = 0;
function colNear(x, z) {
  _near.length = 0; _stamp++; const ix = Math.floor(x / CK), iz = Math.floor(z / CK);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const L = COLS.get(ckey(ix + a, iz + b)); if (L) for (const c of L) if (c._s !== _stamp) { c._s = _stamp; _near.push(c); } }
  return _near;
}
const ARTK = ['art', 'path', 'exp'];
function inCorridor(x, z, pad) { const a = nearestPath(x, z, ARTK); if (!a) return false; return a.d < a.half + pad + (a.p.kind === 'exp' ? 9 : 0); }

// ---- small builders shared by chunks and landmarks
function colorJit(hexv, R, k = 0.08) { const c = new THREE.Color(hexv); const f = 1 + (R() - 0.5) * k * 2; c.r = clamp(c.r * f, 0, 1); c.g = clamp(c.g * f, 0, 1); c.b = clamp(c.b * f, 0, 1); return c.getHex(); }
function pine(B, x, y, z, R, s = 1) {
  const lean = (R() - 0.5) * 1.6 * s, top = [x + lean, y + 5.5 * s, z + (R() - 0.5) * s];
  B.beam([x, y - 0.5, z], top, 0.28 * s, COL.kogecha);
  const n = 2 + (R() * 2 | 0);
  for (let k = 0; k < n; k++) {
    const r = (3.4 - k * 0.7) * s * (0.8 + R() * 0.4), ox = (R() - 0.5) * 2.4 * s, oz = (R() - 0.5) * 2.4 * s;
    const yy = y + (3.6 + k * 1.6) * s;
    B.cyl(top[0] + ox, yy, top[2] + oz, r, r * 0.75, 0.9 * s, 7, colorJit(COL.matsu, R, 0.1));
  }
}
function roundTree(B, x, y, z, R, col, s = 1) {
  B.beam([x, y - 0.5, z], [x, y + 3 * s, z], 0.22 * s, COL.kogecha);
  const r = (2.6 + R() * 1.2) * s;
  B.frustum(x, y + 2.4 * s, z, r * 0.6, r * 0.6, r, r, r * 0.7, R() * 3, colorJit(col, R, 0.08));
  B.frustum(x, y + 2.4 * s + r * 0.7, z, r, r, r * 0.35, r * 0.35, r * 0.75, R() * 3, colorJit(col, R, 0.08));
}
function torii(B, x, y, z, rot, s, col = COL.shu) {
  const co = Math.cos(rot), si = Math.sin(rot), P = (lx, lz) => [x + lx * co + lz * si, z - lx * si + lz * co];
  for (const sd of [-1, 1]) { const p = P(sd * 2.2 * s, 0); B.cyl(p[0], y, p[1], 0.32 * s, 0.26 * s, 5.4 * s, 8, col); }
  const kas = P(0, 0);
  B.frustum(kas[0], y + 5.4 * s, kas[1], 3.4 * s, 0.32 * s, 3.9 * s, 0.4 * s, 0.55 * s, rot, COL.sumi);  // kasagi
  B.box(kas[0], y + 4.4 * s, kas[1], 3.0 * s, 0.4 * s, 0.22 * s, rot, col);                              // nuki
}
function pagoda(B, x, y, z, tiers, base, step, rot, wall, roof) {
  let hw = base, yy = y;
  B.box(x, yy - 1, z, hw + 1.5, 2.2, hw + 1.5, rot, COL.ginnezumi);
  yy += 1.2;
  for (let k = 0; k < tiers; k++) {
    const h = step * (k ? 0.82 : 1.1);
    B.box(x, yy, z, hw, h, hw, rot, wall, 2);
    B.frustum(x, yy + h, z, hw + 2.6, hw + 2.6, hw * 0.75, hw * 0.75, 1.1, rot, roof, 3);
    yy += h + 1.1; hw *= 0.86;
  }
  B.cyl(x, yy, z, 0.35, 0.15, step * 2.2, 6, COL.kin); // the sorin finial
  return yy + step * 2.2;
}

// ---- the kabuki face (大首絵) for giant screens
const kabukiTex = canvasTex(256, 256, (g) => {
  g.fillStyle = '#1d1b20'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#f4eee2'; g.beginPath(); g.ellipse(128, 140, 84, 104, 0, 0, TAU); g.fill();
  g.strokeStyle = '#c0283c'; g.lineCap = 'round';
  g.lineWidth = 10; g.beginPath(); g.moveTo(60, 120); g.quadraticCurveTo(92, 86, 120, 118); g.moveTo(196, 120); g.quadraticCurveTo(164, 86, 136, 118); g.stroke();
  g.lineWidth = 7; g.beginPath(); g.moveTo(52, 170); g.quadraticCurveTo(80, 150, 100, 168); g.moveTo(204, 170); g.quadraticCurveTo(176, 150, 156, 168); g.moveTo(128, 60); g.lineTo(128, 96); g.stroke();
  g.fillStyle = '#1d1b20'; g.beginPath(); g.ellipse(94, 132, 14, 6, -0.3, 0, TAU); g.ellipse(162, 132, 14, 6, 0.3, 0, TAU); g.fill();
  g.lineWidth = 6; g.strokeStyle = '#1d1b20'; g.beginPath(); g.moveTo(62, 100); g.quadraticCurveTo(94, 72, 116, 104); g.moveTo(194, 100); g.quadraticCurveTo(162, 72, 140, 104); g.stroke();
  g.fillStyle = '#c0283c'; g.beginPath(); g.moveTo(104, 206); g.quadraticCurveTo(128, 196, 152, 206); g.quadraticCurveTo(128, 222, 104, 206); g.fill();
  g.fillStyle = '#1d1b20'; g.beginPath(); g.moveTo(40, 60); g.quadraticCurveTo(128, -10, 216, 60); g.lineTo(216, 40); g.quadraticCurveTo(128, -30, 40, 40); g.fill();
  g.strokeStyle = '#3fb3c4'; g.lineWidth = 4; g.strokeRect(6, 6, 244, 244);
});
const signMat = texMat(signTex, { glow: 1, side: THREE.DoubleSide });
const screenMat = texMat(kabukiTex, { glow: 1.2, side: THREE.DoubleSide });
const capeMat = texMat(capeTex, { lit: true, side: THREE.DoubleSide, inner: 0xe0663e });
function signQuad(SB, a, b, h0, h1, k) {
  // a vertical sign between ground points a→b, from h0 to h1, showing atlas cell k
  const u0 = (k % 8) / 8, u1 = u0 + 1 / 8, v1 = 1 - Math.floor(k / 8) / 4, v0 = v1 - 1 / 4;
  SB.quad([a[0], h0, a[1]], [b[0], h0, b[1]], [b[0], h1, b[1]], [a[0], h1, a[1]], 0xffffff, 0, -999, null, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
}

// ---- global towers: decided once per 80 m cell over the whole map
const TOWERS = [], towerCell = new Set();
function cellRect(i, j, pad = 1.5) {
  const x0 = lineX(i), x1 = lineX(i + 1), z0 = lineZ(j), z1 = lineZ(j + 1), xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
  return {
    x0: x0 + (vPresent(i, zm) ? vHalf(i, zm) + pad : 2), x1: x1 - (vPresent(i + 1, zm) ? vHalf(i + 1, zm) + pad : 2),
    z0: z0 + (hPresent(j, xm) ? hHalf(j, xm) + pad : 2), z1: z1 - (hPresent(j + 1, xm) ? hHalf(j + 1, xm) + pad : 2), xm, zm,
  };
}
function rectClear(x0, z0, x1, z1, pad) {
  const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [(x0 + x1) / 2, (z0 + z1) / 2]];
  for (const p of pts) { if (site(p[0], p[1]).sd < 5 || inCorridor(p[0], p[1], pad) || excluded(p[0], p[1])) return false; }
  return true;
}
(() => {
  for (let i = Math.floor(WORLD.x0 / CELL) + 3; i < Math.floor(WORLD.x1 / CELL) - 3; i++) for (let j = Math.floor(WORLD.z0 / CELL) + 3; j < Math.floor(WORLD.z1 / CELL) - 3; j++) {
    const cx = i * CELL + 40, cz = j * CELL + 40, kind = kindAt(cx, cz), K = KINDS[kind];
    if (!K.towerP) continue;
    const w = distWAt(cx, cz), p = K.towerP * smooth(0.34, 0.85, w);
    if (hash3(i, j, 41) >= p) continue;
    const r = cellRect(i, j, 3); if (r.x1 - r.x0 < 22 || r.z1 - r.z0 < 22) continue;
    const R = mulberry(i * 7919 + j * 104729 + 3), sh = 0.72 + R() * 0.25;
    const hw = (r.x1 - r.x0) / 2 * sh, hd = (r.z1 - r.z0) / 2 * sh, x = (r.x0 + r.x1) / 2 + (R() - 0.5) * 4, z = (r.z0 + r.z1) / 2 + (R() - 0.5) * 4;
    if (!rectClear(x - hw, z - hd, x + hw, z + hd, 4)) continue;
    const h = lerp(K.th[0], K.th[1], Math.pow(R(), 1.3)) * (0.55 + 0.45 * w);
    TOWERS.push({ i, j, x, z, hw, hd, h, kind, base: terrainH(x, z) - 0.5, R: R() });
    towerCell.add(i * 100003 + j);
  }
  // the twin-towered city hall of Shinjuku, by hand
  TOWERS.push({ x: -5300, z: -700, hw: 30, hd: 22, h: 243, kind: 'tocho', base: terrainH(-5300, -700) - 0.5, R: 0.5, i: -999, j: -999 });
})();
const TOWER_PAL = [COL.ginnezumi, COL.ainezumi, COL.shironeri, 0x7f8c99, 0x9aa5a8, 0x6c7a8c, 0xb8b3a7];
function buildTower(B, SB, GB, T) {
  const R = mulberry(Math.floor(T.R * 1e9) + 17), col = TOWER_PAL[(R() * TOWER_PAL.length) | 0], win = T.kind === 'neon' ? 7 : 1;
  if (T.kind === 'tocho') {
    B.box(T.x, T.base, T.z, T.hw, 160, T.hd, 0, COL.ginnezumi, 1);
    for (const sd of [-1, 1]) { B.box(T.x + sd * 15, T.base + 160, T.z, 12, 70, 14, 0, COL.ginnezumi, 1); B.frustum(T.x + sd * 15, T.base + 230, T.z, 12, 14, 8, 10, 13, 0.785, COL.ainezumi); }
    addCol(null, T.x, T.z, T.hw, T.hd, T.base + 243, T.base - 4, 0, true);
    return;
  }
  let y = T.base, hw = T.hw, hd = T.hd;
  const tiers = T.h > 120 ? 3 : T.h > 70 ? 2 : 1, rot = 0;
  for (let k = 0; k < tiers; k++) {
    const hk = T.h * (k === 0 ? (tiers === 1 ? 1 : 0.58) : k === 1 ? (tiers === 2 ? 0.42 : 0.27) : 0.15);
    B.box(T.x, y, T.z, hw, hk, hd, rot, colorJit(col, R, 0.05), win, colorJit(COL.nezumi, R));
    y += hk; hw *= 0.78; hd *= 0.78;
  }
  addCol(null, T.x, T.z, T.hw, T.hd, T.base + T.h, T.base - 4, 0, true);
  const crown = R();
  if (crown < 0.17) pagoda(B, T.x, y, T.z, 3 + (R() * 2 | 0), Math.min(hw, hd) * 0.8, 6, 0, COL.shironeri, COL.rokusho);
  else if (crown < 0.32) B.cyl(T.x, y, T.z, 0.6, 0.1, 28 + R() * 30, 5, COL.ginnezumi);
  else if (crown < 0.42) B.frustum(T.x, y, T.z, hw, hd, hw * 0.1, hd * 0.1, Math.min(hw, hd) * 1.4, 0, COL.ainezumi, 0);
  else { B.box(T.x, y, T.z, hw * 0.4, 4, hd * 0.4, 0, COL.nezumi); }
  // neon edges at night, and now and then a giant kabuki screen
  if (R() < 0.35) {
    const nc = [COL.asagi, COL.shu, COL.sakura, COL.kin][(R() * 4) | 0], hh = T.h * 0.55;
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) GB.box(T.x + sx * T.hw, T.base + 4, T.z + sz * T.hd, 0.35, hh, 0.35, 0, nc);
  }
  if (R() < 0.16 && T.h > 70) {
    const side = R() < 0.5 ? 1 : -1, w = Math.min(T.hw * 0.8, 24), y0 = T.base + T.h * 0.25, y1 = y0 + w * 1.1;
    const zf = T.z + side * (T.hd + 0.3);
    SB.screens.quad([T.x - w, y0, zf], [T.x + w, y0, zf], [T.x + w, y1, zf], [T.x - w, y1, zf], 0xffffff, 0, -999, null, side > 0 ? [[0, 0], [1, 0], [1, 1], [0, 1]] : [[1, 0], [0, 0], [0, 1], [1, 1]]);
  }
}
const towerRegions = [];
(() => {
  const RG = 2400, groups = new Map();
  for (const T of TOWERS) { const k = Math.floor(T.x / RG) * 1000 + Math.floor(T.z / RG); let a = groups.get(k); if (!a) groups.set(k, a = []); a.push(T); }
  for (const list of groups.values()) {
    const B = new Builder(), GB = new Builder(), SB = { screens: new Builder() };
    for (const T of list) buildTower(B, SB, GB, T);
    const g = new THREE.Group(); g.add(B.mesh()); if (GB.count) g.add(GB.mesh(glowMat)); if (SB.screens.count) g.add(SB.screens.mesh(screenMat));
    scene.add(g); towerRegions.push(g);
  }
})();

// ---- landmarks, built once
const LM = {};
(() => {
  const B = new Builder(), GB = new Builder(), SB = new Builder(), R = mulberry(99);
  // the castle keep in the palace grounds: stone base, five white tiers under copper-green roofs, gold fish on top
  { const L = LANDMARKS[0], y = terrainH(L.x, L.z);
    B.frustum(L.x, y - 1, L.z, 34, 28, 26, 21, 16, 0, 0x9b9585);
    let hw = 22, hd = 17, yy = y + 15;
    for (let k = 0; k < 5; k++) { const h = 7.5 - k * 0.6; B.box(L.x, yy, L.z, hw, h, hd, 0, COL.shikkui, 2); B.frustum(L.x, yy + h, L.z, hw + 3, hd + 3, hw * 0.8, hd * 0.8, 2.4, 0, COL.rokusho, 3); yy += h + 2.4; hw *= 0.8; hd *= 0.8; }
    B.gable(L.x, yy, L.z, hw, hd, 4, 0, COL.rokusho, 1.2);
    for (const s of [-1, 1]) B.frustum(L.x + s * hw, yy + 3.5, L.z, 0.6, 0.6, 0.2, 0.2, 2.6, 0, COL.kin);
    addCol(null, L.x, L.z, 32, 26, y + 15, y - 4, 0, true); addCol(null, L.x, L.z, 22, 17, yy + 4, y, 0, true);
    for (let k = 0; k < 40; k++) { const a = R() * TAU, r = 120 + R() * 560; const x = Math.cos(a) * r, z = -80 + Math.sin(a) * r * 0.9; if (Math.hypot(x - L.x, z - L.z) < 60) continue; pine(B, x, terrainH(x, z), z, R, 1.4); }
  }
  // the moat wall: a stone slope with a white wall on top, open where the three gate bridges cross
  { const m = PATHS.find((p) => p.name === '御堀'), gates = [0, Math.PI / 2, -Math.PI / 2];
    for (let i = 0; i < m.n - 1; i += 1) {
      const x0 = m.x[i], z0 = m.z[i], x1 = m.x[i + 1], z1 = m.z[i + 1], mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const ang = Math.atan2(mz + 80, mx); if (gates.some((g) => Math.abs(wrapA(ang - g)) < 0.06)) continue;
      const rl = Math.hypot(mx, mz + 80), ux = mx / rl, uz = (mz + 80) / rl, off = m.half + 4;
      const cx = mx - ux * off, cz = mz - uz * off, tx = x1 - x0, tz = z1 - z0, L = Math.hypot(tx, tz), rot = Math.atan2(-tz / L, tx / L);
      const y = terrainH(cx, cz);
      B.frustum(cx, WATER_Y - 2, cz, L / 2 + 0.4, 5, L / 2 + 0.4, 2.2, y - WATER_Y + 5, rot, 0x9b9585);
      B.box(cx, y + 3, cz, L / 2 + 0.4, 2.4, 0.7, rot, COL.shikkui, 0, COL.kawara);
      addCol(null, cx, cz, L / 2 + 0.4, 3, y + 6, WATER_Y - 3, rot, true);
      if (i % 40 === 20) { B.box(cx, y + 3, cz, 6, 6, 6, rot, COL.shikkui, 2); B.hip(cx, y + 9, cz, 6, 6, 4, rot, COL.kawara); }
    }
  }
  // the red radio tower: four legs, vermilion and white bands, two decks
  { const L = LANDMARKS[1], y = terrainH(L.x, L.z), H = 330;
    const legAt = (t, sx, sz) => { const w = lerp(42, 3, Math.pow(t, 0.62)); return [L.x + sx * w, y + t * H, L.z + sz * w]; };
    const legs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    for (let s = 0; s < 22; s++) {
      const t0 = s / 22, t1 = (s + 1) / 22, col = (s & 1) ? COL.shironeri : COL.shu;
      for (let k = 0; k < 4; k++) {
        const a = legs[k], b = legs[(k + 1) % 4];
        B.beam(legAt(t0, ...a), legAt(t1, ...a), 1.1 - t0 * 0.6, col);
        if (s < 20) { B.beam(legAt(t0, ...a), legAt(t1, ...b), 0.35, col); B.beam(legAt(t1, ...a), legAt(t0, ...b), 0.35, col); }
      }
    }
    for (const t of [0.42, 0.68]) { const w = lerp(42, 3, Math.pow(t, 0.62)) + 3; B.box(L.x, y + t * H, L.z, w, 7, w, 0, COL.shironeri, 1); }
    B.cyl(L.x, y + H, L.z, 1.2, 0.3, 40, 6, COL.shu);
    for (const a of legs) addCol(null, L.x + a[0] * 38, L.z + a[1] * 38, 4, 4, y + 40, y - 3, 0, true);
    for (let k = 0; k < 14; k++) { const p = legAt(k / 14, 1, 1); GB.box(p[0], p[1], p[2], 0.6, 0.6, 0.6, 0, COL.tamago); }
  }
  // the sky tower: a tapering white lattice column with two rings
  { const L = LANDMARKS[2], y = terrainH(L.x, L.z), H = 634;
    for (let s = 0; s < 32; s++) { const t0 = s / 32, t1 = (s + 1) / 32, r0 = lerp(34, 5, Math.pow(t0, 0.8)), r1 = lerp(34, 5, Math.pow(t1, 0.8)); B.cyl(L.x, y + t0 * H, L.z, r0, r1, H / 32, 9, (s % 6 === 5) ? 0x8fb0cf : COL.shironeri, s < 30 ? 5 : 0, false); }
    for (const t of [0.55, 0.71]) { const r = lerp(34, 5, Math.pow(t, 0.8)) + 9; B.cyl(L.x, y + t * H, L.z, r, r, 12, 18, COL.ginnezumi, 1); GB.cyl(L.x, y + t * H + 12, L.z, r * 0.7, r * 0.7, 1.2, 18, COL.asagi); }
    B.cyl(L.x, y + H, L.z, 2, 0.3, 30, 6, COL.ginnezumi);
    addCol(null, L.x, L.z, 30, 30, y + 120, y - 3, 0, true);
  }
  // Kaminari-mon: two vermilion posts, a deep roof and the giant red lantern; the temple hall and its pagoda behind
  { const L = LANDMARKS[3], y = terrainH(L.x, L.z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { B.cyl(L.x + sx * 6, y, L.z + sz * 3, 0.55, 0.5, 8, 8, COL.shu); addCol(null, L.x + sx * 6, L.z + sz * 3, 0.7, 0.7, y + 8, y - 2, 0, true); }
    B.box(L.x, y + 8, L.z, 8, 1.2, 4, 0, COL.shu); B.hip(L.x, y + 9.2, L.z, 9, 5, 4.5, 0, COL.kawara, 2.2);
    GB.cyl(L.x, y + 3.2, L.z, 1.9, 1.9, 3.6, 12, COL.beni); B.cyl(L.x, y + 6.8, L.z, 1.4, 1.4, 0.5, 12, COL.sumi); B.cyl(L.x, y + 2.8, L.z, 1.4, 1.4, 0.4, 12, COL.sumi);
    const H = LANDMARKS[4], hy = terrainH(H.x, H.z);
    B.box(H.x, hy, H.z - 20, 22, 3, 16, 0, COL.ginnezumi); B.box(H.x, hy + 3, H.z - 20, 18, 10, 13, 0, COL.shu, 2);
    B.hip(H.x, hy + 13, H.z - 20, 18, 13, 12, 0, COL.kawara, 4);
    addCol(null, H.x, H.z - 20, 22, 16, hy + 13, hy - 2, 0, true);
    pagoda(B, H.x + 50, hy, H.z + 10, 5, 6, 6, 0, COL.shu, COL.kawara); addCol(null, H.x + 50, H.z + 10, 8, 8, hy + 40, hy - 2, 0, true);
    // the Nakamise: two rows of little vermilion shops with lanterns, lit at night
    for (let s = 12; s < 250; s += 9) for (const sx of [-1, 1]) {
      const x = NAKAMISE.x[0] + sx * 9.5, z = NAKAMISE.z[0] - s;
      B.box(x, y, z, 2.8, 3.6, 4.2, 0, COL.shu, 2); B.gable(x, y + 3.6, z, 2.8, 4.2, 1.6, Math.PI / 2, COL.kawara, 0.5);
      GB.cyl(x - sx * 3.4, y + 2.4, z, 0.35, 0.35, 0.7, 8, (s / 9 & 1) ? COL.beni : COL.shu);
      addCol(null, x, z, 2.8, 4.2, y + 5.2, y - 2, 0, true);
    }
  }
  // the great torii of the shrine forest, and a tunnel of a thousand vermilion torii down the approach
  { const L = LANDMARKS[5], y = terrainH(L.x, L.z), s = SANDO;
    const p = s.at(4, {}), rot = Math.atan2(-p.tz, p.tx) + Math.PI / 2;
    torii(B, L.x, y, L.z, Math.atan2(p.tx, p.tz), 6.5, COL.cha);
    for (const sd of [-1, 1]) addCol(null, L.x + sd * 14.3 * Math.cos(Math.atan2(p.tx, p.tz)), L.z - sd * 14.3 * Math.sin(Math.atan2(p.tx, p.tz)), 2.2, 2.2, y + 35, y - 2, 0, true);
    for (let d = 60; d < s.len - 40; d += 5.5) {
      const q = s.at(d, {}), yy = terrainH(q.x, q.z), ry = Math.atan2(q.tx, q.tz);
      torii(B, q.x, yy, q.z, ry, 1.45, COL.shu);
      const co = Math.cos(ry), si = Math.sin(ry);
      for (const sd of [-1, 1]) addCol(null, q.x + sd * 3.2 * co, q.z - sd * 3.2 * si, 0.62, 0.62, yy + 8, yy - 2, 0, true);
    }
    void rot;
    for (let k = 0; k < 130; k++) { const a = R() * TAU, r = 60 + R() * 560, x = -4900 + Math.cos(a) * r, z = 1000 + Math.sin(a) * r; const q = nearestPath(x, z, ['path']); if (q && q.d < 14) continue; if (inCorridor(x, z, 4)) continue; if (R() < 0.6) roundTree(B, x, terrainH(x, z), z, R, 0x45603c, 1.5); else pine(B, x, terrainH(x, z), z, R, 1.3); }
  }
  // Ueno: the five-storey pagoda and cherry trees on the hill
  { const L = LANDMARKS[8], y = terrainH(L.x, L.z);
    pagoda(B, L.x, y, L.z, 5, 5.5, 5.5, 0.2, COL.shu, COL.kawara); addCol(null, L.x, L.z, 7, 7, y + 36, y - 2, 0, true);
    for (let k = 0; k < 120; k++) { const a = R() * TAU, r = 40 + R() * 520, x = 2050 + Math.cos(a) * r, z = -3750 + Math.sin(a) * r; const q = nearestPath(x, z, ['path', 'art']); if (q && q.d < q.half + 6) continue; roundTree(B, x, terrainH(x, z), z, R, R() < 0.7 ? COL.sakura : 0x4f6a42, 1.2); }
  }
  // the scramble crossing: four giant kabuki screens look down on the plaza
  { const L = LANDMARKS[7];
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + 0.785, x = L.x + Math.cos(a) * 92, z = L.z + Math.sin(a) * 92, y = terrainH(x, z), rot = -a + Math.PI / 2;
      B.box(x, y, z, 14, 46, 14, rot, COL.sumi, 7); addCol(null, x, z, 14, 14, y + 46, y - 3, rot, true);
      const fx = -Math.cos(a), fz = -Math.sin(a), sx = -fz, sz = fx, cx = x + fx * 14.3, cz = z + fz * 14.3;
      SB.quad([cx - sx * 12, y + 20, cz - sz * 12], [cx + sx * 12, y + 20, cz + sz * 12], [cx + sx * 12, y + 44, cz + sz * 12], [cx - sx * 12, y + 44, cz - sz * 12], 0xffffff, 0, -999, null, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    }
  }
  // Nihonbashi: bronze lamp posts and kirin on the old stone bridge
  { const L = LANDMARKS[9], y = Math.max(terrainH(L.x, L.z), site(L.x, L.z).land);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = L.x + sx * 16, z = L.z + sz * 14; B.cyl(x, y, z, 0.6, 0.4, 7, 8, 0x4f6a5a); GB.cyl(x, y + 7, z, 0.9, 0.9, 1.4, 8, COL.tamago); }
  }
  scene.add(B.mesh()); scene.add(GB.mesh(glowMat)); scene.add(SB.mesh(screenMat));
  // the great wheel on the bay, turning slowly
  { const L = LANDMARKS[6], y = terrainH(L.x, L.z), W = new Builder(), WG = new Builder(), r = 52;
    for (let k = 0; k < 36; k++) { const a0 = k / 36 * TAU, a1 = (k + 1) / 36 * TAU; W.beam([Math.cos(a0) * r, Math.sin(a0) * r, 0], [Math.cos(a1) * r, Math.sin(a1) * r, 0], 0.8, COL.shironeri); if (k % 2 === 0) W.beam([0, 0, 0], [Math.cos(a0) * r, Math.sin(a0) * r, 0], 0.3, COL.ginnezumi); WG.box(Math.cos(a0) * r, Math.sin(a0) * r - 3, 0, 1.6, 2.6, 1.6, 0, [COL.asagi, COL.sakura, COL.kin, COL.shu][k % 4]); }
    const wheel = new THREE.Group(), spin = new THREE.Group(); spin.add(W.mesh()); spin.add(WG.mesh(glowMat)); wheel.add(spin); wheel.position.set(L.x, y + r + 8, L.z); wheel.rotation.y = 0.5;
    scene.add(wheel); LM.wheel = spin;
    const S2 = new Builder(); S2.beam([L.x - 18, y, L.z], [L.x, y + r + 8, L.z], 1.4, COL.ginnezumi); S2.beam([L.x + 18, y, L.z], [L.x, y + r + 8, L.z], 1.4, COL.ginnezumi); scene.add(S2.mesh());
    addCol(null, L.x, L.z, 20, 3, y + r + 8, y - 2, 0.5, true);
  }
})();

// ---- streamed chunks
const CH = 320, CH_R = LOWQ ? 2 : 3;
const chunks = new Map();
let buildQueue = [];
const chKey = (cx, cz) => cx * 10007 + cz;
function updateChunks(force, px, pz) {
  const ccx = Math.floor(px / CH), ccz = Math.floor(pz / CH), want = new Set();
  for (let a = -CH_R; a <= CH_R; a++) for (let b = -CH_R; b <= CH_R; b++) { if (a * a + b * b > CH_R * CH_R + 1) continue; want.add(chKey(ccx + a, ccz + b)); }
  for (const [k, c] of chunks) if (!want.has(k)) { scene.remove(c.group); c.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); dropCols(c.cols); chunks.delete(k); }
  buildQueue = [];
  for (let a = -CH_R; a <= CH_R; a++) for (let b = -CH_R; b <= CH_R; b++) {
    const k = chKey(ccx + a, ccz + b); if (!want.has(k) || chunks.has(k)) continue; buildQueue.push([ccx + a, ccz + b, a * a + b * b]);
  }
  buildQueue.sort((p, q) => p[2] - q[2]);
  const n = force ? buildQueue.length : 1;
  for (let i = 0; i < n && buildQueue.length; i++) { const [cx, cz] = buildQueue.shift(); buildChunk(cx, cz); }
}

function buildChunk(cx, cz) {
  const x0 = cx * CH, z0 = cz * CH, cols = [], R = mulberry((cx * 73856093) ^ (cz * 19349663));
  const B = new Builder(), GB = new Builder(), SB = new Builder(), wires = [];
  // ground: a 40 × 40 height field coloured by district
  { const N = 32, st = CH / N, hs = [], cs = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = x0 + i * st, z = z0 + j * st, s = site(x, z), h = terrainH(x, z); hs.push(h);
      let c;
      if (s.sd < 0) c = 0x2a4060; else if (s.sd < 16) c = 0x8e8a80;
      else { const k = KINDS[kindAt(x, z)]; c = COL[k.ground] || COL.tsuchi; if (k.ground === 'nibi') c = 0x76746e; }
      const n = vnoise(x / 60, z / 60, 8); const cc = new THREE.Color(c).multiplyScalar(0.94 + n * 0.1); cs.push(cc.getHex());
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * (N + 1) + i, P = (a, b) => [x0 + (i + a) * st, hs[k + b * (N + 1) + a], z0 + (j + b) * st];
      const hint = [x0 + (i + 0.5) * st, -1e4, z0 + (j + 0.5) * st];
      B.tri(P(0, 0), P(1, 0), P(1, 1), cs[k], 0, -999, hint); B.tri(P(0, 0), P(1, 1), P(0, 1), cs[k], 0, -999, hint);
    }
  }
  const yOn = (x, z) => ground(x, z, -1e9).h;
  // local streets
  const strip = (ax, az, bx, bz, half, col, lift) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 10)), tx = (bx - ax) / L, tz = (bz - az) / L, nx = -tz * half, nz = tx * half;
    for (let k = 0; k < n; k++) {
      const u0 = k / n, u1 = (k + 1) / n, px0 = lerp(ax, bx, u0), pz0 = lerp(az, bz, u0), px1 = lerp(ax, bx, u1), pz1 = lerp(az, bz, u1);
      if (terrainH((px0 + px1) / 2, (pz0 + pz1) / 2) < WATER_Y) continue;
      const a = [px0 + nx, terrainH(px0 + nx, pz0 + nz) + lift, pz0 + nz], b = [px1 + nx, terrainH(px1 + nx, pz1 + nz) + lift, pz1 + nz];
      const c = [px1 - nx, terrainH(px1 - nx, pz1 - nz) + lift, pz1 - nz], d = [px0 - nx, terrainH(px0 - nx, pz0 - nz) + lift, pz0 - nz];
      B.quad(a, b, c, d, col, 0, -999, [(px0 + px1) / 2, -1e4, (pz0 + pz1) / 2]);
    }
  };
  const i0 = Math.floor(x0 / CELL) - 1, i1 = Math.floor((x0 + CH) / CELL) + 1, j0 = Math.floor(z0 / CELL) - 1, j1 = Math.floor((z0 + CH) / CELL) + 1;
  const streetCol = (x, z) => { const k = kindAt(x, z); return k === 'shita' || k === 'temple' ? 0xbcae8e : 0x969186; };
  for (let i = i0; i <= i1; i++) {
    const lx = lineX(i); if (lx < x0 || lx >= x0 + CH) continue;
    for (let j = j0; j <= j1; j++) {
      const za = Math.max(lineZ(j), z0), zb = Math.min(lineZ(j + 1), z0 + CH); if (zb <= za) continue;
      const zm = (za + zb) / 2; if (!vPresent(i, zm)) continue;
      strip(lx, za, lx, zb, vHalf(i, zm), streetCol(lx, zm), 0.07);
    }
  }
  for (let j = j0; j <= j1; j++) {
    const lz = lineZ(j); if (lz < z0 || lz >= z0 + CH) continue;
    for (let i = i0; i <= i1; i++) {
      const xa = Math.max(lineX(i), x0), xb = Math.min(lineX(i + 1), x0 + CH); if (xb <= xa) continue;
      const xm = (xa + xb) / 2; if (!hPresent(j, xm)) continue;
      strip(xa, lz, xb, lz, hHalf(j, xm), streetCol(xm, lz), 0.08);
    }
  }
  // arterials, paths and expressways whose segments start in this chunk
  const segs = new Set();
  for (let gx = Math.floor(x0 / PG); gx <= Math.floor((x0 + CH) / PG); gx++) for (let gz = Math.floor(z0 / PG); gz <= Math.floor((z0 + CH) / PG); gz++) {
    const a = PGRID.get(pgKey(gx, gz)); if (!a) continue;
    for (let k = 0; k < a.length; k += 2) { const p = PATHS[a[k]], i = a[k + 1]; if (p.kind === 'river') continue; if (p.x[i] >= x0 && p.x[i] < x0 + CH && p.z[i] >= z0 && p.z[i] < z0 + CH) segs.add(a[k] * 100000 + i); }
  }
  for (const key of segs) {
    const p = PATHS[Math.floor(key / 100000)], i = key % 100000;
    const ax = p.x[i], az = p.z[i], bx = p.x[i + 1], bz = p.z[i + 1], L = Math.hypot(bx - ax, bz - az) || 1, tx = (bx - ax) / L, tz = (bz - az) / L, nx = -tz, nz = tx;
    if (p.kind === 'exp') { buildExpSeg(B, GB, cols, p, i, ax, az, bx, bz, tx, tz, nx, nz, L); continue; }
    const h = p.kind === 'path' ? p.half : p.half - (p.half === ART_EXP_HALF ? 0 : 0);
    const col = p.kind === 'path' ? 0xc9bb98 : 0x86827a, hint = [(ax + bx) / 2, -1e4, (az + bz) / 2];
    const ya = yOn(ax, az), yb = yOn(bx, bz), wet = site((ax + bx) / 2, (az + bz) / 2).sd < 2;
    const e = (x, z, sd, y) => [x + nx * h * sd, y + 0.12, z + nz * h * sd];
    const yl = (x, z, sd) => wet ? (sd ? yOn(x + nx * h * sd * 0.98, z + nz * h * sd * 0.98) : 0) : terrainH(x + nx * h * sd, z + nz * h * sd);
    B.quad(e(ax, az, 1, wet ? ya : yl(ax, az, 1)), e(bx, bz, 1, wet ? yb : yl(bx, bz, 1)), e(bx, bz, -1, wet ? yb : yl(bx, bz, -1)), e(ax, az, -1, wet ? ya : yl(ax, az, -1)), col, 0, -999, hint);
    if (p.kind === 'art' && (i % 2 === 0)) { // centre line
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, my = (ya + yb) / 2 + 0.16;
      B.quad([mx - tx * 2.5 + nx * 0.2, my, mz - tz * 2.5 + nz * 0.2], [mx + tx * 2.5 + nx * 0.2, my, mz + tz * 2.5 + nz * 0.2], [mx + tx * 2.5 - nx * 0.2, my, mz + tz * 2.5 - nz * 0.2], [mx - tx * 2.5 - nx * 0.2, my, mz - tz * 2.5 - nz * 0.2], 0xe2c25a, 0, -999, [mx, -1e4, mz]);
    }
    if (wet) { // a bridge: girder, vermilion rails and wooden piers into the water
      for (const sd of [-1, 1]) {
        const a = [ax + nx * h * sd, ya, az + nz * h * sd], b = [bx + nx * h * sd, yb, bz + nz * h * sd];
        B.quad([a[0], a[1] - 1.6, a[2]], [b[0], b[1] - 1.6, b[2]], [b[0], b[1] + 0.1, b[2]], [a[0], a[1] + 0.1, a[2]], COL.kogecha, 0, -999, [(ax + bx) / 2, ya, (az + bz) / 2]);
        B.beam([a[0], a[1] + 1.1, a[2]], [b[0], b[1] + 1.1, b[2]], 0.16, COL.shu);
        if (i % 2 === 0) { B.cyl(a[0], a[1], a[2], 0.22, 0.2, 1.3, 6, COL.shu); B.cyl(a[0], a[1] + 1.3, a[2], 0.3, 0.05, 0.6, 6, COL.kin); }
      }
      if (i % 2 === 0) for (const sd of [-0.7, -0.25, 0.25, 0.7]) { const x = ax + nx * h * sd, z = az + nz * h * sd; B.cyl(x, WATER_Y - 3, z, 0.45, 0.45, ya - WATER_Y + 1.4, 6, COL.kogecha, 0, false); }
    }
  }
  // blocks: low buildings, houses, warehouses, parks
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const cxm = (lineX(i) + lineX(i + 1)) / 2, czm = (lineZ(j) + lineZ(j + 1)) / 2;
    if (cxm < x0 || cxm >= x0 + CH || czm < z0 || czm >= z0 + CH) continue;
    if (towerCell.has(i * 100003 + j)) continue;
    buildBlock(B, GB, SB, cols, wires, i, j, R);
  }
  const group = new THREE.Group();
  group.add(B.mesh()); if (GB.count) group.add(GB.mesh(glowMat)); if (SB.count) group.add(SB.mesh(signMat));
  if (wires.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3)); const l = new THREE.LineSegments(g, wireMat); group.add(l); }
  scene.add(group);
  chunks.set(chKey(cx, cz), { group, cols });
}
const wireMat = new THREE.LineBasicMaterial({ color: COL.sumi });

function buildExpSeg(B, GB, cols, p, i, ax, az, bx, bz, tx, tz, nx, nz, L) {
  const da = p.deck[i], db = p.deck[i + 1], h = EXP_HALF, hint = [(ax + bx) / 2, (da + db) / 2 - 0.8, (az + bz) / 2];
  const E = (x, z, sd, y, dy = 0) => [x + nx * h * sd, y + dy, z + nz * h * sd];
  B.quad(E(ax, az, 1, da), E(bx, bz, 1, db), E(bx, bz, -1, db), E(ax, az, -1, da), 0x8a867e, 0, -999, hint);
  B.quad(E(ax, az, 1, da, -1.7), E(bx, bz, 1, db, -1.7), E(bx, bz, -1, db, -1.7), E(ax, az, -1, da, -1.7), 0x9b998f, 0, -999, hint);
  for (const sd of [-1, 1]) {
    B.quad(E(ax, az, sd, da, -1.7), E(bx, bz, sd, db, -1.7), E(bx, bz, sd, db), E(ax, az, sd, da), 0xc9c5b8, 0, -999, hint);
    // vermilion parapets, open where a ramp runs alongside
    const s = p.cum[i];
    const open = p.ramps.some((r) => r.side === sd && s > r.s0 - 6 && s < r.s0 + r.L + 6);
    if (!open) {
      const a = E(ax, az, sd * 0.98, da), b = E(bx, bz, sd * 0.98, db);
      B.quad([a[0], a[1], a[2]], [b[0], b[1], b[2]], [b[0], b[1] + 1.1, b[2]], [a[0], a[1] + 1.1, a[2]], COL.shu, 0, -999, [hint[0], da + 0.5, hint[2]]);
      if (i % 2 === 0) { B.cyl(a[0], a[1], a[2], 0.28, 0.24, 1.35, 6, COL.shu); B.cyl(a[0], a[1] + 1.35, a[2], 0.34, 0.04, 0.7, 6, COL.kin); }
    }
  }
  // pillars every third sample (about 36 m) with a cap beam
  if (i % 3 === 0) {
    const y0 = terrainH(ax, az), top = da - 1.7;
    if (top - y0 > 3) {
      B.box(ax, y0 - 0.5, az, 1.3, top - y0 - 0.4, 1.3, Math.atan2(-tz, tx), COL.ginnezumi);
      B.box(ax, top - 1.3, az, 1.4, 1.3, h * 0.8, Math.atan2(-tz, tx), COL.ginnezumi);
      addCol(cols, ax, az, 1.4, 1.4, top - 1, y0 - 3, Math.atan2(-tz, tx), true);
    }
  }
  if (i % 4 === 0) { const sd = (i / 4) % 2 ? 1 : -1, q = E(ax, az, sd * 0.93, da); B.cyl(q[0], q[1], q[2], 0.12, 0.12, 5.5, 5, COL.sumi); GB.box(q[0], q[1] + 5.5, q[2], 0.45, 0.8, 0.45, 0, COL.tamago); }
  // ramps beside this segment
  for (const r of p.ramps) {
    const s0 = p.cum[i], s1 = p.cum[i + 1]; if (s1 < r.s0 || s0 > r.s0 + r.L) continue;
    const qa = { p, i, u: 0, s: Math.max(s0, r.s0), off: r.side * 14 }, qb = { p, i, u: 1, s: Math.min(s1, r.s0 + r.L), off: r.side * 14 };
    qa.u = (qa.s - s0) / (s1 - s0 || 1); qb.u = (qb.s - s0) / (s1 - s0 || 1);
    const ya = rampAt(qa), yb = rampAt(qb); if (!isFinite(ya) || !isFinite(yb)) continue;
    const pa = [lerp(ax, bx, qa.u), lerp(az, bz, qa.u)], pb = [lerp(ax, bx, qb.u), lerp(az, bz, qb.u)];
    const R0 = (pt, lat, y, dy = 0) => [pt[0] + nx * lat * r.side, y + dy, pt[1] + nz * lat * r.side], rh = [(pa[0] + pb[0]) / 2 + nx * 14 * r.side, (ya + yb) / 2 - 0.6, (pa[1] + pb[1]) / 2 + nz * 14 * r.side];
    B.quad(R0(pa, 9, ya), R0(pb, 9, yb), R0(pb, 19, yb), R0(pa, 19, ya), 0x6e7076, 0, -999, rh);
    B.quad(R0(pa, 19, ya, -1.2), R0(pb, 19, yb, -1.2), R0(pb, 19, yb), R0(pa, 19, ya), 0xc9c5b8, 0, -999, rh);
    B.quad(R0(pa, 19, ya), R0(pb, 19, yb), R0(pb, 19, yb, 0.9), R0(pa, 19, ya, 0.9), COL.shu, 0, -999, [rh[0], rh[1] + 1, rh[2]]);
  }
}

// one city block: lots by district kind
const WOOD_PAL = [COL.kogecha, COL.cha, COL.benigara, COL.shikkui, 0x5a4636, 0x3e3430];
const MID_PAL = [0x4a4448, COL.benigara, COL.cha, 0x7b7570, COL.kogecha, 0x5d6a73, 0x8a7e6c];
const RESI_PAL = [COL.shironeri, 0xd9d0bd, 0xc4bca8, 0xb5b9b4, 0xd8c9b0, 0xa8b0b4];
const PORT_PAL = [COL.benigara, COL.ai, COL.nezumi, 0x6f7f6a, 0x8f7a5a];
function buildBlock(B, GB, SB, cols, wires, i, j, R) {
  const r = cellRect(i, j), kind = kindAt(r.xm, r.zm), K = KINDS[kind];
  if (r.x1 - r.x0 < 6 || r.z1 - r.z0 < 6) return;
  if (!K.grid) { // park or palace: trees, and nothing to crash into but trunks
    if (kind === 'park' && !excluded(r.xm, r.zm)) for (let k = 0; k < 6; k++) {
      const x = lerp(r.x0, r.x1, R()), z = lerp(r.z0, r.z1, R()); if (site(x, z).sd < 6 || inCorridor(x, z, 5)) continue;
      const y = terrainH(x, z);
      if (R() < 0.5) pine(B, x, y, z, R, 1.2); else roundTree(B, x, y, z, R, R() < 0.3 ? COL.sakura : 0x506b40, 1.1);
      addCol(cols, x, z, 0.7, 0.7, y + 5, y - 2, 0, true);
    }
    return;
  }
  const W = r.x1 - r.x0, D = r.z1 - r.z0, nx = Math.max(1, Math.round(W / (K.lot * (0.85 + R() * 0.3)))), nz = Math.max(1, Math.round(D / (K.lot * (0.85 + R() * 0.3))));
  const gap = K.wood ? 0.5 : 1.6, wB = Math.max(0.2, W / nx), dB = Math.max(0.2, D / nz);
  // which sides face a street
  const westSt = vPresent(i, r.zm), eastSt = vPresent(i + 1, r.zm), northSt = hPresent(j, r.xm), southSt = hPresent(j + 1, r.xm);
  for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
    const lx0 = r.x0 + a * wB + gap / 2, lx1 = r.x0 + (a + 1) * wB - gap / 2, lz0 = r.z0 + b * dB + gap / 2, lz1 = r.z0 + (b + 1) * dB - gap / 2;
    if (lx1 - lx0 < 3 || lz1 - lz0 < 3) continue;
    if (!rectClear(lx0, lz0, lx1, lz1, 2.5)) continue;
    const x = (lx0 + lx1) / 2, z = (lz0 + lz1) / 2, hw = (lx1 - lx0) / 2, hd = (lz1 - lz0) / 2, y = Math.min(terrainH(lx0, lz0), terrainH(lx1, lz1), terrainH(lx0, lz1), terrainH(lx1, lz0)) - 0.3;
    // facing: the nearest street side
    let face = null;
    if (a === 0 && westSt) face = [-1, 0]; else if (a === nx - 1 && eastSt) face = [1, 0]; else if (b === 0 && northSt) face = [0, -1]; else if (b === nz - 1 && southSt) face = [0, 1];
    const roll = R();
    if (roll < 0.06 && !K.port) { // an empty lot with a dead car or a vending machine
      if (R() < 0.5) { B.box(x, y + 0.3, z, 2.1, 1.2, 1, R() * 3, colorJit(0x7a6a5a, R)); addCol(cols, x, z, 2.1, 1.1, y + 1.6, y - 1, 0); }
      else { GB.box(x, y, z, 0.6, 1.9, 0.45, 0, R() < 0.5 ? 0xd8eef4 : 0xf2d9a8); }
      continue;
    }
    if (K.shrine && roll < 0.06 + K.shrine * 0.35 && face) { // a small shrine: torii at the street, a hokora behind
      const fx = x + face[0] * hw * 0.8, fz = z + face[1] * hd * 0.8, rot = Math.atan2(face[0], face[1]);
      torii(B, fx, terrainH(fx, fz), fz, rot, 0.8); B.box(x, y, z, 1.4, 1.6, 1.2, rot, COL.kogecha, 2); B.gable(x, y + 1.6, z, 1.4, 1.2, 1, rot, COL.kawara, 0.3);
      if (R() < 0.7) pine(B, x - face[0] * 2, y, z - face[1] * 2, R, 0.9);
      continue;
    }
    let h;
    if (K.wood) {
      const floors = R() < 0.2 ? 3 : R() < 0.7 ? 2 : 1; h = floors * 2.9 + 0.4;
      const col = colorJit(WOOD_PAL[(R() * WOOD_PAL.length) | 0], R, 0.06);
      B.box(x, y, z, hw, h, hd, 0, col, 2);
      const ridgeX = hw > hd; B.gable(x, y + h, z, hw, hd, (ridgeX ? hd : hw) * 0.55, ridgeX ? 0 : Math.PI / 2, colorJit(COL.kawara, R, 0.05), 0.5);
      if (face) { // a lantern by the door, an eave, sometimes noren
        const fx = x + face[0] * (hw + 0.35), fz = z + face[1] * (hd + 0.35);
        GB.cyl(fx + face[1] * hw * 0.5, y + 2.1, fz - face[0] * hd * 0.5, 0.26, 0.26, 0.55, 5, R() < 0.5 ? COL.beni : COL.shu);
        const ex = face[0] ? 0.6 : hw, ez = face[1] ? 0.6 : hd;
        B.frustum(fx + face[0] * 0.3, y + 2.6, fz + face[1] * 0.3, ex, ez, ex, ez, 0.2, 0, COL.kawara);
        if (R() < 0.4 && K.neon > 0.1) { const sx = fx + face[1] * hw * 0.8, sz = fz - face[0] * hd * 0.8, k = (R() * 32) | 0; signQuad(SB, [sx, sz], [sx + face[0] * 1.2, sz + face[1] * 1.2], y + 2.2, y + h - 0.2, k); }
      }
    } else if (K.port) {
      h = lerp(K.h[0], K.h[1], R());
      if (R() < 0.3) { // a container yard
        const C = [COL.shu, COL.ai, COL.moegi, COL.kin, COL.benigara, COL.nezumi];
        for (let cx2 = lx0 + 3; cx2 < lx1 - 3; cx2 += 6.5) for (let cz2 = lz0 + 2; cz2 < lz1 - 2; cz2 += 2.8) { const st = 1 + (R() * 3 | 0); for (let s = 0; s < st; s++) B.box(cx2, y + s * 2.6, cz2, 3, 2.5, 1.2, 0, C[(R() * C.length) | 0], 5); }
        addCol(cols, x, z, hw, hd, y + 8, y - 2, 0, true);
        if (R() < 0.5) { const cx3 = x + hw * 0.6, cz3 = z; B.beam([cx3 - 6, y, cz3], [cx3 - 6, y + 34, cz3], 0.7, COL.shu); B.beam([cx3 + 6, y, cz3], [cx3 + 6, y + 34, cz3], 0.7, COL.shu); B.beam([cx3 - 6, y + 34, cz3], [cx3 + 6, y + 34, cz3], 0.7, COL.shironeri); B.beam([cx3, y + 34, cz3], [cx3 - 30, y + 30, cz3], 0.6, COL.shironeri); }
        continue;
      }
      B.box(x, y, z, hw, h, hd, 0, colorJit(PORT_PAL[(R() * PORT_PAL.length) | 0], R), 5);
      B.gable(x, y + h, z, hw, hd, Math.min(hw, hd) * 0.18, hw > hd ? 0 : Math.PI / 2, COL.ginnezumi, 0.3);
    } else {
      const tall = R() < 0.12 && K.th;
      h = tall ? lerp(K.th[0] * 0.6, K.th[0], R()) : lerp(K.h[0], K.h[1], Math.pow(R(), 1.6)) * (0.6 + 0.4 * distWAt(x, z));
      const pal = kind === 'resi' ? RESI_PAL : MID_PAL, col = colorJit(pal[(R() * pal.length) | 0], R);
      const win = kind === 'neon' ? 7 : kind === 'resi' ? (R() < 0.6 ? 4 : 1) : (R() < 0.5 ? 7 : 1);
      B.box(x, y, z, hw, h, hd, 0, col, win, colorJit(COL.nezumi, R));
      // roof clutter: a water tank, units, or a billboard frame
      const rr = R();
      if (rr < 0.3) B.cyl(x + (R() - 0.5) * hw, y + h, z + (R() - 0.5) * hd, 1.3, 1.3, 2.4, 8, COL.ginnezumi);
      else if (rr < 0.55) for (let k = 0; k < 3; k++) B.box(x + (R() - 0.5) * hw * 1.4, y + h, z + (R() - 0.5) * hd * 1.4, 0.8, 0.9, 0.6, 0, COL.ginnezumi);
      if (face && R() < K.neon && h > 7) { // vertical signs at the corner, out over the street
        const n = 1 + (R() < K.neon * 0.6 ? 1 : 0);
        for (let s = 0; s < n; s++) {
          const along = s === 0 ? 0.85 : -0.85, sx = x + face[0] * (hw + 0.1) + face[1] * hw * along, sz = z + face[1] * (hd + 0.1) - face[0] * hd * along;
          const top = Math.min(y + h - 0.5, y + 3 + 3 + R() * 9), k = (R() * 32) | 0;
          signQuad(SB, [sx, sz], [sx + face[0] * 1.5, sz + face[1] * 1.5], y + 3.2, top, k);
        }
        if (R() < K.neon * 0.7) { // a glowing band across the front
          const nc = [COL.asagi, COL.shu, COL.sakura, COL.kin, 0x7cf0b0][(R() * 5) | 0], by = y + 3.6 + R() * Math.max(0, h - 6);
          GB.box(x + face[0] * (hw + 0.15), by, z + face[1] * (hd + 0.15), face[0] ? 0.12 : hw * 0.8, 0.35, face[1] ? 0.12 : hd * 0.8, 0, nc);
        }
      }
    }
    addCol(cols, x, z, hw, hd, y + h + 0.3, y - 3, 0, h > 3.5);
  }
  // power poles and sagging wires along the west and north streets of the block, and paper lanterns over old-town lanes
  if (kind !== 'tower' && kind !== 'port') {
    const poles = [];
    if (westSt) { const px = lineX(i) + vHalf(i, r.zm) + 0.6; for (let z = r.z0 + 6; z < r.z1; z += 30) poles.push([px, z]); }
    if (northSt) { const pz = lineZ(j) + hHalf(j, r.xm) + 0.6; for (let x = r.x0 + 6; x < r.x1; x += 30) poles.push([x, pz]); }
    for (let k = 0; k < poles.length; k++) {
      const [px, pz] = poles[k], py = terrainH(px, pz); if (inCorridor(px, pz, 1)) continue;
      B.cyl(px, py, pz, 0.16, 0.13, 9, 5, COL.sumi, 0, false); B.box(px, py + 8.2, pz, 0.9, 0.12, 0.12, 0, COL.sumi);
      const q = poles[k + 1]; if (!q || Math.hypot(q[0] - px, q[1] - pz) > 34) continue;
      const qy = terrainH(q[0], q[1]);
      for (const [o, hh] of [[-0.8, 8.3], [0.8, 8.3], [0, 7.4]]) {
        let prev = null;
        for (let s = 0; s <= 6; s++) {
          const u = s / 6, wx = lerp(px, q[0], u) + (q[1] === pz ? 0 : o), wz = lerp(pz, q[1], u) + (q[1] === pz ? o : 0), wy = lerp(py, qy, u) + hh - Math.sin(u * Math.PI) * 0.7;
          if (prev) wires.push(prev[0], prev[1], prev[2], wx, wy, wz); prev = [wx, wy, wz];
        }
      }
    }
    if (K.wood && northSt && (j & 1) === 0) { // a line of lanterns strung across the lane
      const lz = lineZ(j), hf = hHalf(j, r.xm);
      for (let x = r.x0 + 8; x < r.x1 - 4; x += 16) {
        const y = terrainH(x, lz) + 4.6; wires.push(x, y + 0.6, lz - hf, x, y + 0.6, lz + hf);
        for (let s = -2; s <= 2; s++) GB.cyl(x, y - 0.3 + Math.abs(s) * 0.12, lz + s * hf * 0.35, 0.24, 0.24, 0.5, 5, (s & 1) ? COL.shu : COL.beni);
      }
    }
  }
}
