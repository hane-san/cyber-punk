// ---------------------------------------------------------------- map: a stylised Tokyo
// Metres. +x is east, +z is south, and the origin is the palace. District, river and road positions follow the
// real city, rounded and simplified: rings and radials around the palace, the Sumida flowing south into the bay,
// the high Yamanote plateau in the west and the flat Shitamachi lowland in the east.
const WORLD = { x0: -11000, x1: 12000, z0: -9000, z1: 9000 };
const WATER_Y = -1.0;
const CELL = 80; // pitch of the local street grid
const EXP_H = 15; // expressway deck height above the land

// kind: how a district builds. grid 0 = no streets, 1 = 80 m blocks, 2 = 160 m blocks.
const KINDS = {
  tower:  { grid: 2, towerP: 0.5, h: [14, 40], th: [80, 240], neon: 0.3, lot: 28, ground: 'nibi' },
  neon:   { grid: 1, towerP: 0.05, h: [12, 40], th: [48, 96], neon: 1.0, lot: 15, ground: 'nibi' },
  shita:  { grid: 1, towerP: 0, h: [6, 10], neon: 0.14, lot: 11, wood: true, ground: 'tsuchi' },
  temple: { grid: 1, towerP: 0, h: [6, 10], neon: 0.08, lot: 12, wood: true, shrine: 0.1, ground: 'suna' },
  resi:   { grid: 1, towerP: 0.012, h: [9, 26], th: [40, 70], neon: 0.22, lot: 18, ground: 'tsuchi' },
  port:   { grid: 2, towerP: 0, h: [10, 20], neon: 0.04, lot: 44, port: true, ground: 'nibi' },
  park:   { grid: 0, trees: 1, ground: 'moegi' },
  palace: { grid: 0, trees: 0.5, ground: 'suna' },
};
const KIND_KEYS = Object.keys(KINDS);

// title / sub: the cartouche shown on arrival, in the manner of a print series title
const DISTRICTS = [
  { name: '千代田の御城', sub: '石垣と堀、白い天守', x: 0, z: -80, r: 820, kind: 'palace' },
  { name: '丸の内', sub: '硝子の楼閣', x: 1250, z: 150, r: 600, kind: 'tower' },
  { name: '日本橋', sub: 'お江戸日本橋 七つ立ち', x: 2050, z: -250, r: 380, kind: 'neon' },
  { name: '銀座', sub: '煉瓦と電飾の大通り', x: 1850, z: 1450, r: 560, kind: 'neon' },
  { name: '新橋', sub: '高架下の赤提灯', x: 1100, z: 2500, r: 430, kind: 'neon' },
  { name: '秋葉原', sub: '電気街、看板の森', x: 2000, z: -1800, r: 480, kind: 'neon' },
  { name: '上野の山', sub: '桜と五重塔', x: 2050, z: -3750, r: 560, kind: 'park' },
  { name: '谷中', sub: '寺町の坂', x: 1000, z: -3700, r: 650, kind: 'temple' },
  { name: '浅草', sub: '雷門と仲見世', x: 4500, z: -3450, r: 620, kind: 'temple' },
  { name: '押上', sub: '天の塔の膝元', x: 5700, z: -2400, r: 650, kind: 'shita' },
  { name: '両国', sub: '大川端の家並み', x: 4400, z: -700, r: 600, kind: 'shita' },
  { name: '深川', sub: '掘割の町', x: 4600, z: 1500, r: 850, kind: 'shita' },
  { name: '神楽坂', sub: '石畳の花街', x: -1800, z: -1700, r: 480, kind: 'temple' },
  { name: '新宿', sub: '電脳摩天楼', x: -4900, z: -450, r: 1050, kind: 'tower' },
  { name: '歌舞伎町', sub: '眠らぬ電飾', x: -4350, z: -1350, r: 430, kind: 'neon' },
  { name: '新宿御苑', sub: '芝と池の庭', x: -3350, z: 300, r: 360, kind: 'park' },
  { name: '神宮の杜', sub: '大鳥居と千本鳥居', x: -4900, z: 1000, r: 620, kind: 'park' },
  { name: '渋谷', sub: '谷底の交差点', x: -4600, z: 3000, r: 620, kind: 'neon' },
  { name: '池袋', sub: '北の繁華', x: -3800, z: -4900, r: 680, kind: 'neon' },
  { name: '六本木', sub: '丘の上の塔群', x: -2100, z: 2400, r: 600, kind: 'tower' },
  { name: '芝', sub: '赤い電波塔', x: -700, z: 3050, r: 480, kind: 'temple' },
  { name: '品川', sub: '南の玄関', x: -1300, z: 6100, r: 620, kind: 'tower' },
  { name: '湾岸', sub: '倉庫と起重機', x: 3800, z: 5000, r: 1100, kind: 'port' },
  { name: '台場', sub: '海上の観覧車', x: 2100, z: 6300, r: 700, kind: 'port' },
];
const BASE_W = 0.33; // weight of the plain residential town everywhere

