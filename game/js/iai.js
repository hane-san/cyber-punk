// ---------------------------------------------------------------- iai: the stance and the single cut
// Hold the screen still: the rider takes the stance (構え). The board slows toward KAMAE_V and steers itself in
// onto the masked figure ahead, correcting the line as the distance closes. The figure reads the approach and winds
// up; its brush ring closes and turns gold, and a tsuzumi sounds (ポン). Let go inside that last instant and the cut
// lands: hit-stop, the frame turns to sumi and vermilion, and the board goes through. Let go early and the blade is
// turned aside (弾かれ); hold too long and the naginata comes down on you.
const KAMAE_V = 26, REACH = 26, HITSTOP = 0.17, HITSTOP_P = 0.24;
const IAI = {
  state: 'none', target: null, t: 0, timeScale: 1, freeze: 0, slow: 0, dashFrom: new V3(), dashTo: new V3(), dashT: -1,
  mie: 0, mieYaw: 0, lastResult: '', combo: 0, comboT: 0,
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
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d > 220 || d < 3) continue;
      const a = Math.abs(wrapA(Math.atan2(dx, dz) - P.yaw)); if (a > 0.95) continue;
      if (Math.abs(e.pos.y - P.pos.y) > 8) continue;
      const sc = d * (1 + a * 1.6); if (sc < bs) { bs = sc; best = e; }
    }
    if (this.target && this.target !== best) this.target.locked = false;
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
    if (d < REACH + 10 && (e.state === 'windup' || e.state === 'idle')) { this.parried(e); return; }
    sfx.noto(); // too far: the blade goes back into the scabbard
  },
  strike(e, perfect) {
    this.freeze = perfect ? HITSTOP_P : HITSTOP; this.slow = 0.45; this.lastResult = perfect ? '一閃' : '斬';
    this.combo = simT - this.comboT < 6 ? this.combo + 1 : 1; this.comboT = simT;
    // the cut carries the board through and a little past the figure
    const h = tmp.set(e.pos.x - P.pos.x, 0, e.pos.z - P.pos.z).normalize();
    this.dashFrom.copy(P.pos); this.dashTo.set(e.pos.x + h.x * 10, P.pos.y, e.pos.z + h.z * 10); this.dashT = 0;
    P.yaw = Math.atan2(h.x, h.z); fwd.set(h.x, 0, h.z);
    const sp = Math.max(Math.hypot(P.vel.x, P.vel.z), KAMAE_V) + (perfect ? 22 : 15);
    P.vel.set(h.x * sp, 0, h.z * sp); P.flow = Math.min(1, P.flow + (perfect ? 0.35 : 0.22)); P.invuln = 0.9;
    P.hull = Math.min(3, P.hull + 1); P.souls += perfect ? 3 : 1; store.set('ukiyo.souls', P.souls);
    killIjin(e, perfect);
    // the frame: mie camera from the side, sumi and vermilion, focus lines on the figure
    // the side camera goes where there is open air: try both sides, nearer if walls are close
    this.mie = 1; this.mieDist = 7.5; let pick = null;
    for (const sd of Math.random() < 0.5 ? [1, -1] : [-1, 1]) for (const dd of [7.5, 5, 3.5]) {
      if (pick) break; const a = P.yaw + sd * 1.35, x = e.pos.x + Math.sin(a) * dd, z = e.pos.z + Math.cos(a) * dd;
      if (pointFree(x, z, e.pos.y + 1.5) && pointFree((x + e.pos.x) / 2, (z + e.pos.z) / 2, e.pos.y + 1.5)) pick = [a, dd];
    }
    if (pick) { this.mieYaw = pick[0]; this.mieDist = pick[1]; } else { this.mieYaw = P.yaw + Math.PI; this.mieDist = 6; }
    tmp2.copy(e.pos); tmp2.y += 2; tmp2.project(camera); post.uniforms.uRadC.value.set(tmp2.x * 0.5 + 0.5, tmp2.y * 0.5 + 0.5);
    stamp(this.lastResult, perfect, this.combo);
    sfx.strike(perfect); buzz(perfect ? [30, 40, 90] : [25, 30, 60]);
    RIG.blade.visible = true; setTimeout(() => { RIG.blade.visible = false; }, 650);
    fxSlash(e.pos, perfect);
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
    // time: freeze for the hit-stop, then a short slow, and a held breath while in the stance
    if (this.freeze > 0) { this.freeze -= dtReal; this.timeScale = 0; }
    else if (this.slow > 0) { this.slow -= dtReal; this.timeScale = lerp(1, 0.28, smooth(0, 0.3, this.slow)); }
    else this.timeScale = this.state === 'kamae' ? 0.86 : 1;
    if (this.dashT >= 0 && this.freeze <= 0) {
      this.dashT += dtReal / 0.09; const u = Math.min(1, this.dashT);
      P.pos.x = lerp(this.dashFrom.x, this.dashTo.x, u); P.pos.z = lerp(this.dashFrom.z, this.dashTo.z, u);
      if (u >= 1) this.dashT = -1;
    }
    if (this.state === 'kamae') {
      this.t += dtReal;
      if (!this.target || !this.target.alive || this.t % 0.25 < dtReal) this.pick();
      if (P.stagger > 0 || P.dead) this.cancel(false);
    }
    this.mie = Math.max(0, this.mie - dtReal / (this.freeze > 0 ? 1e9 : 0.55));
    const u = post.uniforms;
    u.uMono.value = this.freeze > 0 ? 1 : Math.max(0, u.uMono.value - dtReal * 4);
    u.uRadial.value = this.freeze > 0 ? 1 : Math.max(0, u.uRadial.value - dtReal * 3);
    u.uFocus.value = lerp(u.uFocus.value, this.state === 'kamae' ? 1 : 0, 1 - Math.exp(-(this.state === 'kamae' ? 3 : 8) * dtReal));
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
// the board's own steering in the stance: aim at the figure, close the lateral gap, calm the lean
function kamaeSteer(dt) {
  const e = IAI.target; if (!e || !e.alive) return;
  const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
  const dyaw = wrapA(Math.atan2(dx, dz) - P.yaw), k = lerp(1.4, 7, smooth(150, 16, d));
  P.yaw += dyaw * (1 - Math.exp(-k * dt));
  P.lean *= Math.exp(-2.5 * dt); P.leanV *= Math.exp(-2.5 * dt);
  const lat = dx * -Math.cos(P.yaw) + dz * Math.sin(P.yaw); // to the rider's right
  P.sway = lerp(P.sway, clamp(lat * 1.4, -9, 9), 1 - Math.exp(-3 * dt));
}
function fxSlash(pos, perfect) {
  // a white stroke across the figure, drawn in the world so it sits in the picture
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.slash, transparent: true, depthWrite: false, depthTest: false, rotation: (Math.random() - 0.5) * 0.8 + (Math.random() < 0.5 ? 0.35 : -0.35) }));
  s.position.copy(pos); s.position.y += 2.2; s.scale.set(perfect ? 26 : 20, perfect ? 3.2 : 2.4, 1); s.renderOrder = 9; scene.add(s);
  slashes.push({ s, t: 0 });
}
const slashes = [];
function updateSlashes(dt) { for (let i = slashes.length - 1; i >= 0; i--) { const q = slashes[i]; q.t += dt; q.s.material.opacity = 1 - smooth(0.25, 0.7, q.t); q.s.scale.x *= 1 + dt * 0.6; if (q.t > 0.7) { scene.remove(q.s); slashes.splice(i, 1); } } }

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
