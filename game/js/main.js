// ---------------------------------------------------------------- main: camera, the rider's pose, and the loop
const camDir = new V3(0, 0, 1), camPos = new V3(), camOff = new V3(0, 3, -7), lookSm = new V3(), visN = new V3(0, 1, 0);
const basis = new THREE.Matrix4(), bx = new V3(), bz = new V3(), _look = new V3(), _mie = new V3();
let camBaseY = 0, lookAng = 0, suspY = 0, suspV = 0, kamaeK = 0;
function onPlaced() {
  updateChunks(true, P.pos.x, P.pos.z);
  camDir.copy(fwd); camBaseY = P.pos.y; camOff.set(-fwd.x * S.camDist, 4, -fwd.z * S.camDist); lookAng = 0;
  updateRider(0); resetCape();
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
  camDir.lerp(tmp, 1 - Math.exp(-1.8 * dt)).normalize();
  const ang = Math.atan2(tmp.x, tmp.z) - clamp(P.yawRate, -2, 2) * 0.22, la = Math.atan2(camDir.x, camDir.z);
  lookAng = lerp(lookAng, clamp(wrapA(ang - la), -0.32, 0.32), 1 - Math.exp(-3 * dt));
  // the stance pulls the camera in low behind the rider and turns it to frame the figure
  kamaeK = lerp(kamaeK, IAI.state === 'kamae' ? 1 : 0, 1 - Math.exp(-4 * dt));
  const dist = S.camDist * (1 + sf * 0.12) * (1 - kamaeK * 0.18), height = 4.4 + (P.grounded ? 0 : 1.0) - kamaeK * 1.2;
  tmp2.copy(camDir).multiplyScalar(-dist); tmp2.y = height;
  const swing = clamp(P.yawRate, -2.2, 2.2) * sf * 2.4; tmp2.x += -camDir.z * swing; tmp2.z += camDir.x * swing;
  camOff.lerp(tmp2, 1 - Math.exp(-7 * dt));
  camBaseY += (P.pos.y - camBaseY) * (1 - Math.exp(-12 * dt));
  camPos.set(P.pos.x + camOff.x, camBaseY + camOff.y, P.pos.z + camOff.z);
  const gh = ground(camPos.x, camPos.z, camPos.y).h + 1.2; if (camPos.y < gh) camPos.y = gh;
  const lAng = Math.atan2(camDir.x, camDir.z) + lookAng;
  lookSm.set(P.pos.x + Math.sin(lAng) * 48, camBaseY + 0.9, P.pos.z + Math.cos(lAng) * 48);
  if (IAI.target && kamaeK > 0.01) { _look.copy(IAI.target.pos); _look.y += 2; lookSm.lerp(_look, kamaeK * 0.35); }
  // the mie: on the cut, the camera moves smoothly to the side, holds the pose through the hit-stop, and returns
  const mw = IAI.freeze > 0 ? 1 : smooth(0, 1, IAI.mie);
  if (mw > 0) {
    const C = IAI.mieC;
    _mie.set(C.x + Math.sin(IAI.mieYaw) * IAI.mieDist * 0.7, C.y + 0.6, C.z + Math.cos(IAI.mieYaw) * IAI.mieDist * 0.7);
    camPos.lerp(_mie, mw * 0.6); _look.copy(C); _look.y += 1.5; lookSm.lerp(_look, mw * 0.6);
  }
  camera.position.copy(camPos);
  const rumble = sf * sf * 0.09 + shake;
  if (rumble > 0) { camera.position.x += (Math.random() - 0.5) * rumble; camera.position.y += (Math.random() - 0.5) * rumble; }
  camera.position.y += suspY * 0.18;
  shake = Math.max(0, shake - dt * 1.5);
  camera.lookAt(lookSm);
  camera.rotateZ(clamp(P.yawRate, -2, 2) * 0.05 * sf * (1 - mw * 0.5));
  dashPunch = Math.max(0, dashPunch - dt * 2.2);
  const fov = (portrait ? 70 : 55) + sf * 14 * S.fovKick + dashPunch * 4 - kamaeK * 4 + mw * 2;
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = lerp(camera.fov, fov, 1 - Math.exp(-6 * dt)); applyLens(); }
}
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
  // the board banks with the lean it carries; the rider sinks into the stance
  const lean = (P.lean + P.assistLean) * (P.grounded ? 0.85 : 0.5);
  boardPivot.rotation.z = lerp(boardPivot.rotation.z, lean, 1 - Math.exp(-6 * dt));
  boardPivot.rotation.x = lerp(boardPivot.rotation.x, P.grounded ? (P.tuck ? 0.04 : 0) : clamp(-P.vel.y * 0.02, -0.3, 0.3), 1 - Math.exp(-8 * dt));
  landSquash = lerp(landSquash, 0, 1 - Math.exp(-7 * dt));
  const crouch = (P.tuck ? 0.14 : 0) + kamaeK * 0.2 + Math.max(0, landSquash) * 0.6;
  RIG.rider.scale.y = lerp(RIG.rider.scale.y, 1 - crouch, 1 - Math.exp(-12 * dt));
  RIG.rider.rotation.z = lerp(RIG.rider.rotation.z, -lean * 0.25 + kamaeK * 0.12, 1 - Math.exp(-5 * dt));
  RIG.rider.rotation.y = lerp(RIG.rider.rotation.y, -clamp(lean, -1, 1) * 0.2, 1 - Math.exp(-3 * dt));
  // the right hand goes to the hilt in the stance; after the cut it is out wide with the blade
  const cut = swing.visible ? 1 : 0;
  RIG.armR.rotation.x = lerp(RIG.armR.rotation.x, cut ? -1.9 : kamaeK * 0.9, 1 - Math.exp(-(cut ? 30 : 10) * dt));
  RIG.armR.rotation.z = lerp(RIG.armR.rotation.z, cut ? -1.2 : kamaeK * -0.5, 1 - Math.exp(-(cut ? 30 : 10) * dt));
  RIG.armL.rotation.x = lerp(RIG.armL.rotation.x, 0.25 + kamaeK * 0.5, 1 - Math.exp(-8 * dt));
  RIG.glow.material.opacity = 0.35 + sf * 0.5;
  RIG.glow.scale.setScalar(1.8 + sf * 1.4);
  updateCape(dt, P.vel);
}
let last = performance.now(), visT = 0, ambT = 12;
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
    sfx.update(Math.hypot(P.vel.x, P.vel.z), IAI.state === 'kamae', IAI.slow > 0);
    U.uTime.value += dt;
    // far sounds of an empty city: a temple bell now and then, higurashi at dusk and dawn
    ambT -= dtReal; if (ambT <= 0) { ambT = 22 + Math.random() * 30; if (Math.random() < 0.45) sfx.bell(); else if (moodPhase < 0.9 || (moodPhase > 1.9 && moodPhase < 2.9)) sfx.higurashi(); }
    updateRider(dt);
    if (LM.wheel) LM.wheel.rotation.z += dt * 0.03;
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