// ---- district field, sampled once on a 40 m grid
const DG = 40, DNX = Math.ceil((WORLD.x1 - WORLD.x0) / DG) + 1, DNZ = Math.ceil((WORLD.z1 - WORLD.z0) / DG) + 1;
const distIdx = new Int8Array(DNX * DNZ), distW = new Float32Array(DNX * DNZ);
(() => {
  for (let iz = 0; iz < DNZ; iz++) for (let ix = 0; ix < DNX; ix++) {
    const x = WORLD.x0 + ix * DG, z = WORLD.z0 + iz * DG;
    // a little warp so district edges are not perfect circles
    const wx = x + (vnoise(x / 700, z / 700, 31) - 0.5) * 360, wz = z + (vnoise(x / 700, z / 700, 32) - 0.5) * 360;
    let best = -1, bw = BASE_W;
    for (let i = 0; i < DISTRICTS.length; i++) {
      const d = DISTRICTS[i], dx = wx - d.x, dz = wz - d.z, w = Math.exp(-(dx * dx + dz * dz) / (d.r * d.r));
      if (w > bw) { bw = w; best = i; }
    }
    distIdx[iz * DNX + ix] = best; distW[iz * DNX + ix] = bw;
  }
})();
function distAt(x, z) {
  const ix = clamp(Math.round((x - WORLD.x0) / DG), 0, DNX - 1), iz = clamp(Math.round((z - WORLD.z0) / DG), 0, DNZ - 1), k = iz * DNX + ix;
  return distIdx[k];
}
function distWAt(x, z) {
  const ix = clamp(Math.round((x - WORLD.x0) / DG), 0, DNX - 1), iz = clamp(Math.round((z - WORLD.z0) / DG), 0, DNZ - 1);
  return distW[iz * DNX + ix];
}
const kindAt = (x, z) => { const i = distAt(x, z); return i < 0 ? 'resi' : DISTRICTS[i].kind; };

