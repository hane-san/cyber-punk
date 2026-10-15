// ---------------------------------------------------------------- yokai: the other world over Tokyo
// Particles, the flying formations (noh masks that fire hitodama, paper cranes and fox-fire processions that only
// pass), and the masked figures that stand in the road with a naginata.

// ---- particles: two point systems (ink-like and light-like) drawing from one atlas, one draw call each
const ATLAS_CELLS = ['ink', 'wave', 'petal', 'maple', 'cloud', 'spark', 'dot', 'soul', 'tama', 'tamaB'];
// the rounds: a vermilion (or indigo) bead with a white heart and a dark rim, so they read against a pale sky
function tamaTex(core, rim) { return canvasTex(128, 128, (g) => { g.fillStyle = rim; g.beginPath(); g.arc(64, 64, 46, 0, TAU); g.fill(); g.fillStyle = core; g.beginPath(); g.arc(64, 64, 40, 0, TAU); g.fill(); const r = g.createRadialGradient(58, 58, 2, 64, 64, 30); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.6, 'rgba(255,250,240,0.85)'); r.addColorStop(1, 'rgba(255,250,240,0)'); g.fillStyle = r; g.beginPath(); g.arc(64, 64, 30, 0, TAU); g.fill(); }); }
FX.tama = tamaTex('#d9472b', '#3a1418'); FX.tamaB = tamaTex('#5a4fa0', '#1c1838');
const fxAtlas = canvasTex(1280, 128, (g) => { ATLAS_CELLS.forEach((k, i) => { g.drawImage(FX[k].image, i * 128, 0, 128, 128); }); });
const CELL_OF = Object.fromEntries(ATLAS_CELLS.map((k, i) => [k, i]));
function makeFxSystem(max, additive) {
  const geo = new THREE.BufferGeometry();
  const A = { position: 3, aSize: 1, aRot: 1, aAlpha: 1, aCell: 1, aTint: 3 };
  for (const k in A) geo.setAttribute(k, new THREE.BufferAttribute(new Float32Array(max * A[k]), A[k]).setUsage(THREE.DynamicDrawUsage));
  geo.setDrawRange(0, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: fxAtlas }, uScale: { value: 400 }, uMist: U.uMist, uFog: U.uFog },
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: `attribute float aSize; attribute float aRot; attribute float aAlpha; attribute float aCell; attribute vec3 aTint;
varying float vRot; varying float vAlpha; varying float vCell; varying vec3 vTint; varying float vD; uniform float uScale;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.5), 0.0, 900.0); vRot = aRot; vAlpha = aAlpha; vCell = aCell; vTint = aTint; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uMap; uniform vec3 uMist; uniform vec2 uFog; varying float vRot; varying float vAlpha; varying float vCell; varying vec3 vTint; varying float vD;
void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) discard;
  vec4 t = texture2D(uMap, vec2((vCell + p.x) / 10.0, 1.0 - p.y)); t.rgb *= vTint;
  float m = smoothstep(uFog.x, uFog.y, vD);
  ${additive ? 'gl_FragColor = vec4(t.rgb * t.a * vAlpha * (1.0 - m), 1.0);' : 'if (t.a * vAlpha < 0.02) discard; gl_FragColor = vec4(mix(t.rgb, uMist, m * 0.8), t.a * vAlpha);'} }`,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
  return { geo, mat, max, list: [], pts };
}
const FXN = makeFxSystem(1800, false), FXA = makeFxSystem(1200, true);
function fxAdd(sys, cell, pos, vel, life, s0, s1, opt = {}) {
  if (sys.list.length >= sys.max) sys.list.shift();
  const p = { cell: CELL_OF[cell], p: pos.clone(), v: vel ? vel.clone() : new V3(), life, age: 0, s0, s1, rot: opt.rot ?? Math.random() * TAU, rv: opt.rv ?? 0, a0: opt.a ?? 1, grav: opt.grav ?? 0, drag: opt.drag ?? 0, tint: opt.tint || [1, 1, 1], fadeIn: opt.fadeIn || 0, sway: opt.sway || 0 };
  sys.list.push(p); return p;
}
function fxUpdate(sys, dt) {
  const L = sys.list; let w = 0;
  const P3 = sys.geo.attributes.position.array, SZ = sys.geo.attributes.aSize.array, RT = sys.geo.attributes.aRot.array, AL = sys.geo.attributes.aAlpha.array, CE = sys.geo.attributes.aCell.array, TI = sys.geo.attributes.aTint.array;
  for (let i = 0; i < L.length; i++) {
    const q = L[i]; q.age += dt; if (q.age >= q.life) continue;
    q.v.y -= q.grav * dt; if (q.drag) q.v.multiplyScalar(Math.exp(-q.drag * dt));
    if (q.sway) { q.v.x += Math.sin(q.age * 3 + i) * q.sway * dt; q.v.z += Math.cos(q.age * 2.3 + i) * q.sway * dt; }
    q.p.addScaledVector(q.v, dt); q.rot += q.rv * dt;
    const u = q.age / q.life;
    L[w++] = q;
    const k = w - 1;
    P3[k * 3] = q.p.x; P3[k * 3 + 1] = q.p.y; P3[k * 3 + 2] = q.p.z; SZ[k] = lerp(q.s0, q.s1, u); RT[k] = q.rot;
    AL[k] = q.a0 * (1 - smooth(0.6, 1, u)) * (q.fadeIn ? smooth(0, q.fadeIn, u) : 1); CE[k] = q.cell; TI[k * 3] = q.tint[0]; TI[k * 3 + 1] = q.tint[1]; TI[k * 3 + 2] = q.tint[2];
  }
  L.length = w;
  sys.geo.setDrawRange(0, w);
  for (const k of ['position', 'aSize', 'aRot', 'aAlpha', 'aCell', 'aTint']) sys.geo.attributes[k].needsUpdate = true;
  sys.mat.uniforms.uScale.value = innerHeight * PR * 0.5 / Math.tan(camera.fov * Math.PI / 360);
}
const _v = new V3();
function fxDust(pos, vel) { fxAdd(FXN, 'cloud', pos, _v.copy(vel).add(new V3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3)), 0.7, 0.6, 2.2, { a: 0.75, drag: 2, tint: [1, 0.97, 0.9] }); }
function fxSparks(pos, nx, nz, n) { for (let k = 0; k < n; k++) fxAdd(FXA, 'spark', pos, new V3(nx * 6 + (Math.random() - 0.5) * 12, Math.random() * 6, nz * 6 + (Math.random() - 0.5) * 12).addScaledVector(P.vel, 0.6), 0.35 + Math.random() * 0.3, 0.5, 0.1, { grav: 18 }); }
function fxInk(pos, n, spread = 6) { for (let k = 0; k < n; k++) fxAdd(FXN, 'ink', pos, new V3((Math.random() - 0.5) * spread * 2, Math.random() * spread, (Math.random() - 0.5) * spread * 2), 0.8 + Math.random() * 0.5, 0.8 + Math.random() * 1.5, 2.5 + Math.random() * 2, { grav: 12, drag: 1.5 }); }
function fxSplash(pos) { for (let k = 0; k < 6; k++) fxAdd(FXN, 'wave', pos, new V3((Math.random() - 0.5) * 8, 4 + Math.random() * 4, (Math.random() - 0.5) * 8).addScaledVector(P.vel, 0.4), 0.6, 1.2, 2.6, { grav: 14, rv: (Math.random() - 0.5) * 3 }); }

