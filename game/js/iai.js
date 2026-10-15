// ---------------------------------------------------------------- iai: the stance and the single cut
// Hold the screen still: the rider takes the stance (構え). The board slows toward KAMAE_V and steers itself in
// onto the masked figure ahead, correcting the line as the distance closes. The figure reads the approach and winds
// up; its brush ring closes and turns gold, and a tsuzumi sounds (ポン). Let go inside that last instant and the cut
// lands as you pass: hit-stop in a kabuki frame, the screen cut in two, and the board flies on. Let go early and the blade is
// turned aside (弾かれ); hold too long and the naginata comes down on you.
const KAMAE_V = 28, REACH = 28, HITSTOP = 0.22, HITSTOP_P = 0.28, PASS_OFF = 2.8, CLOSE_OFF = 2.1, CLOSE_T = 0.12, BOOM_DELAY = 0.12;
const IAI = {
  state: 'none', target: null, t: 0, timeScale: 1, freeze: 0, freeze0: 0, slow: 0, dashFrom: new V3(), dashTo: new V3(), dashT: -1,
  mie: 0, mieYaw: 0, mieDist: 9, mieC: new V3(), phase: '', phaseT: 0, cutE: null, perfect: false, closeFrom: new V3(), closeTo: new V3(), swingP: 0, boomT: -1, lastResult: '', combo: 0, comboT: 0, near: 0, side: 1, split: 0, slashK: 0, boostT: -1,
  begin() {
    if (P.dead || P.stagger > 0 || this.state !== 'none' || (this.phase && this.phase !== 'boom')) return;
    this.state = 'kamae'; this.t = 0; P.kamae = true; sfx.kamae(true); kamaePull = 0; kamaeLat = 0;
    this.pick();
  },
  pick() {
    // the best figure ahead: near, and close to the line of travel
    let best = null, bs = Infinity;
    for (const e of ijins) {
      if (!e.alive) continue;
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d > 240 || d < 3) continue;
      const a = Math.abs(wrapA(Math.atan2(dx, dz) - P.yaw)); if (a > 0.95) continue;
      if (Math.abs(e.pos.y - P.pos.y) > 8) continue;
      const sc = d * (1 + a * 1.6); if (sc < bs) { bs = sc; best = e; }
    }
    if (this.target && this.target !== best) this.target.locked = false;
    if (best && best !== this.target) { // pass on the side you are already on
      const dx = best.pos.x - P.pos.x, dz = best.pos.z - P.pos.z; this.side = (dx * -Math.cos(P.yaw) + dz * Math.sin(P.yaw)) > 0 ? -1 : 1;
    }
    this.target = best; if (best) best.locked = true;
  },
  cancel(broken) {
    if (this.target) this.target.locked = false;
    this.state = 'none'; this.target = null; P.kamae = false; sfx.kamae(false);
    if (broken) toast('構え崩れ', '', 700);
  },
  release() {
    if (this.state !== 'kamae' || (this.phase && this.phase !== 'boom')) return;
    const e = this.target;
    P.kamae = false; sfx.kamae(false);
    this.state = 'none'; if (e) e.locked = false; this.target = null;
    if (!e || !e.alive) { sfx.noto(); return; }
    const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
    if (e.state === 'windup' && e.wind <= WINDOW && d < REACH) { this.strike(e, e.wind <= PERFECT); return; }
    if (d < REACH + 12 && (e.state === 'windup' || e.state === 'idle')) { this.parried(e); return; }
    sfx.noto(); // too far: the blade goes back into the scabbard
  },
  // the cut, as you pass: hit-stop in a kabuki frame, the screen cut in two, then the board flies on
  // the cut, in four beats: close in to the figure's side as the blade comes out; hit-stop as the blade goes through
  // (a kabuki mie); fly past; and a beat later the figure blows apart behind you
  strike(e, perfect) {
    this.lastResult = perfect ? '一閃' : '斬'; this.perfect = perfect; this.cutE = e;
    this.combo = simT - this.comboT < 8 ? this.combo + 1 : 1; this.comboT = simT;
    // carry on along the road you are on, so the pass does not run into the buildings
    const h = tmp.set(e.pos.x - P.pos.x, 0, e.pos.z - P.pos.z); if (h.lengthSq() < 0.01) h.copy(fwd); h.normalize();
    const rd = roadNear(e.pos.x, e.pos.z, e.pos.y + 1, Math.atan2(h.x, h.z));
    if (rd) { let tx = rd.tx, tz = rd.tz; if (tx * h.x + tz * h.z < 0) { tx = -tx; tz = -tz; } if (tx * h.x + tz * h.z > 0.6) h.set(tx, 0, tz); }
    const rx = -h.z, rz = h.x;
    this.closeFrom.copy(P.pos);
    this.closeTo.set(e.pos.x + rx * this.side * CLOSE_OFF - h.x * 0.6, P.pos.y, e.pos.z + rz * this.side * CLOSE_OFF - h.z * 0.6);
    this.dashTo.set(e.pos.x + rx * this.side * CLOSE_OFF + h.x * 22, P.pos.y, e.pos.z + rz * this.side * CLOSE_OFF + h.z * 22);
    // the step in (踏み込み): a real lunge with velocity to the figure's side, no warp. The pass direction and
    // speed are kept for when the blade is through.
    const currentSpeed = Math.hypot(P.vel.x, P.vel.z);
    this.passDir = (this.passDir || new V3()).set(h.x, 0, h.z);
    this.passSp = Math.max(currentSpeed * 0.7, KAMAE_V * 0.85) + (perfect ? 12 : 8);
    const lx = this.closeTo.x - P.pos.x, lz = this.closeTo.z - P.pos.z, ld = Math.hypot(lx, lz) || 1;
    this.lungeSp = Math.max(currentSpeed, ld / CLOSE_T);
    P.yaw = Math.atan2(lx, lz); fwd.set(lx / ld, 0, lz / ld); P.vel.set(lx / ld * this.lungeSp, 0, lz / ld * this.lungeSp);
    P.flow = Math.min(1, P.flow + (perfect ? 0.3 : 0.2)); P.invuln = 1.2;
    P.hull = Math.min(3, P.hull + 1); P.souls += perfect ? 2 : 1; store.set('ukiyo.souls', P.souls);
    cutIjin(e);
    this.phase = 'in'; this.phaseT = 0; this.swingP = 0; this.boomT = -1; kamaePull = 0; this.boostT = -1;
    swingStart(this.side); sfx.draw();
  },
  // the blade is through: freeze the frame
  land() {
    const e = this.cutE, perfect = this.perfect;
    this.phase = 'hold'; this.freeze = this.freeze0 = perfect ? HITSTOP_P : HITSTOP; this.slow = 0.4;
    // the blade is through: the board turns back onto the pass line and will fly on at the pass speed
    const h = this.passDir; P.yaw = Math.atan2(h.x, h.z); fwd.set(h.x, 0, h.z); P.vel.set(h.x * this.passSp, 0, h.z * this.passSp);
    this.mie = 1; this.mieDist = 9; this.mieC.copy(P.pos).lerp(e.pos, 0.5); let pick = null;
    const C = this.mieC;
    for (const sd of [-this.side, this.side]) for (const dd of [10, 8, 6]) {
      if (pick) break; const a = P.yaw + sd * 1.45, x = C.x + Math.sin(a) * dd, z = C.z + Math.cos(a) * dd;
      if (pointFree(x, z, e.pos.y + 1.5) && pointFree((x + C.x) / 2, (z + C.z) / 2, e.pos.y + 1.5)) pick = [a, dd];
    }
    if (pick) { this.mieYaw = pick[0]; this.mieDist = pick[1]; } else { this.mieYaw = P.yaw + Math.PI * 0.8; this.mieDist = 7; }
    tmp2.copy(e.pos); tmp2.y += 2; tmp2.project(camera);
    const cx = tmp2.x * 0.5 + 0.5, cy = tmp2.y * 0.5 + 0.5, asp = innerWidth / innerHeight;
    post.uniforms.uRadC.value.set(cx, cy);
    const ang = (Math.random() < 0.5 ? 1 : -1) * (0.45 + Math.random() * 0.35);
    post.uniforms.uSlash.value.set(ang, ((cx - 0.5) * asp) * -Math.sin(ang) + (cy - 0.5) * Math.cos(ang), 0);
    this.split = 0; this.slashK = 0;
    stamp(this.lastResult, perfect, this.combo); maku(perfect);
    sfx.strike(perfect); sfx.tsuke(perfect); buzz(perfect ? [30, 40, 120] : [25, 30, 80]);
    fxSparks(tmp2.copy(e.pos).setY(e.pos.y + 1.8), 0, 0, 30);
  },
  // the blast behind you
  boom() {
    const e = this.cutE; if (!e) return; this.phase = 'boom'; setTimeout(() => { if (this.phase === 'boom') this.phase = ''; }, 550);
    explodeIjin(e, this.perfect); this.cutE = null;
    sfx.explode(this.perfect); shake = Math.max(shake, this.perfect ? 1.4 : 1.0); dashPunch = 0.8;
    post.uniforms.uFlash.value.setRGB(1, 0.86, 0.62); this.flash = this.perfect ? 0.45 : 0.35;
    buzz(this.perfect ? [40, 25, 100] : [30, 20, 60]);
  },
  parried(e) {
    // the figure turns the blade aside: a ring of iron, sparks, and you are thrown off the line
    this.lastResult = '弾かれ'; e.state = 'recover'; e.cool = 0.9; e.ponged = false; e.wind = 0;
    const h = tmp.set(P.pos.x - e.pos.x, 0, P.pos.z - e.pos.z).normalize();
    const sd = Math.random() < 0.5 ? 1 : -1;
    P.vel.multiplyScalar(0.3); P.vel.x += (h.x + -h.z * sd * 0.8) * 14; P.vel.z += (h.z + h.x * sd * 0.8) * 14; P.vel.y = 3; P.grounded = false;
    P.stagger = 0.6; P.flow *= 0.5; shake = 0.8;
    fxSparks(tmp2.copy(e.pos).setY(e.pos.y + 1.6), h.x, h.z, 26);
    sfx.clang(); buzz([15, 20, 15]); toast('弾かれた', '', 800);
    post.uniforms.uFlash.value.setRGB(1, 1, 1); this.flash = 0.35;
  },
  update(dtReal) {
    // the distance to the chosen figure sets how deep the held breath goes
    const e = this.target;
    const d = e ? Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) : 999;
    this.near = lerp(this.near, this.state === 'kamae' && e ? smooth(70, 22, d) : 0, 1 - Math.exp(-6 * dtReal));
    // time: frozen in the hit-stop, slowed after it, and slowed into the moment before the cut
    if (this.phase === 'in') {
      // the lunge runs in real time: velocity aimed at the figure's side each frame, so the motion stays continuous
      this.phaseT += dtReal; const k = Math.min(1, this.phaseT / CLOSE_T);
      this.swingP = 0.65 * k; this.timeScale = 1; dashPunch = 1;
      const dx = this.closeTo.x - P.pos.x, dz = this.closeTo.z - P.pos.z, dd = Math.hypot(dx, dz);
      if (dd > 0.6) { P.vel.x = dx / dd * this.lungeSp; P.vel.z = dz / dd * this.lungeSp; P.yaw = Math.atan2(dx, dz); }
      if (k >= 1 || dd < 0.8) this.land();
    }
    else if (this.freeze > 0) { this.freeze -= dtReal; this.timeScale = 0; this.swingP = lerp(0.65, 0.8, 1 - this.freeze / this.freeze0); if (this.freeze <= 0) { this.phase = 'out'; this.boostT = 0.45; this.boomT = BOOM_DELAY; sfx.dash(); } }
    else if (this.slow > 0) { this.slow -= dtReal; this.timeScale = lerp(1, 0.45, smooth(0, 0.4, this.slow)); }
    else this.timeScale = this.state === 'kamae' ? lerp(0.85, 0.4, this.near) : 1;
    if (this.phase === 'out') this.swingP = Math.min(1, this.swingP + dtReal * 2.2);
    if (this.boomT >= 0) { this.boomT -= dtReal; if (this.boomT < 0) this.boom(); }
    swingUpdate(this.swingP, dtReal);
    // after the cut: re-accelerate continuously from current velocity rather than warping position
    if (this.boostT >= 0) {
      this.boostT -= dtReal;
      const boost = (this.perfect ? 38 : 28) * Math.max(0, this.boostT / 0.45);
      const hs = Math.hypot(P.vel.x, P.vel.z) || 1;
      P.vel.x += (P.vel.x / hs) * boost * dtReal; P.vel.z += (P.vel.z / hs) * boost * dtReal;
      if (this.boostT <= 0) this.boostT = -1;
    }
    if (this.state === 'kamae') {
      this.t += dtReal;
      if (!this.target || !this.target.alive || this.t % 0.25 < dtReal) this.pick();
      if (P.stagger > 0 || P.dead) this.cancel(false);
    }
    // the side camera holds through the blast, then lets go
    this.mie = Math.max(0, this.mie - dtReal / (this.phase ? 1e9 : 0.7));
    const u = post.uniforms;
    // the frame: the stroke is drawn at once, the picture is cut in two partway through the hold, then knits back
    if (this.freeze > 0) {
      const k = 1 - this.freeze / this.freeze0;
      this.slashK = smooth(0, 0.08, k); this.split = smooth(0.35, 0.5, k);
    } else { this.slashK = Math.max(0, this.slashK - dtReal * 4); this.split = Math.max(0, this.split - dtReal * 4); }
    u.uSlash.value.z = this.slashK; u.uSplit.value = this.split;
    u.uMono.value = this.freeze > 0 ? 1 : Math.max(0, u.uMono.value - dtReal * 5);
    u.uRadial.value = this.freeze > 0 ? 1 : Math.max(0, u.uRadial.value - dtReal * 3);
    const focus = this.state === 'kamae' ? 0.35 + 0.65 * this.near : 0;
    u.uFocus.value = lerp(u.uFocus.value, focus, 1 - Math.exp(-(this.state === 'kamae' ? 4 : 10) * dtReal));
    this.flash = Math.max(0, (this.flash || 0) - dtReal * 2); u.uFlashK.value = this.flash;
    u.uVig.value = Math.max(0, u.uVig.value - dtReal * 1.2);
  },
};
function pointFree(x, z, y) {
  for (const c of colNear(x, z)) {
    if (y > c.top + 0.3 || y < c.bottom) continue;
    const dx = x - c.x, dz = z - c.z, lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
    if (Math.abs(lx) < c.hw + 1.2 && Math.abs(lz) < c.hd + 1.2) return false;
  }
  return true;
}
// the board's own steering in the stance: not a snap, but a pull with weight. The assist eases in over about
// half a second after the lock, turns the heading a little at a time, and draws the board sideways toward the pass
// line through its velocity (inertia), so the rider feels carried rather than steered. The finger still wins.
let kamaePull = 0, kamaeLat = 0;
function kamaeSteer(dt) {
  const e = IAI.target;
  if (!e || !e.alive) { kamaePull = Math.max(0, kamaePull - dt * 2); return; }
  kamaePull = Math.min(1, kamaePull + dt / 0.55);
  const pull = kamaePull * kamaePull * (3 - 2 * kamaePull);
  const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
  const rx = -dz / d, rz = dx / d;
  const ax = dx + rx * IAI.side * PASS_OFF, az = dz + rz * IAI.side * PASS_OFF;
  const own = Math.abs(inp.jx + inp.kx); // how hard the rider is steering for themself
  const give = pull * (1 - clamp(own * 1.6, 0, 0.85));
  // heading: a gentle turn rate toward the pass line, capped, stronger only in the last metres
  const dyaw = wrapA(Math.atan2(ax, az) - P.yaw), rate = lerp(0.55, 2.2, smooth(120, 18, d)) * give;
  const turn = clamp(dyaw * rate, -1.1, 1.1) * dt;
  P.yaw += turn;
  // show the turn as lean, so the board banks into it like a carve
  if (dt > 0) P.assistLean = lerp(P.assistLean, clamp(-turn / dt * 0.35, -0.4, 0.4), 1 - Math.exp(-6 * dt));
  // the sideways draw: a soft spring on the lateral error, applied to velocity and smoothed
  const lat = ax * -Math.cos(P.yaw) + az * Math.sin(P.yaw);
  kamaeLat = lerp(kamaeLat, clamp(lat, -14, 14), 1 - Math.exp(-3 * dt));
  const pushK = 1.6 * give * smooth(160, 30, d);
  P.vel.x += -Math.cos(P.yaw) * kamaeLat * pushK * dt; P.vel.z += Math.sin(P.yaw) * kamaeLat * pushK * dt;
  P.lean *= Math.exp(-1.2 * give * dt);
}
// the sword swing: a long blade on a pivot at the chest sweeps from behind, across the figure's side and out in
// front, leaving a white trail edged in vermilion. The pivot is mirrored for a cut on the right.
const swing = new THREE.Group(), swingBlade = new THREE.Group(); boardPivot.add(swing); swing.add(swingBlade);
swing.position.set(0, 1.25, 0); swing.visible = false;
(() => {
  const B = new Builder();
  B.box(1.15, -0.03, 0, 0.95, 0.06, 0.035, 0, 0xf4f6ff);                       // the blade
  B.box(0.12, -0.05, 0, 0.12, 0.1, 0.05, 0, 0xe9e4d8); B.cyl(0.25, -0.08, 0, 0.09, 0.09, 0.16, 8, COL.kin); // hilt and guard
  const m = B.mesh(glowMat); swingBlade.add(m);
})();
const SW0 = -1.35, SW1 = 1.55;
const trailGeo = new THREE.RingGeometry(0.45, 2.45, 40, 1, -SW0, -(SW1 - SW0)).rotateX(-Math.PI / 2), trailEdgeGeo = new THREE.RingGeometry(2.3, 2.65, 40, 1, -SW0, -(SW1 - SW0)).rotateX(-Math.PI / 2);
const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
const trailEdge = new THREE.Mesh(trailEdgeGeo, new THREE.MeshBasicMaterial({ color: COL.shu, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
swing.add(trail, trailEdge); trail.renderOrder = trailEdge.renderOrder = 8;
let swingFade = 0;
function swingStart(side) { swing.visible = true; swing.scale.x = side; swing.rotation.z = 0.22 * side; swingFade = 1; trail.material.opacity = 0.9; trailEdge.material.opacity = 0.95; RIG.blade.visible = false; }
function swingUpdate(p, dt) {
  if (!swing.visible) return;
  const phi = lerp(SW0, SW1, p);
  swingBlade.rotation.y = -phi;
  const n = Math.max(0, Math.round(40 * p)) * 6;
  trailGeo.setDrawRange(0, n); trailEdgeGeo.setDrawRange(0, n);
  if (p >= 1 && IAI.phase !== 'hold') {
    swingFade = Math.max(0, swingFade - dt * 2.2);
    trail.material.opacity = 0.9 * swingFade; trailEdge.material.opacity = 0.95 * swingFade;
    if (swingFade <= 0) { swing.visible = false; trailGeo.setDrawRange(0, 0); trailEdgeGeo.setDrawRange(0, 0); }
  }
}
const slashes = [];
function updateSlashes(dt) {
  for (let i = slashes.length - 1; i >= 0; i--) {
    const q = slashes[i]; q.t += dt;
    q.g.rotation.z += dt * (q.t < 0.12 ? 9 : 0.4);
    for (const m of q.m) m.material.opacity = 1 - smooth(0.45, 1.0, q.t);
    if (q.t > 1.0) { scene.remove(q.g); slashes.splice(i, 1); }
  }
}

// damage and the end of the road
function hurt(cause) {
  if (P.dead || P.invuln > 0) return;
  P.hull--; P.invuln = 1.3; shake = Math.max(shake, 1.0); post.uniforms.uVig.value = 1;
  post.uniforms.uFlash.value.setHex(COL.shu); IAI.flash = 0.45;
  sfx.hurt(); buzz([40, 30, 80]);
  if (IAI.state === 'kamae') IAI.cancel(true);
  if (P.hull <= 0) { die(cause); return; }
  toast(cause, `残り ${P.hull}`, 1100);
}
function die(cause) {
  P.dead = true; P.vel.multiplyScalar(0.2);
  setTimeout(() => showOver(cause), 900);
}
function revive() {
  P.dead = false; P.hull = 3; P.invuln = 2; P.flow = 0;
  for (const f of forms) if (f.mode !== 'pass') f.done = true;
  for (const b of bullets) b.life = 0;
}