// ---- paths: roads, expressways and rivers as polylines with arc length
const PATHS = [];
const PGRID = new Map(), PG = 200;
const pgKey = (ix, iz) => (ix + 200) * 1000 + (iz + 200);
class Path {
  constructor(name, kind, pts, half, opt = {}) {
    this.name = name; this.kind = kind; this.half = half; this.closed = !!opt.closed; Object.assign(this, opt);
    this.x = new Float32Array(pts.length); this.z = new Float32Array(pts.length); this.cum = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i++) { this.x[i] = pts[i][0]; this.z[i] = pts[i][1]; if (i) this.cum[i] = this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); }
    this.n = pts.length; this.len = this.cum[this.n - 1];
    this.id = PATHS.length; PATHS.push(this);
    const m = half + 30;
    for (let i = 0; i < this.n - 1; i++) {
      const x0 = Math.min(this.x[i], this.x[i + 1]) - m, x1 = Math.max(this.x[i], this.x[i + 1]) + m;
      const z0 = Math.min(this.z[i], this.z[i + 1]) - m, z1 = Math.max(this.z[i], this.z[i + 1]) + m;
      for (let ix = Math.floor(x0 / PG); ix <= Math.floor(x1 / PG); ix++) for (let iz = Math.floor(z0 / PG); iz <= Math.floor(z1 / PG); iz++) {
        const k = pgKey(ix, iz); let a = PGRID.get(k); if (!a) PGRID.set(k, a = []); a.push(this.id, i);
      }
    }
  }
  // position and tangent at arc length s
  at(s, out) {
    s = clamp(s, 0, this.len); let lo = 0, hi = this.n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.cum[m] <= s) lo = m; else hi = m; }
    const L = this.cum[hi] - this.cum[lo] || 1, u = (s - this.cum[lo]) / L;
    out.x = lerp(this.x[lo], this.x[hi], u); out.z = lerp(this.z[lo], this.z[hi], u);
    out.tx = (this.x[hi] - this.x[lo]) / L; out.tz = (this.z[hi] - this.z[lo]) / L; out.i = lo; out.u = u;
    return out;
  }
}
// nearest point on paths of one kind (or a set of kinds), searched through the 200 m grid
function nearestPath(x, z, kinds) {
  const a = PGRID.get(pgKey(Math.floor(x / PG), Math.floor(z / PG))); if (!a) return null;
  let best = null, bd = Infinity;
  for (let k = 0; k < a.length; k += 2) {
    const p = PATHS[a[k]]; if (!kinds.includes(p.kind)) continue;
    const i = a[k + 1], ax = p.x[i], az = p.z[i], bx = p.x[i + 1], bz = p.z[i + 1];
    const abx = bx - ax, abz = bz - az, L2 = abx * abx + abz * abz || 1;
    const u = clamp(((x - ax) * abx + (z - az) * abz) / L2, 0, 1), cx = ax + abx * u, cz = az + abz * u;
    const d = Math.hypot(x - cx, z - cz); // centre-line distance
    const rel = d - p.half; // how far outside the edge
    if (rel < bd) {
      bd = rel; const L = Math.sqrt(L2), tx = abx / L, tz = abz / L;
      best = { p, i, u, d, cx, cz, tx, tz, nx: -tz, nz: tx, off: (x - cx) * -tz + (z - cz) * tx, s: p.cum[i] + L * u, half: p.half };
    }
  }
  return best;
}

