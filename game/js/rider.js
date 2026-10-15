// ---------------------------------------------------------------- the rider: a traveller in a wide straw hat and a cape, on a powered board
// He rides side-on (left foot forward), a sword at his left hip. The cape is a little cloth simulation pinned
// at the shoulders, so it streams and snaps with speed and turns.
const player = new THREE.Group(); scene.add(player);
const boardPivot = new THREE.Group(); player.add(boardPivot);
const RIG = {};
(() => {
  const B = new Builder(), G = new Builder();
  // the board: black lacquer deck with vermilion rails, kicked up at both ends, two thruster pods below
  B.box(0, 0.12, 0, 0.32, 0.07, 0.86, 0, 0x1f1c22, 0, 0x26232a);
  for (const s of [-1, 1]) { B.frustum(0, 0.12, s * 0.98, 0.3, 0.12, 0.26, 0.08, 0.16, 0, 0x1f1c22); B.box(s * 0.33, 0.12, 0, 0.03, 0.08, 0.84, 0, COL.shu); }
  for (const s of [-1, 1]) { B.cyl(0, -0.05, s * 0.55, 0.16, 0.13, 0.17, 8, 0x4a4650); G.cyl(0, -0.08, s * 0.55, 0.12, 0.12, 0.04, 8, COL.asagi); }
  boardPivot.add(B.mesh()); boardPivot.add(G.mesh(glowMat));
  // the man
  const rider = new THREE.Group(); boardPivot.add(rider); RIG.rider = rider;
  const M = new Builder();
  const legs = [[-0.42, 1], [0.42, -1]];
  for (const [z] of legs) { M.beam([0.0, 0.2, z * 1.08], [-0.12, 0.62, z * 0.72], 0.08, 0x2b2a33); M.beam([-0.12, 0.62, z * 0.72], [0.0, 1.0, z * 0.3], 0.085, 0x2b2a33); M.box(0, 0.19, z * 1.08, 0.1, 0.07, 0.15, 0, COL.kogecha); }
  M.frustum(0, 0.95, 0, 0.17, 0.22, 0.22, 0.2, 0.62, 0, 0x3a3348);      // kimono body
  M.box(0, 1.08, 0, 0.23, 0.08, 0.23, 0, COL.kin);                       // obi
  M.cyl(0, 1.56, 0, 0.07, 0.07, 0.1, 6, 0xd8b896);                       // neck
  M.box(0, 1.62, 0, 0.12, 0.2, 0.12, 0, 0xd8b896);                       // head
  // the straw hat (三度笠): a wide shallow cone with a dark rim
  M.cyl(0, 1.74, 0, 0.62, 0.0, 0.24, 14, 0xc9a35a);
  M.cyl(0, 1.72, 0, 0.64, 0.62, 0.03, 14, 0x6b4a2f, 0, false);
  rider.add(M.mesh());
  // arms: the right hand hangs, ready for the hilt; posed in updateRider
  const arm = (side) => { const g = new THREE.Group(), A = new Builder(); A.beam([0, 0, 0], [0, -0.52, 0.06], 0.06, 0x3a3348); A.box(0, -0.6, 0.06, 0.05, 0.08, 0.05, 0, 0xd8b896); g.add(A.mesh()); g.position.set(0, 1.46, side * 0.22); rider.add(g); return g; };
  RIG.armL = arm(1); RIG.armR = arm(-1);
  // the sword at the left hip: black scabbard, white-wrapped hilt with a gold guard
  const sword = new THREE.Group(), SW = new Builder();
  SW.beam([0, 0, 0], [0, 0, -1.0], 0.035, 0x141218); SW.beam([0, 0, 0], [0, 0, 0.3], 0.03, 0xe9e4d8); SW.cyl(0, -0.01, 0, 0.07, 0.07, 0.02, 8, COL.kin);
  sword.add(SW.mesh()); sword.position.set(-0.24, 1.05, 0.1); sword.rotation.set(0.35, 0, 0.25); rider.add(sword); RIG.sword = sword;
  // the drawn blade, shown during the strike
  const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 1.3).translate(0, 0.65, 0), new THREE.MeshBasicMaterial({ color: 0xf4f6ff, side: THREE.DoubleSide }));
  blade.visible = false; RIG.armR.add(blade); blade.position.set(0, -0.6, 0.06); RIG.blade = blade;
  // the hover glow under the board
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.dot, color: COL.asagi, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(2.2, 2.2, 1); glow.position.y = -0.2; boardPivot.add(glow); RIG.glow = glow;
})();