// ---- the flying formations
const ukiyoDS = new THREE.ShaderMaterial({ uniforms: U, vertexShader: ukiyoVS, fragmentShader: ukiyoFS, side: THREE.DoubleSide });
const maskGeo = (() => {
  const g = new THREE.SphereGeometry(1, 16, 12, 0, Math.PI, 0, Math.PI); g.rotateY(-Math.PI / 2); g.scale(0.85, 1.1, 0.42);
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 0.85 * 0.5 + 0.5, p.getY(i) / 1.1 * 0.5 + 0.5);
  g.setAttribute('aCol', new THREE.Float32BufferAttribute(new Float32Array(p.count * 3).fill(1), 3));
  return g;
})();
const maskMats = maskTex.map((t) => texMat(t, { side: THREE.DoubleSide }));
const haloGeo = (() => { const B = new Builder(); for (let k = 0; k < 16; k++) { const a0 = k / 16 * TAU, a1 = (k + 1) / 16 * TAU; B.beam([Math.cos(a0) * 1.3, Math.sin(a0) * 1.3, -0.3], [Math.cos(a1) * 1.3, Math.sin(a1) * 1.3, -0.3], 0.05, COL.shu); if (k % 4 === 0) B.box(Math.cos(a0) * 1.3, Math.sin(a0) * 1.3 - 0.12, -0.3, 0.14, 0.24, 0.14, 0, COL.kin); } return B.geometry(); })();
const noseGeo = new THREE.ConeGeometry(0.2, 1.0, 8).rotateX(Math.PI / 2).translate(0, -0.05, 0.85);
const noseMat = new THREE.MeshBasicMaterial({ color: COL.shu });
const hornGeo = new THREE.ConeGeometry(0.1, 0.6, 6).translate(0, 0.3, 0);
const hornMat = new THREE.MeshBasicMaterial({ color: COL.kin });
function makeMask(type, s = 1) {
  const g = new THREE.Group(), face = new THREE.Mesh(maskGeo, maskMats[type]); g.add(face);
  if (type === 4) g.add(new THREE.Mesh(noseGeo, noseMat));
  if (type === 1) for (const sd of [-1, 1]) { const h = new THREE.Mesh(hornGeo, hornMat); h.position.set(sd * 0.45, 0.85, 0.05); h.rotation.z = -sd * 0.4; g.add(h); }
  const halo = new THREE.Mesh(haloGeo, glowMat); g.add(halo); g.userData.halo = halo;
  g.scale.setScalar(s); return g;
}
const craneGeo = (() => {
  const B = new Builder(), w = 0xf6f1e4;
  B.tri([0, 0, 1.1], [0.18, 0.05, 0], [0, 0.35, 0], w, 0); B.tri([0, 0, 1.1], [-0.18, 0.05, 0], [0, 0.35, 0], w, 0);
  B.tri([0, 0, -1.0], [0.18, 0.05, 0], [0, 0.4, 0], w, 0); B.tri([0, 0, -1.0], [-0.18, 0.05, 0], [0, 0.4, 0], w, 0);
  B.tri([0, 0, 1.1], [0, 0.55, 1.35], [0, 0.3, 1.0], COL.beni, 0);
  return B.geometry();
})();
const wingGeo = (() => { const B = new Builder(); B.tri([0, 0.2, 0.4], [1.5, 0.3, 0], [0, 0.2, -0.5], 0xf6f1e4, 0); return B.geometry(); })();
function makeCrane() {
  const g = new THREE.Group(); g.add(new THREE.Mesh(craneGeo, ukiyoDS));
  const L = new THREE.Mesh(wingGeo, ukiyoDS), R = new THREE.Mesh(wingGeo, ukiyoDS); R.scale.x = -1; g.add(L, R); g.userData.wings = [L, R];
  g.scale.setScalar(2.2); return g;
}
// formations take the names of the old battle arrays (八陣)
const SHAPES = {
  鶴翼: (n) => Array.from({ length: n }, (_, i) => { const k = i - (n - 1) / 2; return [k * 3.2, -Math.abs(k) * 0.4, -Math.abs(k) * 2.2]; }),
  魚鱗: (n) => { const o = []; let row = 0; while (o.length < n) { for (let c = 0; c <= row && o.length < n; c++) o.push([(c - row / 2) * 3.4, -row * 1.4, row * 2.4]); row++; } return o; },
  雁行: (n) => Array.from({ length: n }, (_, i) => [i * 3, -i * 0.6, i * 2.6]),
  長蛇: (n) => Array.from({ length: n }, (_, i) => [Math.sin(i * 0.6) * 4, Math.cos(i * 0.4) * 1.5, i * 3.2]),
  円月: (n) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU; return [Math.cos(a) * 9, Math.sin(a) * 9, 0]; }),
  偃月: (n) => Array.from({ length: n }, (_, i) => { const a = Math.PI * (0.15 + 0.7 * i / Math.max(1, n - 1)); return [Math.cos(a) * 12, Math.sin(a) * 6 - 3, Math.sin(a) * 4]; }),
};
const SHAPE_KEYS = Object.keys(SHAPES);
const forms = [], bullets = [];
let formT = 3, assaultCD = 6, chaseCD = 10, threatOn = store.get('ukiyo.threat', true);
const BULLET_SPD = 56, DRONE_MAX = 64, CLOSE = 60;
function spawnFormation(kind, mode) {
  const n = kind === 'kitsune' ? 14 : kind === 'crane' ? 5 + (Math.random() * 5 | 0) : 6 + (Math.random() * 8 | 0);
  const shape = kind === 'kitsune' ? '長蛇' : SHAPE_KEYS[(Math.random() * SHAPE_KEYS.length) | 0];
  const offs = SHAPES[shape](n), g = new THREE.Group(); scene.add(g);
  const type = (Math.random() * 5) | 0;
  const members = offs.map((o, i) => {
    let obj;
    if (kind === 'mask') obj = makeMask(Math.random() < 0.7 ? type : (Math.random() * 5) | 0, 3.2);
    else if (kind === 'crane') { obj = makeCrane(); obj.scale.setScalar(4); }
    else { obj = new THREE.Group(); obj.userData.fire = true; }
    g.add(obj); return { obj, off: new V3(...o).multiplyScalar(kind === 'kitsune' ? 1.6 : 2.4), ph: Math.random() * TAU, i };
  });
  const f = { kind, mode, shape, g, members, pos: new V3(), vel: new V3(), t: 0, life: 0, fireT: 1.5 + Math.random(), pat: (Math.random() * 6) | 0, dir: new V3(1, 0, 0), done: false };
  const h = Math.hypot(P.vel.x, P.vel.z) > 3 ? new V3(P.vel.x, 0, P.vel.z).normalize() : fwd.clone();
  const sideV = new V3(-h.z, 0, h.x);
  if (mode === 'pass') { // across the sky, high
    const sd = Math.random() < 0.5 ? -1 : 1, ahead = 200 + Math.random() * 400;
    f.pos.copy(P.pos).addScaledVector(h, ahead).addScaledVector(sideV, sd * 650); f.pos.y = P.pos.y + 50 + Math.random() * 70;
    f.vel.copy(sideV).multiplyScalar(-sd * (26 + Math.random() * 14)).addScaledVector(h, 8); f.life = 40;
  } else if (mode === 'chase') {
    f.pos.copy(P.pos).addScaledVector(h, -320); f.pos.y = P.pos.y + 30; f.life = 26;
  } else { // assault: comes up the road from ahead and holds
    f.pos.copy(P.pos).addScaledVector(h, 700); f.pos.y = P.pos.y + 28; f.life = 22; sfx.nohkan();
  }
  forms.push(f); return f;
}
function updateFormations(dt) {
  const speed = Math.hypot(P.vel.x, P.vel.z);
  formT -= dt; assaultCD -= dt; chaseCD -= dt;
  if (formT <= 0 && forms.length < 8) {
    formT = 2.5 + Math.random() * 4;
    spawnFormation(Math.random() < 0.5 ? 'crane' : 'kitsune', 'pass');
  }
  if (threatOn && started && !P.dead) {
    if (assaultCD <= 0 && !forms.some((f) => f.mode === 'assault')) { assaultCD = 8 + Math.random() * 8 - (speed > 50 ? 4 : 0); spawnFormation('mask', 'assault'); }
    // slow riders are hunted from behind
    if (chaseCD <= 0 && !forms.some((f) => f.mode === 'chase')) { chaseCD = speed < 18 ? 6 : 16 + Math.random() * 10; spawnFormation('mask', 'chase'); }
  }
  const h = speed > 3 ? _v.set(P.vel.x, 0, P.vel.z).normalize() : _v.copy(fwd);
  for (const f of forms) {
    f.t += dt;
    if (f.mode === 'pass') f.pos.addScaledVector(f.vel, dt);
    else if (f.mode === 'chase') {
      tmp.copy(P.pos).addScaledVector(h, -60); tmp.y = P.pos.y + 24;
      tmp2.subVectors(tmp, f.pos); const d = tmp2.length(); tmp2.normalize().multiplyScalar(Math.min(DRONE_MAX, d * 1.5));
      f.vel.lerp(tmp2, 1 - Math.exp(-2.0 * dt)); f.pos.addScaledVector(f.vel, dt);
      f.fireT -= dt;
      if (f.fireT <= 0 && f.t < f.life - 2 && f.pos.distanceTo(P.pos) < 280) { f.fireT = 1.2; volley(f); }
    } else {
      const hold = f.t < f.life - 3;
      tmp.copy(P.pos).addScaledVector(h, hold ? 175 : 400); tmp.y = P.pos.y + (hold ? 20 + Math.sin(f.t * 0.8) * 4 : 160);
      tmp.addScaledVector(_v.set(-h.z, 0, h.x), Math.sin(f.t * 0.5) * 18);
      f.pos.lerp(tmp, 1 - Math.exp(-(f.t < 3 ? 0.9 : 2.8) * dt));
      f.fireT -= dt;
      if (hold && f.t > 2.5 && f.fireT <= 0) { f.fireT = 0.9; pattern(f); f.pat = (f.pat + 1 + (Math.random() * 2 | 0)) % PATTERNS.length; }
    }
    if (f.t > f.life || f.pos.distanceTo(P.pos) > 1600) f.done = true;
    // face the rider, lay the members out on the formation's plane
    f.dir.subVectors(P.pos, f.pos).normalize();
    f.g.position.copy(f.pos);
    if (f.mode === 'pass') f.g.lookAt(tmp.copy(f.pos).add(f.vel)); else f.g.lookAt(P.pos);
    for (const m of f.members) {
      const br = Math.sin(f.t * 1.3 + m.ph) * 0.6;
      m.obj.position.set(m.off.x * (1 + 0.05 * br), m.off.y + br, m.off.z);
      if (f.kind === 'crane') { const fl = Math.sin(f.t * 6 + m.ph) * 0.6; m.obj.userData.wings[0].rotation.z = fl; m.obj.userData.wings[1].rotation.z = -fl; }
      if (f.kind === 'mask') { m.obj.userData.halo.rotation.z += dt * (1 + m.i % 3); }
      if (f.kind === 'kitsune' && Math.random() < dt * 8) { m.obj.getWorldPosition(tmp); fxAdd(FXA, 'soul', tmp, new V3(0, 1, 0), 0.9, 2.4, 0.6, { tint: [1, 0.62, 0.3] }); }
    }
  }
  for (let i = forms.length - 1; i >= 0; i--) if (forms[i].done) { scene.remove(forms[i].g); forms.splice(i, 1); }
}
// chase volleys: a ring of rounds round the line to where you are now
function volley(f) {
  const o = f.pos.clone(), d = tmp2.subVectors(P.pos, o).normalize(), sx = new V3(-d.z, 0, d.x).normalize(), sy = new V3().crossVectors(sx, d);
  const n = 18, rot = Math.random() * TAU;
  for (let k = 0; k < n; k++) { const a = rot + k / n * TAU; const v = d.clone().multiplyScalar(BULLET_SPD).addScaledVector(sx, Math.cos(a) * 5).addScaledVector(sy, Math.sin(a) * 2.5); fireBullet(o, v, k & 1); }
  sfx.volley();
}
// assault patterns: geometric figures laid out flat over the road, opening as they come. The rounds keep your pace
// and close at CLOSE m/s, so each figure takes about three seconds to arrive: read it, and slip through.
const PATTERNS = ['花', '五芒', '渦', '格子', '輪', '蓮', '簾', '曼荼羅'];
function pattern(f) {
  const h = _v.set(P.vel.x, 0, P.vel.z), sp = h.length(); if (sp > 1) h.multiplyScalar(1 / sp); else h.copy(fwd);
  const right = new V3(-h.z, 0, h.x), base = new V3(P.vel.x, 0, P.vel.z), origin = f.pos.clone();
  const T = Math.max(1.5, origin.distanceTo(P.pos) / CLOSE), yv = (P.pos.y + 1.0 - origin.y) / T;
  // (x, z): the figure's shape in the road plane, x across, z along; it opens at `open` m/s
  const shot = (x, z, open, delay = 0, alt = 0, lat0 = 0) => {
    const v = base.clone().addScaledVector(h, -CLOSE + z * open).addScaledVector(right, x * open); v.y = yv;
    const p = origin.clone().addScaledVector(right, lat0);
    if (delay) setTimeoutSim(() => fireBullet(p, v, alt), delay); else fireBullet(p, v, alt);
  };
  const rot = Math.random() * TAU, name = PATTERNS[f.pat];
  if (name === '花') { const k = 3 + (Math.random() * 4 | 0); for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, r = Math.abs(Math.cos(k * a / 2)); shot(r * Math.cos(a + rot), r * Math.sin(a + rot), 9); } }
  else if (name === '五芒') { const V = [0, 1, 2, 3, 4].map((i) => [Math.cos(rot + i * TAU * 2 / 5), Math.sin(rot + i * TAU * 2 / 5)]); for (let e = 0; e < 5; e++) for (let t = 0; t < 12; t++) { const A = V[e], B = V[(e + 1) % 5], u = t / 12; shot(lerp(A[0], B[0], u), lerp(A[1], B[1], u), 10, 0, e & 1); } }
  else if (name === '渦') { for (let arm = 0; arm < 5; arm++) for (let k = 0; k < 14; k++) { const a = rot + arm * TAU / 5 + k * 0.32; shot(Math.cos(a), Math.sin(a), 8, k * 0.06, arm & 1); } }
  else if (name === '格子') { for (let row = 0; row < 4; row++) { const g1 = (Math.random() - 0.5) * 30, g2 = g1 + (Math.random() < 0.5 ? 1 : -1) * 12; for (let x = -26; x <= 26; x += 2.6) if (Math.abs(x - g1) > 3.6 && Math.abs(x - g2) > 3.6) shot(0, 0, 0, row * 0.28, row & 1, x); } }
  else if (name === '輪') { for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 32; i++) { const a = rot + ring * 0.1 + i / 32 * TAU; shot(Math.cos(a), Math.sin(a), 7 + ring * 2.5, ring * 0.32, ring & 1); } }
  else if (name === '蓮') { for (let t = 0; t < 2; t++) for (let e = 0; e < 6; e++) for (let u = 0; u < 8; u++) { const a0 = rot + (t ? Math.PI / 6 : 0) + e * TAU / 6, a1 = a0 + TAU / 3, q = u / 8; shot(lerp(Math.cos(a0), Math.cos(a1), q), lerp(Math.sin(a0), Math.sin(a1), q), 9, t * 0.35, t); } }
  else if (name === '簾') { for (const off of [0, 1]) { const gap = (Math.random() - 0.5) * 22; for (let x = -26; x <= 26; x += 2.2) if (Math.abs(x - gap) > 3.8) shot(0, 0, 0, off * 0.6, off, x + off * 1.1); } }
  else { for (let i = 0; i < 48; i++) { const a = rot + i / 48 * TAU; shot(Math.cos(a), Math.sin(a), 8); const b = -rot * 1.3 + i / 48 * TAU, r = 0.55 + 0.45 * Math.abs(Math.sin(4 * b)); shot(r * Math.cos(b), r * Math.sin(b), 11, 0.3, 1); } }
  sfx.volley(); f.lastName = name;
}
const simTimers = [];
function setTimeoutSim(fn, d) { simTimers.push({ t: d, fn }); }
function fireBullet(p, v, alt = 0) {
  const b = { p: p.clone(), v: v.clone(), life: 7, grazed: false, fx: fxAdd(FXN, alt ? 'tamaB' : 'tama', p, v, 7, 1.6, 1.6, { a: 1, rot: 0 }) };
  bullets.push(b);
}
function updateBullets(dt) {
  for (let i = simTimers.length - 1; i >= 0; i--) { simTimers[i].t -= dt; if (simTimers[i].t <= 0) { const f = simTimers[i].fn; simTimers.splice(i, 1); f(); } }
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]; b.life -= dt; b.p.addScaledVector(b.v, dt);
    if (b.fx) { b.fx.p.copy(b.p); b.fx.v.set(0, 0, 0); }
    const d = b.p.distanceTo(P.pos);
    if (d < 1.3 && !P.shelter && P.invuln <= 0 && !P.dead) { hurt('人魂'); b.life = 0; fxSparks(b.p, 0, 0, 10); }
    else if (d < 4.8 && !b.grazed && !P.dead) { b.grazed = true; graze(); }
    if (b.life <= 0 || b.p.y < P.pos.y - 8 || d > 900) { if (b.fx) b.fx.age = b.fx.life; bullets.splice(i, 1); }
  }
}
let grazeChain = 0, grazeT = 0;
function graze() {
  grazeChain = simT - grazeT < 1.2 ? grazeChain + 1 : 0; grazeT = simT;
  P.flow = Math.min(1, P.flow + 0.03); P.grazes++;
  sfx.chime(grazeChain); dashPunch = Math.max(dashPunch, 0.25);
}