// Catmull-Rom through control points, resampled every `step` metres
function spline(ctrl, step = 12) {
  const out = [];
  for (let k = 0; k < ctrl.length - 1; k++) {
    const p0 = ctrl[Math.max(0, k - 1)], p1 = ctrl[k], p2 = ctrl[k + 1], p3 = ctrl[Math.min(ctrl.length - 1, k + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(ctrl[ctrl.length - 1].slice());
  return out;
}

// ---- water: the bay, reclaimed islands, rivers and the palace moat
const COAST = [[-12000, 9400], [-3200, 8300], [-1700, 7100], [-700, 5600], [300, 4300], [1300, 3500], [2400, 3650], [3100, 3950], [4800, 4300], [7000, 4900], [9500, 5300], [12500, 5600]];
function coastZ(x) {
  for (let i = 0; i < COAST.length - 1; i++) if (x <= COAST[i + 1][0]) { const a = COAST[i], b = COAST[i + 1]; return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])); }
  return COAST[COAST.length - 1][1];
}
const ISLANDS = [
  { name: '台場', x: 2150, z: 6250, hw: 900, hd: 520, r: 220 },
  { name: '有明', x: 3900, z: 6100, hw: 650, hd: 520, r: 200 },
  { name: '豊洲', x: 3700, z: 4950, hw: 620, hd: 560, r: 200 },
  { name: '晴海', x: 2700, z: 4250, hw: 420, hd: 520, r: 160 },
  { name: '品川埠頭', x: 300, z: 6200, hw: 360, hd: 900, r: 160 },
  { name: '新木場', x: 6200, z: 5600, hw: 900, hd: 450, r: 200 },
];
function islandSD(x, z) { // >0 inside
  let best = -Infinity;
  for (const I of ISLANDS) {
    const qx = Math.abs(x - I.x) - (I.hw - I.r), qz = Math.abs(z - I.z) - (I.hd - I.r);
    const out = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - I.r;
    best = Math.max(best, -out);
  }
  return best;
}
// rivers (kind 'river'); the moat is a closed ring
new Path('隅田川', 'river', spline([[3200, -9400], [3300, -8000], [3600, -6000], [4300, -4600], [5000, -3400], [4720, -2200], [4320, -900], [4020, 500], [3600, 2200], [3300, 3700], [3200, 4300]]), 80);
new Path('荒川', 'river', spline([[8400, -9400], [8800, -7000], [9000, -4000], [9300, 0], [9600, 3600], [9900, 5600]]), 190);
new Path('神田川', 'river', spline([[-8000, -1500], [-5600, -1700], [-3600, -1900], [-1700, -1500], [-400, -1450], [1000, -1550], [2600, -1300], [3600, -1100], [4250, -1000]]), 16);
new Path('日本橋川', 'river', spline([[-500, -1450], [200, -1000], [1000, -500], [1950, 60], [2900, 280], [4000, 560]]), 18);
new Path('目黒川', 'river', spline([[-8800, 2800], [-6800, 3700], [-5200, 4500], [-3600, 5400], [-2300, 6300], [-1500, 7000]]), 14);
{
  const m = []; for (let k = 0; k <= 160; k++) { const a = k / 160 * TAU; m.push([Math.cos(a) * 840, -80 + Math.sin(a) * 760 * (1 + 0.06 * Math.sin(3 * a))]); }
  new Path('御堀', 'river', m, 26, { closed: true });
}
const SITE = { land: 0, sd: 0, river: 0 }, K_RIVER = ['river'], K_EXP = ['exp'], K_ROAD = ['art', 'path'];
// land height (as if no water had cut it) and signed distance to water (>0 on land)
function site(x, z) {
  const bay = coastZ(x) - z, isl = islandSD(x, z);
  let sd = Math.max(bay, isl), rd = Infinity;
  const r = nearestPath(x, z, K_RIVER);
  if (r) { rd = r.d - r.half; sd = Math.min(sd, rd); }
  // the Yamanote plateau in the west, the flat Shitamachi lowland to the east
  const yam = smooth(-300, -2300, x + 700 * Math.sin(z / 2900 + 0.7) + (vnoise(x / 3000, z / 3000, 3) - 0.5) * 900);
  let h = 3 + 19 * yam + (vnoise(x / 520, z / 520, 4) - 0.5) * 5 * yam + (vnoise(x / 1400, z / 1400, 5) - 0.5) * 2.5;
  // river valleys cut the plateau into slopes (坂)
  if (rd < 300) h = lerp(Math.min(h, 4 + yam * 4), h, smooth(0, 300, rd));
  // reclaimed land by the bay is flat
  h = lerp(2.6, h, smooth(0, 900, Math.max(bay, -1e9))); if (isl > 0 && bay < 0) h = 2.6;
  SITE.land = h; SITE.sd = sd; SITE.river = rd;
  return SITE;
}
function terrainH(x, z) {
  const s = site(x, z);
  if (s.sd >= 16) return s.land;
  if (s.sd > 0) return lerp(WATER_Y - 0.4, s.land, smooth(0, 16, s.sd));
  return WATER_Y - 2.2 - Math.min(-s.sd * 0.04, 3);
}
const isWater = (x, z) => site(x, z).sd < 0;