// ---- the cape: CW × CH points in world space, top row pinned along the shoulders
const CW = 5, CHN = 7, capeP = [], capeO = [];
const capeGeo = new THREE.BufferGeometry();
{
  const pos = new Float32Array(CW * CHN * 3), uv = new Float32Array(CW * CHN * 2), nor = new Float32Array(CW * CHN * 3), col = new Float32Array(CW * CHN * 3).fill(1), idx = [];
  for (let j = 0; j < CHN; j++) for (let i = 0; i < CW; i++) { const k = j * CW + i; uv[k * 2] = i / (CW - 1); uv[k * 2 + 1] = 1 - j / (CHN - 1); capeP.push(new V3()); capeO.push(new V3()); }
  for (let j = 0; j < CHN - 1; j++) for (let i = 0; i < CW - 1; i++) { const a = j * CW + i, b = a + 1, c = a + CW, d = c + 1; idx.push(a, c, b, b, c, d); }
  capeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); capeGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  capeGeo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); capeGeo.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); capeGeo.setIndex(idx);
}
const cape = new THREE.Mesh(capeGeo, capeMat); cape.frustumCulled = false; scene.add(cape);
const CAPE_W = 0.95, CAPE_L = 1.35, segW = CAPE_W / (CW - 1), segL = CAPE_L / (CHN - 1);
const _sh = new V3(), _ax = new V3(), _tmpC = new V3();
function capeAnchor(i, out) {
  // shoulders: across the rider's back. The rider faces the board's left (−x local); his back is +x.
  const u = i / (CW - 1) - 0.5;
  out.set(0.2, 1.5, u * CAPE_W * 0.85);
  boardPivot.localToWorld(out);
  return out;
}
function resetCape() {
  player.updateMatrixWorld(true);
  for (let j = 0; j < CHN; j++) for (let i = 0; i < CW; i++) { const k = j * CW + i; capeAnchor(i, capeP[k]); capeP[k].y -= j * segL; capeO[k].copy(capeP[k]); }
}
function updateCape(dt, vel) {
  if (dt <= 0) return;
  dt = Math.min(dt, 1 / 30);
  player.updateMatrixWorld(true);
  const drag = 1 - Math.min(0.5, 2.2 * dt), airK = 0.9;
  for (let j = 0; j < CHN; j++) for (let i = 0; i < CW; i++) {
    const k = j * CW + i, p = capeP[k], o = capeO[k];
    if (j === 0) { capeAnchor(i, p); o.copy(p); continue; }
    // verlet: carry the motion, fall, and be blown back by the air the rider moves through
    const vx = (p.x - o.x) * drag, vy = (p.y - o.y) * drag, vz = (p.z - o.z) * drag;
    o.copy(p);
    const flap = Math.sin(U.uTime.value * 17 + j * 1.3 + i * 0.7) * 0.06 * Math.min(1, vel.length() / 30);
    p.x += vx - vel.x * dt * dt * airK * 3 + flap * dt; p.y += vy - 9.8 * dt * dt + Math.abs(flap) * dt * 2; p.z += vz - vel.z * dt * dt * airK * 3 + flap * dt;
  }
  for (let it = 0; it < 4; it++) {
    for (let j = 0; j < CHN; j++) for (let i = 0; i < CW; i++) {
      const k = j * CW + i;
      if (i < CW - 1) satisfy(k, k + 1, segW, j === 0);
      if (j < CHN - 1) satisfy(k, k + CW, segL, j === 0);
    }
  }
  const pa = capeGeo.attributes.position.array;
  for (let k = 0; k < capeP.length; k++) { pa[k * 3] = capeP[k].x; pa[k * 3 + 1] = capeP[k].y; pa[k * 3 + 2] = capeP[k].z; }
  capeGeo.attributes.position.needsUpdate = true; capeGeo.computeVertexNormals(); capeGeo.computeBoundingSphere();
}
function satisfy(a, b, rest, pinA) {
  const p = capeP[a], q = capeP[b]; _tmpC.subVectors(q, p); const d = _tmpC.length() || 1e-6, f = (d - rest) / d;
  if (pinA) q.addScaledVector(_tmpC, -f); else { p.addScaledVector(_tmpC, f * 0.5); q.addScaledVector(_tmpC, -f * 0.5); }
}
