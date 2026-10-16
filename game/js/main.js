// ---------------------------------------------------------------- main: camera, the rider's pose, and the loop
const camDir = new V3(0, 0, 1), camPos = new V3(), camOff = new V3(0, 3, -7), lookSm = new V3(), visN = new V3(0, 1, 0);
const basis = new THREE.Matrix4(), bx = new V3(), bz = new V3(), _look = new V3(), _mie = new V3();
let camBaseY = 0, lookAng = 0, suspY = 0, suspV = 0, kamaeK = 0, brakeSm = 0, swordK = 0, sparkAcc = 0;
const camFol = new V3(); // the point the camera follows: the rider, eased only through the step-in of a cut
function onPlaced() {
  updateChunks(true, P.pos.x, P.pos.z); skySnap = true;
  camDir.copy(fwd); camBaseY = P.pos.y; camFol.copy(P.pos); camOff.set(-fwd.x * S.camDist, 4, -fwd.z * S.camDist); lookAng = 0;
  updateRider(0); resetCape(); resetTrail();
}
function updateCamera(dt) {
  const speed = P.vel.length(), sf = clamp(speed / S.maxSpeed, 0, 1), portrait = camera.aspect < 1;
  if (!started) {
    // the title: a slow turn over Nihonbashi toward the Ginza lights
    const a = U.uTime.value * 0.05, cx = START.x, cz = START.z + 120, gh = terrainH(cx, cz);
    camera.position.set(cx + Math.cos(a) * 140, gh + 46, cz + Math.sin(a) * 140); camera.lookAt(cx, gh + 22, cz);
    return;
  }
  tmp.set(P.vel.x, 0, P.vel.z);
  if (tmp.lengthSq() > 9) tmp.normalize(); else tmp.copy(fwd);
  tmp.lerp(fwd, 0.2).normalize();
  // through the step-in and the hit-stop the camera holds its heading and eases after the rider, so the cut never
  // yanks the view; it simply carries on with the ride
  const cutting = IAI.phase === 'in' || IAI.phase === 'hold';
  if (!cutting) {
    camDir.lerp(tmp, 1 - Math.exp(-1.8 * dt)).normalize();
    const ang = Math.atan2(tmp.x, tmp.z) - clamp(P.yawRate, -2, 2) * 0.22, la = Math.atan2(camDir.x, camDir.z);
    lookAng = lerp(lookAng, clamp(wrapA(ang - la), -0.32, 0.32), 1 - Math.exp(-3 * dt));
  }
  camFol.lerp(P.pos, 1 - Math.exp(-(cutting || IAI.phase === 'out' ? 7 : 80) * dt));
  // concentration mode and the cut no longer move the camera. The ride stays continuous;
  // the change is signalled by colour (focus, mono, flash) and sound.
  kamaeK = lerp(kamaeK, IAI.state === 'kamae' ? 1 : 0, 1 - Math.exp(-4 * dt));
  const dist = S.camDist * (1 + sf * 0.12), height = 4.4 + (P.grounded ? 0 : 1.0);
  tmp2.copy(camDir).multiplyScalar(-dist); tmp2.y = height;
  const swing = clamp(P.yawRate, -2.2, 2.2) * sf * 2.4; tmp2.x += -camDir.z * swing; tmp2.z += camDir.x * swing;
  camOff.lerp(tmp2, 1 - Math.exp(-7 * dt));
  camBaseY += (P.pos.y - camBaseY) * (1 - Math.exp(-12 * dt));
  camPos.set(camFol.x + camOff.x, camBaseY + camOff.y, camFol.z + camOff.z);
  const gh = ground(camPos.x, camPos.z, camPos.y).h + 1.2; if (camPos.y < gh) camPos.y = gh;
  const lAng = Math.atan2(camDir.x, camDir.z) + lookAng;
  lookSm.set(camFol.x + Math.sin(lAng) * 48, camBaseY + 0.9, camFol.z + Math.cos(lAng) * 48);
  // no target framing, no side mie camera — position stays on the normal ride path
  camera.position.copy(camPos);
  const rumble = sf * sf * 0.09 + shake;
  if (rumble > 0) { camera.position.x += (Math.random() - 0.5) * rumble; camera.position.y += (Math.random() - 0.5) * rumble; }
  camera.position.y += suspY * 0.18;
  shake = Math.max(0, shake - dt * 1.5);
  camera.lookAt(lookSm);
  // gentle roll into turns; reduced slightly in concentration so the horizon stays readable while the assist steers
  const rollK = IAI.state === 'kamae' ? 0.35 : 1;
  camera.rotateZ(clamp(clamp(P.yawRate, -2, 2) * 0.022 * sf, -0.045, 0.045) * rollK);
  dashPunch = Math.max(0, dashPunch - dt * 2.2);
  const fov = (portrait ? 70 : 55) + sf * 14 * S.fovKick + dashPunch * 4;
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = lerp(camera.fov, fov, 1 - Math.exp(-6 * dt)); applyLens(); }
}
const _gB = new THREE.Color(), _gP = new V3(), _gV = new V3();
function updateRider(dt) {
  const speed = P.vel.length(), sf = clamp(speed / S.maxSpeed, 0, 1);
  visN.lerp(P.grounded ? P.n : UP, 1 - Math.exp(-10 * Math.max(dt, 0.001))).normalize();
  bz.set(Math.sin(P.yaw), 0, Math.cos(P.yaw)); bz.addScaledVector(visN, -bz.dot(visN)).normalize();
  bx.crossVectors(visN, bz).normalize(); basis.makeBasis(bx, visN, bz);
  player.quaternion.setFromRotationMatrix(basis);
  if (P.grounded && dt > 0) { const rough = P.onRoad ? 0.012 : P.onWater ? 0.006 : 0.07; suspV += ((vnoise(P.dist / 2.4, 0.5, 91) - 0.5) * rough * (0.3 + sf) * 40 - 150 * suspY - 13 * suspV) * dt; }
  else if (dt > 0) suspV += (-150 * (suspY - 0.1) - 13 * suspV) * dt;
  suspY = clamp(suspY + suspV * dt, -0.4, 0.3);
  player.position.copy(P.pos).addScaledVector(UP, -HOVER + 0.15 + suspY);
  // two holds, two bodies. Braking (no lock): the board is kicked sideways into a skid, the rider leans back with
  // his arms out, and the tail throws sparks. Locked: the board straightens, he drops low, turns his chest to the
  // figure, left hand on the scabbard and right hand on the hilt, and the board's glow goes white.
  brakeSm = lerp(brakeSm, P.kamae ? Math.max(P.brakeK, 0.4) : 0, 1 - Math.exp(-8 * dt));
  swordK = lerp(swordK, P.kamae && IAI.lockK > 0.5 ? 1 : 0, 1 - Math.exp(-10 * dt));
  const bp = brakeSm * (1 - swordK), sw = swordK;
  // the board banks with the lean it carries, and leans into a crab-walk
  const lean = (P.lean + P.assistLean) * (P.grounded ? 0.85 : 0.5) + (P.kamae ? -P.sway * 0.025 : 0);
  boardPivot.rotation.z = lerp(boardPivot.rotation.z, lean, 1 - Math.exp(-6 * dt));
  boardPivot.rotation.y = lerp(boardPivot.rotation.y, bp * 0.85 + sw * 0.1, 1 - Math.exp(-7 * dt));
  boardPivot.rotation.x = lerp(boardPivot.rotation.x, P.grounded ? (P.tuck ? 0.04 : 0) : clamp(-P.vel.y * 0.02, -0.3, 0.3), 1 - Math.exp(-8 * dt));
  landSquash = lerp(landSquash, 0, 1 - Math.exp(-7 * dt));
  const crouch = (P.tuck ? 0.14 : 0) + bp * 0.14 + sw * 0.17 + Math.max(0, landSquash) * 0.6;
  RIG.rider.scale.y = lerp(RIG.rider.scale.y, 1 - crouch, 1 - Math.exp(-12 * dt));
  RIG.rider.rotation.z = lerp(RIG.rider.rotation.z, -lean * 0.25 - bp * 0.45 + sw * 0.12, 1 - Math.exp(-7 * dt));
  RIG.rider.rotation.x = lerp(RIG.rider.rotation.x, -bp * 0.3 + sw * 0.22, 1 - Math.exp(-7 * dt));
  RIG.rider.rotation.y = lerp(RIG.rider.rotation.y, -clamp(lean, -1, 1) * 0.2 - bp * 0.35 + sw * 0.75, 1 - Math.exp(-6 * dt));
  // arms: out for balance in the skid; in the stance the right hand crosses to the hilt and the left grips the
  // scabbard; after the cut the right arm is out wide with the blade
  const cut = swing.visible ? 1 : 0, ka = 1 - Math.exp(-(cut ? 30 : 12) * dt);
  RIG.armR.rotation.x = lerp(RIG.armR.rotation.x, cut ? -1.9 : bp * 1.5 + sw * -0.55, ka);
  RIG.armR.rotation.z = lerp(RIG.armR.rotation.z, cut ? -1.2 : bp * 0.9 + sw * -1.05, ka);
  RIG.armL.rotation.x = lerp(RIG.armL.rotation.x, 0.25 - bp * 1.7 + sw * 0.35, ka);
  RIG.armL.rotation.z = lerp(RIG.armL.rotation.z, bp * 1.2 + sw * -0.5, ka);
  // the sword is drawn up to the hip, hilt forward, ready
  RIG.sword.rotation.x = lerp(RIG.sword.rotation.x, 0.35 + sw * 1.0, ka); RIG.sword.rotation.z = lerp(RIG.sword.rotation.z, 0.25 - sw * 0.35, ka);
  RIG.glow.material.opacity = 0.35 + sf * 0.5 + sw * 0.35;
  RIG.glow.scale.setScalar(1.8 + sf * 1.4 + sw * (1.6 + Math.sin(U.uTime.value * 9) * 0.3) + bp * 0.8);
  RIG.glow.material.color.setHex(COL.asagi).lerp(_gB.setHex(COL.shu), bp * 0.85).lerp(_gB.setHex(0xfff6e0), sw * 0.9);
  // sparks off the tail of the skid
  if (P.kamae && P.grounded && bp > 0.2 && dt > 0) {
    sparkAcc += dt * 70 * bp * clamp(speed / 25, 0.3, 1);
    while (sparkAcc > 1) {
      sparkAcc--; const q = _gP.set((Math.random() - 0.5) * 0.5, -0.05, -0.85 - Math.random() * 0.2); boardPivot.localToWorld(q);
      fxAdd(FXA, 'spark', q, _gV.set((Math.random() - 0.5) * 6 - Math.cos(P.yaw) * 4, 1 + Math.random() * 3, (Math.random() - 0.5) * 6 + Math.sin(P.yaw) * 4).addScaledVector(P.vel, 0.55), 0.25 + Math.random() * 0.2, 0.45, 0.1, { grav: 16, tint: [1, 0.72, 0.4] });
    }
  }
  // the stance's ensō: a sumi ring on the ground round the board, turning slowly
  RIG.ens.material.opacity = sw * 0.85; RIG.ens.visible = sw > 0.02; RIG.ens.rotation.z += dt * 0.8; RIG.ens.scale.setScalar(1 + (1 - sw) * 0.6);
  // the glint on the lock: a flash at the hilt
  if (IAI.glintFx) { IAI.glintFx = false; const q = _gP.set(-0.24, 1.1, 0.4); RIG.rider.localToWorld(q); fxAdd(FXA, 'dot', q, null, 0.3, 0.4, 3.2, { tint: [1, 0.95, 0.8] }); fxAdd(FXA, 'spark', q, null, 0.4, 2.6, 0.2, { tint: [1, 1, 1], rv: 6 }); }
  updateCape(dt, P.vel);
  updateTrail(dt, speed);
}
let last = performance.now(), visT = 0, ambT = 12, fumiT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dtReal = clamp((now - last) / 1000, 0, 0.05); last = now;
  if (started && !paused) {
    updateTouch(dtReal);
    IAI.update(dtReal);
    const dt = dtReal * IAI.timeScale;
    simT += dt;
    if (dt > 0) {
      const sub = clamp(Math.ceil(P.vel.length() * dt / 1.4), dt > 0.022 ? 2 : 1, 5);
      for (let i = 0; i < sub; i++) stepPhysics(dt / sub);
    }
    updateChunks(false, P.pos.x, P.pos.z);
    updateFormations(dt); updateBullets(dt); updateIjins(dt); updateFalling(dt); updateLeaves(dt); updateSlashes(dtReal); updateBooms(dt);
    updateHud(); updateCartouche(dtReal);
    sfx.update(Math.hypot(P.vel.x, P.vel.z), IAI.state === 'kamae' && IAI.lockK > 0.5, IAI.slow > 0, P.kamae ? P.brakeK : 0);
    U.uTime.value += dt;
    // far sounds of an empty city: a temple bell now and then, higurashi at dusk and dawn
    ambT -= dtReal; if (ambT <= 0) { ambT = 22 + Math.random() * 30; if (Math.random() < 0.45) sfx.bell(); else if (moodPhase < 0.9 || (moodPhase > 1.9 && moodPhase < 2.9)) sfx.higurashi(); }
    updateRider(dt);
    if (LM.wheel) LM.wheel.rotation.z += dt * 0.03;
    if (LM.lightBeam) { LM.lightBeam.rotation.y += dt * 0.6; LM.lightBeam.material.opacity = 0.05 + 0.14 * U.uNight.value; }
    // level crossings ring as you come near: kan, kan, kan
    fumiT -= dtReal; if (fumiT <= 0) { fumiT = 0.5; let best = 1e9; for (const c of chunks.values()) for (const q of c.crossings) best = Math.min(best, Math.hypot(q.x - P.pos.x, q.z - P.pos.z)); if (best < 140) sfx.fumikiri(1 - best / 140); }
    fxUpdate(FXN, dt); fxUpdate(FXA, dt);
  } else if (!started) { U.uTime.value += dtReal; }
  updateMood(paused ? 0 : dtReal);
  updateCamera(paused ? 0 : dtReal);
  sky.position.copy(camera.position); farGroup.position.set(camera.position.x, 0, camera.position.z);
  water.position.set(Math.round(camera.position.x / 100) * 100, WATER_Y, Math.round(camera.position.z / 100) * 100);
  post.uniforms.uTime.value = U.uTime.value;
  post.uniforms.uSpeed.value = started ? smooth(34, 95, Math.hypot(P.vel.x, P.vel.z)) * (1 - post.uniforms.uMono.value) * (1 - post.uniforms.uFocus.value * 0.6) : 0;
  if (window.__ukCam) window.__ukCam(camera, player);
  renderFrame();
}
applyLens();
placeStart();
updateMood(0);
requestAnimationFrame(frame);
window.__uk = { P, IAI, ijins, forms, bullets, ground, site, nearestPath, roadNear, PATHS, TOWERS, chunks, spawnIjin, placeIjin, spawnFormation, fwd, get simT() { return simT; }, placeAt, placeStart, updateChunks, U, inp, camera, get started() { return started; }, renderer, scene, post, setMood: (k) => { moodFix = k; moodPhase = k; }, START_POINTS, getStartPoint };