// ---- arterials: rings and radials around the palace, a few named roads, and the expressways over some of them
function ringPts(cx, cz, rx, rz, a2, p2, a3, p3) {
  const out = [], n = Math.ceil(TAU * Math.max(rx, rz) / 12);
  for (let k = 0; k <= n; k++) { const a = k / n * TAU, r = 1 + a2 * Math.sin(2 * a + p2) + a3 * Math.sin(3 * a + p3); out.push([cx + Math.cos(a) * rx * r, cz + Math.sin(a) * rz * r]); }
  return out;
}
function radialPts(th, r0, r1, wob, ph) {
  const out = [];
  for (let r = r0; r <= r1; r += 12) { const a = th + wob * Math.sin(r / 1900 + ph) * smooth(r0, r0 + 1500, r); out.push([Math.cos(a) * r, -80 + Math.sin(a) * r]); }
  return out;
}
// split a polyline wherever it runs over open water for longer than maxRun, and at the edge of the world
function dryRuns(pts, maxRun) {
  const runs = []; let cur = [], wet = [];
  for (const p of pts) {
    const out = p[0] < WORLD.x0 + 400 || p[0] > WORLD.x1 - 400 || p[1] < WORLD.z0 + 400 || p[1] > WORLD.z1 - 400;
    if (out) { if (cur.length > 8) runs.push(cur); cur = []; wet = []; continue; }
    if (site(p[0], p[1]).sd < 0) { wet.push(p); continue; }
    if (wet.length) { if (wet.length * 12 <= maxRun) cur.push(...wet); else { if (cur.length > 8) runs.push(cur); cur = []; } wet = []; }
    cur.push(p);
  }
  if (cur.length > 8) runs.push(cur);
  return runs;
}
const ART_HALF = 19, ART_EXP_HALF = 24, EXP_HALF = 13;
const RINGS = [
  { name: '内堀通り', c: [0, -80], rx: 980, rz: 900, a2: 0.03, p2: 0.4, a3: 0.02, p3: 1.0, half: 12 },
  { name: '外堀通り', c: [0, -80], rx: 1650, rz: 1560, a2: 0.04, p2: 1.1, a3: 0.03, p3: 0.2, half: ART_EXP_HALF, exp: '都心環状線' },
  { name: '明治通り', c: [-200, -150], rx: 4600, rz: 4300, a2: 0.05, p2: 2.0, a3: 0.04, p3: 0.5, half: ART_HALF },
  { name: '山手通り', c: [-300, -200], rx: 6100, rz: 5800, a2: 0.04, p2: 0.7, a3: 0.05, p3: 2.2, half: ART_HALF },
  { name: '環状七号線', c: [-200, -300], rx: 8600, rz: 7400, a2: 0.03, p2: 1.6, a3: 0.04, p3: 0.9, half: 21 },
];
const RADIALS = [
  { name: '新宿通り', th: Math.PI + 0.09, r1: 10800, wob: 0.04, exp: '新宿線' },
  { name: '玉川通り', th: Math.PI - 0.58, r1: 10800, wob: 0.05, exp: '渋谷線' },
  { name: '中山道', th: Math.PI + 0.92, r1: 10800, wob: 0.05, exp: '池袋線' },
  { name: '日光街道', th: -0.67, r1: 11000, wob: 0.05 },
  { name: '京葉道路', th: -0.19, r1: 11000, wob: 0.04 },
  { name: '晴海通り', th: 0.9, r1: 9000, wob: 0.03 },
  { name: '第一京浜', th: 1.78, r1: 10800, wob: 0.05 },
  { name: '本郷通り', th: -1.6, r1: 10500, wob: 0.06 },
  { name: '六本木通り', th: 2.27, r1: 10500, wob: 0.04 },
  { name: '青梅街道', th: Math.PI + 0.32, r1: 10800, wob: 0.05 },
];
const EXPS = [];
function addExp(name, pts, opt) {
  // the deck rides EXP_H above the land, smoothed along the line; the ends that do not join another line come down
  const e = new Path(name, 'exp', pts, EXP_HALF, opt);
  const base = new Float32Array(e.n), deck = new Float32Array(e.n);
  for (let i = 0; i < e.n; i++) { const s = site(e.x[i], e.z[i]); base[i] = Math.max(s.sd < 0 ? WATER_Y + 2 : s.land, WATER_Y + 2); }
  for (let i = 0; i < e.n; i++) {
    let acc = 0, w = 0; for (let k = -12; k <= 12; k++) { const j = clamp(i + k, 0, e.n - 1); acc += base[j]; w++; }
    let dk = acc / w + EXP_H;
    const s = e.cum[i];
    if (e.downStart) dk = lerp(base[i] + 0.3, dk, smooth(0, 340, s));
    if (e.downEnd) dk = lerp(base[i] + 0.3, dk, smooth(e.len, e.len - 340, s));
    deck[i] = dk;
  }
  e.base = base; e.deck = deck; e.ramps = [];
  // ramps: every 900 m a pair, one rising each way, on opposite sides (left-hand traffic: up-ramps on the left)
  for (let s = 520; s < e.len - 620; s += 900) {
    const ok = (ss) => { const q = e.at(ss, {}); return site(q.x, q.z).sd > 30; };
    if (ok(s) && ok(s + 230)) e.ramps.push({ s0: s, L: 230, side: -1, dir: 1 });
    if (ok(s + 450) && ok(s + 680)) e.ramps.push({ s0: s + 450, L: 230, side: 1, dir: -1 });
  }
  EXPS.push(e);
  return e;
}
for (const R of RINGS) {
  const pts = ringPts(R.c[0], R.c[1], R.rx, R.rz, R.a2, R.p2, R.a3, R.p3);
  for (const run of dryRuns(pts, 700)) {
    new Path(R.name, 'art', run, R.half, { closed: run.length === pts.length });
    if (R.exp) addExp(R.exp, run, { closed: true });
  }
}
for (const R of RADIALS) {
  const pts = radialPts(R.th, 1050, R.r1, R.wob, R.th * 3);
  const runs = dryRuns(pts, 520);
  runs.forEach((run, k) => {
    const withExp = R.exp && k === 0;
    new Path(R.name, 'art', run, withExp ? ART_EXP_HALF : ART_HALF);
    if (withExp) {
      // the expressway leaves the ring at 1650 m and comes down after about 8 km
      const sub = run.filter((p) => { const r = Math.hypot(p[0], p[1] + 80); return r >= 1600 && r <= 9200; });
      if (sub.length > 40) addExp(R.exp, sub, { downEnd: true });
    }
  });
}
// named roads: the Ginza main street from Shinbashi through Nihonbashi to Ueno; the river expressway; the bay line
new Path('中央通り', 'art', spline([[900, 3000], [1250, 2500], [1800, 1500], [1980, 500], [1940, 100], [1900, -900], [2000, -1800], [2100, -2700], [2150, -3200]]), ART_HALF);
{
  const p6 = spline([[1640, -420], [2600, -620], [3650, -820], [4080, -1500], [4480, -2300], [4760, -3300], [4150, -4500], [3450, -5800], [3100, -7400], [3000, -8400]]);
  new Path('隅田川沿い', 'art', p6, ART_EXP_HALF); addExp('向島線', p6, { downEnd: true });
  const p1 = spline([[700, 1500], [1100, 2600], [800, 3700], [450, 4700], [300, 5600], [600, 6050], [1300, 6150], [2150, 6150], [3200, 6050], [3900, 5800], [5200, 5700], [6600, 5600], [7600, 5500]]);
  for (const run of dryRuns(p1, 900)) new Path('海岸通り', 'art', run, ART_EXP_HALF);
  addExp('湾岸線', p1, { downEnd: true });
}
// approach paths and the Nakamise
const SANDO = new Path('参道', 'path', spline([[-4650, 1560], [-4700, 1250], [-4800, 950], [-4900, 720]]), 6.5);
const NAKAMISE = new Path('仲見世', 'path', [[4520, -3240], [4520, -3500]], 5);
new Path('上野の園路', 'path', spline([[2150, -3150], [2100, -3500], [1950, -3800], [2050, -4150]]), 6);

