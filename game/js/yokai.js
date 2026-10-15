// ---------------------------------------------------------------- yokai: the other world over Tokyo
// Particles, the flying formations (noh masks that fire hitodama, paper cranes and fox-fire processions that only
// pass), and the masked figures that stand in the road with a naginata.

// ---- particles: two point systems (ink-like and light-like) drawing from one atlas, one draw call each
const ATLAS_CELLS = ['ink', 'wave', 'petal', 'maple', 'cloud', 'spark', 'dot', 'soul'];
const fxAtlas = canvasTex(1024, 128, (g) => { ATLAS_CELLS.forEach((k, i) => { g.drawImage(FX[k].image, i * 128, 0, 128, 128); }); });
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
  vec4 t = texture2D(uMap, vec2((vCell + p.x) / 8.0, 1.0 - p.y)); t.rgb *= vTint;
  float m = smoothstep(uFog.x, uFog.y, vD);
  ${additive ? 'gl_FragColor = vec4(t.rgb * t.a * vAlpha * (1.0 - m), 1.0);' : 'if (t.a * vAlpha < 0.02) discard; gl_FragColor = vec4(mix(t.rgb, uMist, m * 0.8), t.a * vAlpha);'} }`,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
  return { geo, mat, max, list: [], pts };
}
const FXN = makeFxSystem(900, false), FXA = makeFxSystem(1400, true);
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
let formT = 3, assaultCD = 14, chaseCD = 10, threatOn = store.get('ukiyo.threat', true);
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
  if (formT <= 0 && forms.length < 6) {
    formT = 4 + Math.random() * 5;
    spawnFormation(Math.random() < 0.6 ? 'crane' : 'kitsune', 'pass');
  }
  if (threatOn && started && !P.dead) {
    if (assaultCD <= 0 && !forms.some((f) => f.mode === 'assault')) { assaultCD = 26 + Math.random() * 18 - (speed > 45 ? 8 : 0); spawnFormation('mask', 'assault'); }
    // slow riders are hunted from behind
    if (chaseCD <= 0 && !forms.some((f) => f.mode === 'chase')) { chaseCD = speed < 18 ? 8 : 24 + Math.random() * 14; spawnFormation('mask', 'chase'); }
  }
  const h = speed > 3 ? _v.set(P.vel.x, 0, P.vel.z).normalize() : _v.copy(fwd);
  for (const f of forms) {
    f.t += dt;
    if (f.mode === 'pass') f.pos.addScaledVector(f.vel, dt);
    else if (f.mode === 'chase') {
      tmp.copy(P.pos).addScaledVector(h, -60); tmp.y = P.pos.y + 24;
      tmp2.subVectors(tmp, f.pos); const d = tmp2.length(); tmp2.normalize().multiplyScalar(Math.min(DRONE_MAX, d * 1.2));
      f.vel.lerp(tmp2, 1 - Math.exp(-1.5 * dt)); f.pos.addScaledVector(f.vel, dt);
      f.fireT -= dt;
      if (f.fireT <= 0 && f.t < f.life - 3 && f.pos.distanceTo(P.pos) < 240) { f.fireT = 1.5; volley(f); }
    } else {
      const hold = f.t < f.life - 4;
      tmp.copy(P.pos).addScaledVector(h, hold ? 175 : 400); tmp.y = P.pos.y + (hold ? 20 + Math.sin(f.t * 0.8) * 4 : 160);
      tmp.addScaledVector(_v.set(-h.z, 0, h.x), Math.sin(f.t * 0.5) * 18);
      f.pos.lerp(tmp, 1 - Math.exp(-(f.t < 3 ? 0.9 : 2.2) * dt));
      f.fireT -= dt;
      if (hold && f.t > 3.5 && f.fireT <= 0) { f.fireT = 1.8; pattern(f); f.pat = (f.pat + 1) % 6; }
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
// chase volleys: a few hitodama aimed at where you are now
function volley(f) {
  for (const m of f.members) {
    if (Math.random() < 0.55) continue;
    m.obj.getWorldPosition(tmp);
    tmp2.subVectors(P.pos, tmp).normalize().multiplyScalar(BULLET_SPD);
    fireBullet(tmp, tmp2);
  }
  sfx.volley();
}
// assault patterns: rounds keep your pace and close at CLOSE m/s, so each takes about three seconds to arrive
function pattern(f) {
  const h = _v.set(P.vel.x, 0, P.vel.z), sp = h.length(); if (sp > 1) h.multiplyScalar(1 / sp); else h.copy(fwd);
  const right = new V3(-h.z, 0, h.x), base = new V3(P.vel.x, 0, P.vel.z), origin = f.pos.clone();
  const T = Math.max(1.5, origin.distanceTo(P.pos) / CLOSE), yv = (P.pos.y + 0.9 - origin.y) / T;
  const shot = (lat, latV = 0, delay = 0, up = 0) => {
    const v = base.clone().addScaledVector(h, -CLOSE).addScaledVector(right, latV); v.y = yv + up;
    const p = origin.clone().addScaledVector(right, lat);
    if (delay) setTimeoutSim(() => fireBullet(p.addScaledVector(v, 0), v), delay); else fireBullet(p, v);
  };
  const pat = f.pat;
  if (pat === 0) { const gap = (Math.random() - 0.5) * 20; for (let x = -22; x <= 22; x += 2.3) if (Math.abs(x - gap) > 3.8) shot(x); }
  else if (pat === 1) { for (let k = -7; k <= 7; k++) shot(0, k * 3.2); }
  else if (pat === 2) { for (let k = 0; k < 20; k++) { const a = k / 20 * TAU; shot(Math.cos(a) * 1.5, Math.cos(a) * 5.5, 0, Math.sin(a) * 5.5); } }
  else if (pat === 3) { for (const x of [-9, 0, 9]) for (let k = 0; k < 6; k++) shot(x, 0, k * 0.11); }
  else if (pat === 4) { for (let k = 0; k < 28; k++) { const a = k * 0.42; shot(Math.cos(a) * 3, Math.cos(a) * 6, k * 0.045, Math.sin(a) * 3); } }
  else { for (const off of [0, 1.15]) for (let x = -21; x <= 21; x += 4.6) shot(x + off * 2.3, 0, off * 0.55); }
  sfx.volley();
}
const simTimers = [];
function setTimeoutSim(fn, d) { simTimers.push({ t: d, fn }); }
function fireBullet(p, v) {
  const b = { p: p.clone(), v: v.clone(), life: 7, grazed: false, fx: fxAdd(FXA, 'soul', p, v, 7, 3.6, 3.6, { a: 1, tint: [0.85, 0.95, 1] }) };
  bullets.push(b);
}
function updateBullets(dt) {
  for (let i = simTimers.length - 1; i >= 0; i--) { simTimers[i].t -= dt; if (simTimers[i].t <= 0) { const f = simTimers[i].fn; simTimers.splice(i, 1); f(); } }
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]; b.life -= dt; b.p.addScaledVector(b.v, dt);
    if (b.fx) { b.fx.p.copy(b.p); b.fx.v.set(0, 0, 0); }
    const d = b.p.distanceTo(P.pos);
    if (d < 1.5 && !P.shelter && P.invuln <= 0 && !P.dead) { hurt('人魂'); b.life = 0; fxSparks(b.p, 0, 0, 10); }
    else if (d < 4.8 && !b.grazed && !P.dead) { b.grazed = true; graze(); }
    if (b.life <= 0 || b.p.y < ground(b.p.x, b.p.z, b.p.y).h - 1) { if (b.fx) b.fx.age = b.fx.life; bullets.splice(i, 1); }
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
const WINDUP = 0.95, WINDOW = 0.3, PERFECT = 0.12, ATK_R = 10.5, ATK_COOL = 1.6;
const ijins = [];
let ijinDist = 260;
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
  if (threatOn && started && !P.dead) { ijinDist -= Math.hypot(P.vel.x, P.vel.z) * dt; if (ijinDist <= 0 && ijins.filter((e) => e.alive).length < 4) { ijinDist = 330 + Math.random() * 380; spawnIjin(); } }
  for (const e of ijins) {
    e.t += dt;
    if (!e.alive) { e.deadT += dt; continue; }
    const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz), dy = P.pos.y - (e.pos.y + HOVER);
    const vx = P.vel.x, vz = P.vel.z, closing = -(dx * vx + dz * vz) / Math.max(d, 0.01);
    if (d < 140) e.face = lerp(e.face, e.face + wrapA(Math.atan2(dx, dz) - e.face), 1 - Math.exp(-4 * dt));
    e.g.rotation.y = e.face;
    e.cool = Math.max(0, e.cool - dt);
    if (e.state === 'idle') {
      // the figure reads your approach: when you will reach it within one wind-up, it begins
      const T = d / Math.max(closing, 1);
      if (e.cool <= 0 && closing > 4 && d < 120 && Math.abs(dy) < 6 && T < WINDUP + 0.04) { e.state = 'windup'; e.wind = WINDUP; sfx.yoo(); }
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
    if (d > 650 || (d > 260 && (dx * vx + dz * vz) > 0)) e.alive = false, e.deadT = 9;
  }
  for (let i = ijins.length - 1; i >= 0; i--) { const e = ijins[i]; if (!e.alive && e.deadT > 1.4) { scene.remove(e.g); ijins.splice(i, 1); } }
}
function attackIjin(e, d, dy) {
  e.state = 'recover'; e.cool = ATK_COOL; e.ponged = false; e.arm.rotation.x = 1.2;
  sfx.cut();
  // an ink crescent sweeps around the figure
  for (let k = 0; k < 18; k++) { const a = e.face - 1.6 + k / 17 * 3.2; fxAdd(FXN, 'ink', tmp.set(e.pos.x + Math.sin(a) * 7, e.pos.y + 1.4, e.pos.z + Math.cos(a) * 7), new V3(Math.sin(a) * 8, 1, Math.cos(a) * 8), 0.5, 2.2, 1, { drag: 3 }); }
  if (d < ATK_R && Math.abs(dy) < 4 && !P.dead) {
    if (IAI.state === 'kamae') IAI.cancel(true);
    if (P.invuln <= 0) { hurt('薙刀'); const k = 16 / Math.max(d, 1); P.vel.x += (P.pos.x - e.pos.x) * k; P.vel.z += (P.pos.z - e.pos.z) * k; P.vel.multiplyScalar(0.55); P.stagger = 0.5; }
  }
}
function killIjin(e, perfect) {
  e.alive = false; e.deadT = 0; e.ring.visible = false; e.mark.visible = false; e.locked = false;
  // the mask splits and falls; the body goes up in sumi
  const wp = new V3(); e.mask.getWorldPosition(wp);
  for (const sd of [-1, 1]) {
    const half = makeMask(e.type, 0.42); half.position.copy(wp); scene.add(half);
    const v = new V3(sd * 5 + P.vel.x * 0.15, 7, P.vel.z * 0.15 + (Math.random() - 0.5) * 3);
    falling.push({ o: half, v, rv: new V3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, sd * 6), t: 0 });
    half.children[0].scale.x = 0.5; half.children[0].position.x = sd * 0.21;
  }
  e.g.visible = false;
  const c = tmp.copy(e.pos); c.y += 1.6;
  fxInk(c, perfect ? 34 : 22, 9);
  for (let k = 0; k < 8; k++) fxAdd(FXN, 'wave', c, new V3((Math.random() - 0.5) * 22, 6 + Math.random() * 8, (Math.random() - 0.5) * 22), 1.1, 2.2, 4.2, { grav: 10, rv: (Math.random() - 0.5) * 4 });
  const petal = U.uNight.value > 0.6 || (moodPhase > 2.5 && moodPhase < 3.5) ? 'petal' : 'maple';
  for (let k = 0; k < (perfect ? 60 : 36); k++) fxAdd(FXN, Math.random() < 0.75 ? petal : 'petal', c, new V3((Math.random() - 0.5) * 26, 2 + Math.random() * 12, (Math.random() - 0.5) * 26), 2.6 + Math.random() * 1.5, 0.7, 0.7, { grav: 2.2, drag: 1.4, rv: (Math.random() - 0.5) * 8, sway: 6 });
  for (let k = 0; k < 12; k++) fxAdd(FXA, 'soul', c, new V3((Math.random() - 0.5) * 6, 3 + Math.random() * 6, (Math.random() - 0.5) * 6), 1.2, 2, 0.4, { tint: [0.8, 0.95, 1] });
}
const falling = [];
function updateFalling(dt) {
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i]; f.t += dt; f.v.y -= 16 * dt; f.o.position.addScaledVector(f.v, dt); f.o.rotation.x += f.rv.x * dt; f.o.rotation.y += f.rv.y * dt; f.o.rotation.z += f.rv.z * dt;
    const gh = ground(f.o.position.x, f.o.position.z, f.o.position.y).h + 0.3;
    if (f.o.position.y < gh) { f.o.position.y = gh; f.v.multiplyScalar(0.3); f.v.y = Math.abs(f.v.y) * 0.3; f.rv.multiplyScalar(0.4); }
    if (f.t > 4) { scene.remove(f.o); falling.splice(i, 1); }
  }
}
