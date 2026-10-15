// ---------------------------------------------------------------- iai: the stance and the single cut
// Hold the screen still: the rider takes the stance (構え). The board slows toward KAMAE_V and steers itself in
// onto the masked figure ahead, correcting the line as the distance closes. The figure reads the approach and winds
// up; its brush ring closes and turns gold, and a tsuzumi sounds (ポン). Let go inside that last instant and the cut
// lands as you pass: hit-stop in a kabuki frame, the screen cut in two, and the board flies on. Let go early and the blade is
// turned aside (弾かれ); hold too long and the naginata comes down on you.
const KAMAE_V = 34, REACH = 22, HITSTOP = 0.3, HITSTOP_P = 0.42, PASS_OFF = 2.8;
const IAI = {
  state: 'none', target: null, t: 0, timeScale: 1, freeze: 0, freeze0: 0, slow: 0, dashFrom: new V3(), dashTo: new V3(), dashT: -1,
  mie: 0, mieYaw: 0, mieDist: 9, mieC: new V3(), lastResult: '', combo: 0, comboT: 0, near: 0, side: 1, split: 0, slashK: 0,
  begin() {
    if (P.dead || P.stagger > 0 || this.state !== 'none') return;
    this.state = 'kamae'; this.t = 0; P.kamae = true; sfx.kamae(true);
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
    if (this.state !== 'kamae') return;
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
  strike(e, perfect) {
    this.freeze = this.freeze0 = perfect ? HITSTOP_P : HITSTOP; this.slow = 0.55; this.lastResult = perfect ? '一閃' : '斬';
    this.combo = simT - this.comboT < 8 ? this.combo + 1 : 1; this.comboT = simT;
    const h = tmp.set(P.vel.x, 0, P.vel.z); if (h.lengthSq() < 1) h.copy(fwd); h.normalize();
    const rx = -h.z, rz = h.x; // to the rider's right
    // the board goes past beside the figure, not into it
    this.dashFrom.copy(P.pos); this.dashTo.set(e.pos.x + rx * this.side * PASS_OFF + h.x * 16, P.pos.y, e.pos.z + rz * this.side * PASS_OFF + h.z * 16); this.dashT = 0;
    P.yaw = Math.atan2(h.x, h.z); fwd.set(h.x, 0, h.z);
    const sp = Math.max(Math.hypot(P.vel.x, P.vel.z), KAMAE_V) + (perfect ? 34 : 24);
    P.vel.set(h.x * sp, 0, h.z * sp); P.flow = Math.min(1, P.flow + (perfect ? 0.4 : 0.25)); P.invuln = 1.0;
    P.hull = Math.min(3, P.hull + 1); P.souls += perfect ? 3 : 1; store.set('ukiyo.souls', P.souls);
    killIjin(e, perfect);
    // the mie: a low side camera on the point between the rider and the figure, where there is open air
    this.mie = 1; this.mieDist = 9; this.mieC.copy(P.pos).lerp(e.pos, 0.5); let pick = null;
    const C = this.mieC;
    for (const sd of [-this.side, this.side]) for (const dd of [9, 7, 5]) {
      if (pick) break; const a = P.yaw + sd * 1.45, x = C.x + Math.sin(a) * dd, z = C.z + Math.cos(a) * dd;
      if (pointFree(x, z, e.pos.y + 1.5) && pointFree((x + C.x) / 2, (z + C.z) / 2, e.pos.y + 1.5)) pick = [a, dd];
    }
    if (pick) { this.mieYaw = pick[0]; this.mieDist = pick[1]; } else { this.mieYaw = P.yaw + Math.PI; this.mieDist = 6; }
    // the slash across the frame: a steep diagonal through the figure
    tmp2.copy(e.pos); tmp2.y += 2; tmp2.project(camera);
    const cx = tmp2.x * 0.5 + 0.5, cy = tmp2.y * 0.5 + 0.5, asp = innerWidth / innerHeight;
    post.uniforms.uRadC.value.set(cx, cy);
    const ang = (Math.random() < 0.5 ? 1 : -1) * (0.45 + Math.random() * 0.35);
    post.uniforms.uSlash.value.set(ang, ((cx - 0.5) * asp) * -Math.sin(ang) + (cy - 0.5) * Math.cos(ang), 0);
    this.split = 0; this.slashK = 0;
    stamp(this.lastResult, perfect, this.combo); maku(perfect);
    sfx.strike(perfect); sfx.tsuke(perfect); buzz(perfect ? [30, 40, 120] : [25, 30, 80]);
    RIG.blade.visible = true; setTimeout(() => { RIG.blade.visible = false; }, 900);
    fxCrescent(perfect);
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
    if (this.freeze > 0) { this.freeze -= dtReal; this.timeScale = 0; }
    else if (this.slow > 0) { this.slow -= dtReal; this.timeScale = lerp(1, 0.3, smooth(0, 0.35, this.slow)); }
    else this.timeScale = this.state === 'kamae' ? lerp(0.9, 0.5, this.near) : 1;
    if (this.dashT >= 0 && this.freeze <= 0) {
      this.dashT += dtReal / 0.1; const u = Math.min(1, this.dashT);
      P.pos.x = lerp(this.dashFrom.x, this.dashTo.x, u); P.pos.z = lerp(this.dashFrom.z, this.dashTo.z, u);
      if (u >= 1) this.dashT = -1;
    }
    if (this.state === 'kamae') {
      this.t += dtReal;
      if (!this.target || !this.target.alive || this.t % 0.25 < dtReal) this.pick();
      if (P.stagger > 0 || P.dead) this.cancel(false);
    }
    this.mie = Math.max(0, this.mie - dtReal / (this.freeze > 0 ? 1e9 : 0.6));
    const u = post.uniforms;
    // the frame: the stroke is drawn at once, the picture is cut in two partway through the hold, then knits back
    if (this.freeze > 0) {
      const k = 1 - this.freeze / this.freeze0;
      this.slashK = smooth(0, 0.12, k); this.split = smooth(0.45, 0.6, k);
    } else { this.slashK = Math.max(0, this.slashK - dtReal * 3); this.split = Math.max(0, this.split - dtReal * 3.5); }
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
// the board's own steering in the stance: aim to pass close beside the figure, calm the lean
function kamaeSteer(dt) {
  const e = IAI.target; if (!e || !e.alive) return;
  let dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z; const d = Math.hypot(dx, dz);
  const rx = -dz / d, rz = dx / d; // perpendicular to the line to the figure
  const ax = dx + rx * IAI.side * PASS_OFF, az = dz + rz * IAI.side * PASS_OFF;
  const dyaw = wrapA(Math.atan2(ax, az) - P.yaw), k = lerp(1.4, 7, smooth(150, 16, d));
  P.yaw += dyaw * (1 - Math.exp(-k * dt));
  P.lean *= Math.exp(-2.5 * dt); P.leanV *= Math.exp(-2.5 * dt);
  const lat = ax * -Math.cos(P.yaw) + az * Math.sin(P.yaw); // to the rider's right
  P.sway = lerp(P.sway, clamp(lat * 1.4, -9, 9), 1 - Math.exp(-3 * dt));
}
// the sword stroke round the rider: a white crescent edged in vermilion that sweeps and lingers
const crescentGeo = new THREE.RingGeometry(2.0, 5.2, 48, 1, -0.2, 2.6), crescentEdge = new THREE.RingGeometry(5.0, 5.6, 48, 1, -0.2, 2.6);
function fxCrescent(perfect) {
  const g = new THREE.Group();
  const m1 = new THREE.Mesh(crescentGeo, new THREE.MeshBasicMaterial({ color: 0xfffdf6, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  const m2 = new THREE.Mesh(crescentEdge, new THREE.MeshBasicMaterial({ color: COL.shu, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  g.add(m1, m2); g.position.copy(P.pos); g.position.y += 1.2; g.rotation.set(-Math.PI / 2 + (IAI.side > 0 ? 0.35 : -0.35), 0, P.yaw + Math.PI * 0.5);
  if (perfect) g.scale.setScalar(1.35);
  g.renderOrder = 8; scene.add(g); slashes.push({ g, t: 0, m: [m1, m2] });
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