// ---- the local street grid: 80 m blocks, wider blocks among towers, narrow alleys in the old town
const jitX = (i) => (hash3(i, 0, 21) - 0.5) * 16, jitZ = (j) => (hash3(j, 0, 22) - 0.5) * 16;
const lineX = (i) => i * CELL + jitX(i), lineZ = (j) => j * CELL + jitZ(j);
function gridAt(x, z) { const k = KINDS[kindAt(x, z)]; return k.grid; }
const EXCLUDE = []; // circles where nothing is built (landmark grounds, plazas)
function excluded(x, z) { for (const e of EXCLUDE) { const dx = x - e.x, dz = z - e.z; if (dx * dx + dz * dz < e.r * e.r) return e; } return null; }
function vPresent(i, z) {
  const x = lineX(i), g = gridAt(x, z);
  if (!g || (g === 2 && (i & 1))) return false;
  if (hash3(i, Math.floor(z / 320), 23) < 0.09) return false;
  if (x < WORLD.x0 + 300 || x > WORLD.x1 - 300) return false;
  return site(x, z).sd > 3;
}
function hPresent(j, x) {
  const z = lineZ(j), g = gridAt(x, z);
  if (!g || (g === 2 && (j & 1))) return false;
  if (hash3(j, Math.floor(x / 320), 24) < 0.09) return false;
  if (z < WORLD.z0 + 300 || z > WORLD.z1 - 300) return false;
  return site(x, z).sd > 3;
}
function lineHalf(odd, x, z) {
  const k = kindAt(x, z);
  if ((k === 'shita' || k === 'temple') && odd) return 3.4;
  if (k === 'tower' || k === 'port') return 10;
  return 7.5;
}
const vHalf = (i, z) => lineHalf(i & 1, lineX(i), z), hHalf = (j, x) => lineHalf(j & 1, x, lineZ(j));
function localNear(x, z) {
  let best = null;
  const i0 = Math.round(x / CELL), j0 = Math.round(z / CELL);
  for (let i = i0 - 1; i <= i0 + 1; i++) {
    if (!vPresent(i, z)) continue; const lx = lineX(i), d = Math.abs(x - lx), hf = vHalf(i, z);
    if (!best || d - hf < best.d - best.half) best = { d, half: hf, cx: lx, cz: z, tx: 0, tz: 1, nx: -1, nz: 0, off: lx - x, kind: 'local' };
  }
  let bestH = null;
  for (let j = j0 - 1; j <= j0 + 1; j++) {
    if (!hPresent(j, x)) continue; const lz = lineZ(j), d = Math.abs(z - lz), hf = hHalf(j, x);
    if (!bestH || d - hf < bestH.d - bestH.half) bestH = { d, half: hf, cx: x, cz: lz, tx: 1, tz: 0, nx: 0, nz: 1, off: z - lz, kind: 'local' };
  }
  return [best, bestH];
}