// ---- the masked figures in the road (異人): stand, turn to you, wind up, and cut
const IJIN_ROBE = [COL.beni, 0x3a3060, COL.ai, 0x2f4a3a, COL.kin];
function makeIjin(R) {
  const g = new THREE.Group(), B = new Builder(); g.scale.setScalar(1.35);
  const robe = IJIN_ROBE[(R() * IJIN_ROBE.length) | 0];
  B.cyl(0, 0, 0, 1.25, 0.5, 2.5, 8, robe, 0);            // the robe, flaring to the ground
  B.cyl(0, 1.5, 0, 0.62, 0.6, 0.3, 8, COL.kin);           // the sash
  for (const sd of [-1, 1]) B.frustum(sd * 0.95, 1.0, 0, 0.18, 0.55, 0.3, 0.75, 1.3, 0, robe); // the great sleeves
  B.box(0, 2.5, 0, 0.3, 0.3, 0.3, 0, 0xd8b896);
  g.add(B.mesh());
  const head = new THREE.Group(); head.position.set(0, 2.95, 0); g.add(head);
  const type = [1, 0, 4, 3, 2][(R() * 5) | 0], mask = makeMask(type, 0.42); mask.position.z = 0.18; head.add(mask);
  mask.userData.halo.scale.setScalar(1.6); mask.userData.halo.position.z = -0.7;
  // the long mane of the lion dance: white or red, it swings as the figure winds up
  const MB = new Builder(), mane = new THREE.Group(); MB.frustum(0, -2.6, -0.25, 0.12, 0.12, 0.5, 0.42, 2.8, 0, R() < 0.5 ? 0xf6f2e8 : COL.shu); mane.add(MB.mesh()); head.add(mane);
  // the naginata
  const arm = new THREE.Group(); arm.position.set(0.9, 2.0, 0.2); g.add(arm);
  const NB = new Builder(); NB.beam([0, -1.6, 0], [0, 2.2, 0], 0.06, 0x2a1d14); NB.tri([0, 2.2, 0.05], [0.25, 3.4, 0], [-0.08, 2.2, -0.05], 0xf4f6ff, 0, -999, null);
  NB.tri([0, 2.2, -0.05], [0.25, 3.4, 0], [-0.08, 2.2, 0.05], 0xf4f6ff, 0, -999, null);
  arm.add(NB.mesh(ukiyoDS)); arm.rotation.z = 0.35;
  // the tell: a vermilion brush ring that closes on the figure, and the stance's sumi mark around it
  const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.ring, transparent: true, depthWrite: false, depthTest: false }));
  ring.visible = false; ring.renderOrder = 5; g.add(ring); ring.position.y = 2.2;
  const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.ens, transparent: true, depthWrite: false, depthTest: false, opacity: 0.85 }));
  mark.visible = false; mark.renderOrder = 4; g.add(mark); mark.position.y = 2.2;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COL.sumi, transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.position.y = 0.08; g.add(shadow);
  return { g, head, mane, arm, ring, mark, mask, type };
}
const WINDUP = 0.95, WINDOW = 0.34, PERFECT = 0.16, ATK_R = 10.5, ATK_COOL = 1.6;
const ijins = [];
let ijinDist = 180;
function spawnIjin() {
  const speed = Math.hypot(P.vel.x, P.vel.z); if (speed < 8) return;
  const h = _v.set(P.vel.x, 0, P.vel.z).normalize();
  const ahead = 230 + Math.random() * 90, px = P.pos.x + h.x * ahead, pz = P.pos.z + h.z * ahead;
  const r = roadNear(px, pz, P.pos.y, Math.atan2(h.x, h.z)); if (!r) return;
  const lat = (Math.random() - 0.5) * Math.max(0, r.half * 2 - 6);
  const x = r.cx + r.nx * lat, z = r.cz + r.nz * lat, gr = ground(x, z, P.pos.y + 2);
  if (gr.water || Math.abs(gr.h - P.pos.y) > 20) return;
  for (const c of colNear(x, z)) { const dx = x - c.x, dz = z - c.z, lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c; if (Math.abs(lx) < c.hw + 2 && Math.abs(lz) < c.hd + 2 && c.top > gr.h + 1) return; }
  placeIjin(x, z, gr.h);
}
function placeIjin(x, z, y) {
  const R = mulberry((Math.random() * 1e9) | 0), m = makeIjin(R);
  m.g.position.set(x, y, z); scene.add(m.g);
  const e = { ...m, pos: new V3(x, y, z), state: 'idle', t: 0, wind: 0, cool: 0, alive: true, deadT: 0, face: Math.random() * TAU, locked: false };
  ijins.push(e); return e;
}
function updateIjins(dt) {
  if (threatOn && started && !P.dead) { ijinDist -= Math.hypot(P.vel.x, P.vel.z) * dt; if (ijinDist <= 0 && ijins.filter((e) => e.alive).length < 8) { ijinDist = 120 + Math.random() * 180; spawnIjin(); } }
  for (const e of ijins) {
    e.t += dt;
    if (!e.alive) {
      e.deadT += dt;
      continue;
    }
    const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz), dy = P.pos.y - (e.pos.y + HOVER);
    const vx = P.vel.x, vz = P.vel.z, closing = -(dx * vx + dz * vz) / Math.max(d, 0.01);
    if (d < 140) e.face = lerp(e.face, e.face + wrapA(Math.atan2(dx, dz) - e.face), 1 - Math.exp(-4 * dt));
    e.g.rotation.y = e.face;
    e.cool = Math.max(0, e.cool - dt);
    if (e.state === 'idle') {
      // the figure reads your approach: when you will reach it within one wind-up, it begins
      const T = d / Math.max(closing, 1);
      if (e.cool <= 0 && closing > 4 && d < 150 && Math.abs(dy) < 7 && T < WINDUP + 0.08) { e.state = 'windup'; e.wind = WINDUP; sfx.yoo(); }
      e.mane.rotation.x = Math.sin(e.t * 1.4) * 0.1; e.arm.rotation.x = lerp(e.arm.rotation.x, 0, 1 - Math.exp(-4 * dt));
    } else if (e.state === 'windup') {
      e.wind -= dt; const u = 1 - e.wind / WINDUP;
      // the head swings the mane round (毛振り), the blade rises overhead
      e.mane.rotation.x = Math.sin(e.t * (6 + u * 18)) * (0.3 + u * 1.2); e.arm.rotation.x = lerp(0, -2.2, smooth(0, 0.8, u));
      if (e.wind <= WINDOW && !e.ponged) { e.ponged = true; sfx.pon(); }
      if (e.wind <= 0) attackIjin(e, d, dy);
    } else if (e.state === 'recover') {
      e.arm.rotation.x = lerp(e.arm.rotation.x, 0.4, 1 - Math.exp(-3 * dt)); e.mane.rotation.x *= Math.exp(-3 * dt);
      if (e.cool <= 0) e.state = 'idle';
    }
    // the tell ring closes over the wind-up; inside the window it turns to gold
    e.ring.visible = e.state === 'windup';
    if (e.ring.visible) { const u = e.wind / WINDUP, s = 2.2 + 9 * u; e.ring.scale.set(s, s, 1); const inW = e.wind <= WINDOW; e.ring.material.map = inW ? FX.ringG : FX.ring; e.ring.material.rotation += dt * 3; }
    e.mark.visible = e.locked; if (e.locked) { const s = 6 + Math.sin(e.t * 6) * 0.4; e.mark.scale.set(s, s, 1); e.mark.material.rotation -= dt * 1.5; }
    if (d > 800 || (d > 320 && (dx * vx + dz * vz) > 0)) e.alive = false, e.deadT = 9;
  }
  for (let i = ijins.length - 1; i >= 0; i--) { const e = ijins[i]; if (!e.alive && e.deadT > 1.4) { scene.remove(e.g); ijins.splice(i, 1); } }
}
function attackIjin(e, d, dy) {
  e.state = 'recover'; e.cool = ATK_COOL; e.ponged = false; e.arm.rotation.x = 1.2;
  sfx.cut();
  // an ink crescent sweeps around the figure
  for (let k = 0; k < 18; k++) { const a = e.face - 1.6 + k / 17 * 3.2; fxAdd(FXN, 'ink', tmp.set(e.pos.x + Math.sin(a) * 7, e.pos.y + 1.4, e.pos.z + Math.cos(a) * 7), new V3(Math.sin(a) * 8, 1, Math.cos(a) * 8), 0.5, 2.2, 1, { drag: 3 }); }
  if (d < ATK_R * 1.5 && Math.abs(dy) < 5 && !P.dead) {
    if (IAI.state === 'kamae') IAI.cancel(true);
    if (P.invuln <= 0) { hurt('薙刀'); const k = 16 / Math.max(d, 1); P.vel.x += (P.pos.x - e.pos.x) * k; P.vel.z += (P.pos.z - e.pos.z) * k; P.vel.multiplyScalar(0.55); P.stagger = 0.5; }
  }
}
// the cut lands: the figure stops dead where it stands (its body stays for the hit-stop)
function cutIjin(e) {
  e.alive = false; e.deadT = 0; e.ring.visible = false; e.mark.visible = false; e.locked = false; e.cut = true;
  e.arm.rotation.x = -0.6; e.mane.rotation.x = 0.4;
}
// a beat later it blows apart behind you: flash, fireball, shockwave, debris and smoke, the mask split in two
function explodeIjin(e, perfect) {
  const c = new V3(e.pos.x, e.pos.y + 2.0, e.pos.z), K = perfect ? 1.35 : 1;
  const wp = new V3(); e.mask.getWorldPosition(wp);
  for (const sd of [-1, 1]) {
    const half = makeMask(e.type, 0.42 * 1.35); half.position.copy(wp); scene.add(half);
    const v = new V3(sd * 9 + (Math.random() - 0.5) * 4, 14, (Math.random() - 0.5) * 8);
    falling.push({ o: half, v, rv: new V3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, sd * 10), t: 0 });
    half.children[0].scale.x = 0.5; half.children[0].position.x = sd * 0.21;
  }
  e.g.visible = false; e.cut = false;
  fxExplode(c, K);
  const petal = moodPhase < 1.5 || moodPhase > 4.5 ? 'maple' : 'petal';
  for (let k = 0; k < (perfect ? 50 : 30); k++) fxAdd(FXN, petal, c, new V3((Math.random() - 0.5) * 30, 3 + Math.random() * 14, (Math.random() - 0.5) * 30), 2.8 + Math.random() * 1.5, 0.7, 0.7, { grav: 2.2, drag: 1.4, rv: (Math.random() - 0.5) * 8, sway: 6 });
}
// the explosion itself, built from the two particle systems and two short-lived meshes
const boomRingGeo = new THREE.RingGeometry(0.85, 1, 64).rotateX(-Math.PI / 2), booms = [];
function fxExplode(c, K = 1) {
  // a white-hot flash, then a fireball of orange and vermilion, rolling out and up
  fxAdd(FXA, 'dot', c, null, 0.16, 7 * K, 18 * K, { tint: [0.9, 0.62, 0.35] });
  fxAdd(FXN, 'dot', c, null, 0.3, 5 * K, 13 * K, { tint: [1, 0.82, 0.5] });
  for (let k = 0; k < 46; k++) {
    const d = new V3(Math.random() - 0.5, Math.random() * 0.8 - 0.15, Math.random() - 0.5).normalize(), sp = (14 + Math.random() * 26) * K;
    const hot = Math.random();
    fxAdd(FXN, 'dot', c, d.multiplyScalar(sp), 0.45 + Math.random() * 0.45, (2 + Math.random() * 2) * K, (5 + Math.random() * 5) * K, { drag: 3.2, grav: -3, tint: hot < 0.2 ? [1, 0.88, 0.5] : hot < 0.65 ? [0.98, 0.48, 0.18] : [0.8, 0.2, 0.14] });
  }
  for (let k = 0; k < 30; k++) { const d = new V3(Math.random() - 0.5, Math.random() * 0.7, Math.random() - 0.5).normalize(); fxAdd(FXA, 'dot', c, d.multiplyScalar((18 + Math.random() * 20) * K), 0.4, 2 * K, 4 * K, { drag: 3, tint: [0.7, 0.32, 0.12] }); }
  // smoke that lingers, dark at the heart and pale at the edge
  for (let k = 0; k < 22; k++) { const d = new V3(Math.random() - 0.5, Math.random() * 0.6 + 0.1, Math.random() - 0.5).normalize(); fxAdd(FXN, 'cloud', c, d.multiplyScalar((6 + Math.random() * 10) * K), 1.6 + Math.random() * 1.2, 3 * K, (10 + Math.random() * 6) * K, { drag: 1.6, grav: -2.5, a: 0.75, tint: Math.random() < 0.5 ? [0.32, 0.29, 0.31] : [0.58, 0.53, 0.52], fadeIn: 0.12 }); }
  // debris, sparks like a firework, and ink
  for (let k = 0; k < 40; k++) { const d = new V3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize(); fxAdd(FXA, 'spark', c, d.multiplyScalar((22 + Math.random() * 30) * K), 0.7 + Math.random() * 0.8, 1.2, 0.3, { grav: 18, drag: 0.6 }); }
  for (let k = 0; k < 18; k++) { const d = new V3(Math.random() - 0.5, Math.random() * 0.9 + 0.1, Math.random() - 0.5).normalize(); fxAdd(FXN, 'ink', c, d.multiplyScalar((12 + Math.random() * 18) * K), 0.9 + Math.random() * 0.6, 0.6 + Math.random() * 0.8, 0.4, { grav: 24, rv: (Math.random() - 0.5) * 10 }); }
  // a shockwave along the ground, and a standing ring facing the camera
  const gy = ground(c.x, c.z, c.y).h + 0.3;
  const ring = new THREE.Mesh(boomRingGeo, new THREE.MeshBasicMaterial({ color: 0xffd8a8, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  ring.position.set(c.x, gy, c.z); scene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 64), new THREE.MeshBasicMaterial({ color: 0xe8743a, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  ring2.position.copy(c); ring2.lookAt(camera.position); scene.add(ring2);
  booms.push({ ring, ring2, t: 0, K });
}
function updateBooms(dt) {
  for (let i = booms.length - 1; i >= 0; i--) {
    const b = booms[i]; b.t += dt; const u = b.t / 0.6;
    const r = (2 + 38 * (1 - Math.pow(1 - Math.min(u, 1), 3))) * b.K;
    b.ring.scale.setScalar(r); b.ring.material.opacity = 0.9 * (1 - smooth(0.2, 1, u));
    b.ring2.scale.setScalar(r * 0.55); b.ring2.material.opacity = 0.8 * (1 - smooth(0.1, 0.7, u)); b.ring2.lookAt(camera.position);
    if (u > 1) { scene.remove(b.ring); scene.remove(b.ring2); b.ring2.geometry.dispose(); booms.splice(i, 1); }
  }
}
const falling = [];
// leaves and petals drifting through the empty city; at speed they rush past
let leafT = 0;
function updateLeaves(dt) {
  leafT -= dt; if (leafT > 0) return; leafT = 0.09;
  const ahead = tmp.copy(P.pos).addScaledVector(fwd, 25 + Math.random() * 60);
  ahead.x += (Math.random() - 0.5) * 50; ahead.z += (Math.random() - 0.5) * 50; ahead.y = P.pos.y + 2 + Math.random() * 14;
  const autumn = moodPhase < 1.5 || moodPhase > 4.5, cell = Math.random() < (autumn ? 0.75 : 0.2) ? 'maple' : 'petal';
  fxAdd(FXN, cell, ahead, new V3((Math.random() - 0.5) * 2, -1.2, (Math.random() - 0.5) * 2), 7, 0.45, 0.45, { rv: (Math.random() - 0.5) * 4, sway: 2.5, a: 0.9, fadeIn: 0.1 });
}
function updateFalling(dt) {
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i]; f.t += dt; f.v.y -= 16 * dt; f.o.position.addScaledVector(f.v, dt); f.o.rotation.x += f.rv.x * dt; f.o.rotation.y += f.rv.y * dt; f.o.rotation.z += f.rv.z * dt;
    const gh = ground(f.o.position.x, f.o.position.z, f.o.position.y).h + 0.3;
    if (f.o.position.y < gh) { f.o.position.y = gh; f.v.multiplyScalar(0.3); f.v.y = Math.abs(f.v.y) * 0.3; f.rv.multiplyScalar(0.4); }
    if (f.t > 4) { scene.remove(f.o); falling.splice(i, 1); }
  }
}