// ---- expressway decks and ramps
function expDeckAt(q) { // q from nearestPath on an 'exp'
  const p = q.p, i = q.i; return lerp(p.deck[i], p.deck[Math.min(i + 1, p.n - 1)], q.u);
}
function expBaseAt(q) { const p = q.p, i = q.i; return lerp(p.base[i], p.base[Math.min(i + 1, p.n - 1)], q.u); }
// returns the ramp surface height at q, or -Infinity; slope gets the rise per metre along the line
function rampAt(q, out) {
  const p = q.p; let best = -Infinity;
  for (const r of p.ramps) {
    if (q.s < r.s0 || q.s > r.s0 + r.L) continue;
    const lat = q.off * r.side; if (lat < 10.5 || lat > 21.5) continue;
    const f = r.dir > 0 ? (q.s - r.s0) / r.L : (r.s0 + r.L - q.s) / r.L, k = f * f * (3 - 2 * f);
    const b = expBaseAt(q), d = expDeckAt(q), h = lerp(b + 0.2, d, k);
    if (h > best) { best = h; if (out) { out.slope = (d - b) * 6 * f * (1 - f) / r.L * r.dir; out.ramp = r; } }
  }
  return best;
}

// ---- ground under a point. y matters for the decks: below a deck you ride the street, on it the deck.
const GR = { h: 0, n: new V3(0, 1, 0), water: false, surf: 'ground', shelter: false, exp: null, deckY: 0 };
const _ro = { slope: 0, ramp: null };
function ground(x, z, y = Infinity) {
  const s = site(x, z), sd = s.sd, land = s.land;
  let h = sd >= 16 ? land : sd > 0 ? lerp(WATER_Y - 0.4, land, smooth(0, 16, sd)) : WATER_Y - 2.2;
  let water = false, surf = 'ground', nx = 0, nz = 0, flat = false;
  if (h < WATER_Y) { h = WATER_Y; water = true; surf = 'water'; flat = true; }
  // bridges: arterials over water keep the height of the land around them
  if (sd < 18) {
    const a = nearestPath(x, z, K_ROAD);
    if (a && a.d < a.half + 0.5) { const dk = Math.max(land, WATER_Y + 2.8); if (dk > h) { h = dk; water = false; surf = 'bridge'; flat = true; } }
  }
  GR.shelter = false; GR.exp = null;
  const e = nearestPath(x, z, K_EXP);
  if (e && e.d < EXP_HALF + 20) {
    const dk = expDeckAt(e), ao = Math.abs(e.off);
    if (ao <= EXP_HALF) {
      if (y >= dk - 3) { h = dk; surf = 'exp'; water = false; flat = false; const i = e.i, p = e.p, j = Math.min(i + 1, p.n - 1), ds = (p.cum[j] - p.cum[i]) || 1, sl = (p.deck[j] - p.deck[i]) / ds; nx = -sl * e.tx; nz = -sl * e.tz; GR.exp = e; }
      else if (dk - h > 4) GR.shelter = true;
    }
    if (surf !== 'exp' && e.p.ramps.length) {
      _ro.slope = 0; const rh = rampAt(e, _ro);
      if (rh > h + 0.05 && y >= rh - 3) { h = rh; surf = 'ramp'; water = false; flat = false; nx = -_ro.slope * e.tx; nz = -_ro.slope * e.tz; GR.exp = e; }
    }
    GR.deckY = dk;
  }
  if (surf === 'ground') {
    // terrain normal from the height field
    const d = 2, hx = terrainH(x + d, z) - terrainH(x - d, z), hz = terrainH(x, z + d) - terrainH(x, z - d);
    nx = -hx / (2 * d); nz = -hz / (2 * d);
  }
  if (flat) { nx = 0; nz = 0; }
  GR.h = h; GR.n.set(nx, 1, nz).normalize(); GR.water = water; GR.surf = surf;
  return GR;
}

// the road you are on or nearest to, preferring one that runs the way you are heading
function roadNear(x, z, y, yaw) {
  const hx = Math.sin(yaw), hz = Math.cos(yaw), cands = [];
  const e = nearestPath(x, z, ['exp']);
  if (e && Math.abs(e.off) < EXP_HALF + 4 && Math.abs(y - expDeckAt(e)) < 4) cands.push({ ...e, half: EXP_HALF, kind: 'exp' });
  else {
    const a = nearestPath(x, z, ['art', 'path']); if (a) cands.push({ ...a, kind: a.p.kind });
    const [v, hh] = localNear(x, z); if (v) cands.push(v); if (hh) cands.push(hh);
  }
  let best = null, bs = Infinity;
  for (const c of cands) {
    const al = Math.abs(c.tx * hx + c.tz * hz), sc = Math.max(0, c.d - c.half) + c.d * 0.15 + 28 * (1 - al);
    if (sc < bs) { bs = sc; best = c; }
  }
  return best;
}

// ---- landmarks and plazas (the builders live in city.js)
const LANDMARKS = [
  { key: 'tenshu', name: '天守', x: 0, z: -230, r: 120 },
  { key: 'denpa', name: '電波塔', x: -700, z: 2950, r: 80 },
  { key: 'ten', name: '天の塔', x: 5350, z: -2650, r: 90 },
  { key: 'kaminari', name: '雷門', x: 4520, z: -3230, r: 30 },
  { key: 'sensoji', name: '浅草寺', x: 4520, z: -3600, r: 120 },
  { key: 'torii', name: '大鳥居', x: -4650, z: 1560, r: 40 },
  { key: 'wheel', name: '大観覧車', x: 2600, z: 6450, r: 90 },
  { key: 'scramble', name: '交差点', x: -4600, z: 3000, r: 70 },
  { key: 'uenoto', name: '五重塔', x: 1900, z: -3900, r: 40 },
  { key: 'nihonbashi', name: '日本橋', x: 1950, z: 60, r: 26 },
];
for (const L of LANDMARKS) if (L.key !== 'nihonbashi') EXCLUDE.push(L);
EXCLUDE.push({ x: 4520, z: -3370, r: 34 }); // the Nakamise lane itself is built by its own builder

// world edge: a soft wall of mist
function inWorld(x, z, m = 0) { return x > WORLD.x0 + m && x < WORLD.x1 - m && z > WORLD.z0 + m && z < WORLD.z1 - m; }
