// ---------------------------------------------------------------- ui: input, HUD, cartouche, stamp, the map and the sheets
let started = false, paused = false;
const toastEl = $('#toast');
let toastTimer = 0;
function toast(t, sub = '', ms = 1600) {
  toastEl.innerHTML = ''; toastEl.append(t); if (sub) { const s = document.createElement('small'); s.textContent = sub; toastEl.append(s); }
  toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
}
const KANJI_NUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function kanjiNum(n) {
  if (n < 10) return KANJI_NUM[n];
  if (n < 100) { const t = Math.floor(n / 10), o = n % 10; return (t > 1 ? KANJI_NUM[t] : '') + '十' + (o ? KANJI_NUM[o] : ''); }
  return String(n).split('').map((d) => KANJI_NUM[+d]).join('');
}
function stamp(text, perfect, combo) {
  const el = $('#stamp'), ch = $('#stampCh');
  ch.textContent = text; ch.classList.toggle('long', text.length > 1);
  $('#stampSeal').textContent = combo > 1 ? `${kanjiNum(combo)}連` : perfect ? '見事' : '御免';
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
}

function maku(perfect) { const el = $('#maku'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }

// ---- HUD
const spdEl = $('#spd'), sealEls = [...document.querySelectorAll('#seals i')], soulsEl = $('#souls');
let hudSouls = -1;
function updateHud() {
  spdEl.textContent = Math.round(Math.hypot(P.vel.x, P.vel.z) * 3.6);
  sealEls.forEach((s, i) => s.classList.toggle('off', i >= P.hull));
  if (hudSouls !== P.souls) { hudSouls = P.souls; soulsEl.textContent = `魂 ${kanjiNum(P.souls)}`; }
}
// the cartouche: when a district clearly takes over, its title slip comes down
let cartCur = -2, cartHold = 0, cartTimer = 0;
function updateCartouche(dt) {
  const d = distAt(P.pos.x, P.pos.z), w = distWAt(P.pos.x, P.pos.z);
  if (d !== cartCur && (d < 0 || w > 0.5)) { cartHold += dt; if (cartHold > 0.7) { cartCur = d; cartHold = 0; if (d >= 0) showCart(DISTRICTS[d].name, DISTRICTS[d].sub); } }
  else cartHold = 0;
}
function showCart(name, sub) {
  $('#cartName').textContent = name; $('#cartSub').textContent = sub || ''; $('#cartSub').hidden = !sub;
  const el = $('#cart'); el.classList.add('on'); clearTimeout(cartTimer); cartTimer = setTimeout(() => el.classList.remove('on'), 4200);
}

// ---- input: drag to steer (the Wind Lover stick); hold still to take the stance; let go to cut
const stickEl = $('#stick'), knobEl = $('#knob'), ensEl = $('#ens'), ensC = ensEl.querySelector('circle');
const HOLD_T = 0.32, HOLD_R = 16, STICK_R = 54;
let tp = null; // { id, x0, y0, x, y, still, t0 }
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!started || paused || tp) return;
  sfx.resume();
  tp = { id: e.pointerId, x0: e.clientX, y0: e.clientY, still: 0, moved: false };
  stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px'; stickEl.classList.add('on'); knobEl.style.transform = 'translate(0,0)';
  ensEl.style.left = e.clientX + 'px'; ensEl.style.top = e.clientY + 'px';
});
window.addEventListener('pointermove', (e) => {
  if (!tp || e.pointerId !== tp.id) return;
  let dx = e.clientX - tp.x0, dy = e.clientY - tp.y0; const l = Math.hypot(dx, dy);
  if (l > HOLD_R) { tp.still = 0; tp.moved = true; }
  if (l > STICK_R) { dx *= STICK_R / l; dy *= STICK_R / l; }
  inp.jx = dx / STICK_R; inp.jy = -dy / STICK_R;
  knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
});
const endTouch = (e) => {
  if (!tp || e.pointerId !== tp.id) return;
  tp = null; inp.jx = 0; inp.jy = 0; stickEl.classList.remove('on'); ensEl.classList.remove('show', 'full'); ensC.style.strokeDashoffset = 280;
  if (IAI.state === 'kamae') IAI.release();
};
window.addEventListener('pointerup', endTouch); window.addEventListener('pointercancel', endTouch);
// called every frame: a finger held near where it landed draws the ensō; when it closes, the stance is taken
function updateTouch(dtReal) {
  if (!tp || IAI.state === 'kamae') return;
  const off = Math.hypot(inp.jx, inp.jy) * STICK_R;
  // a finger that has been steering must come back to the centre to take the stance
  if (off < (tp.moved ? 8 : HOLD_R)) { tp.still += dtReal; ensEl.classList.add('show'); ensC.style.strokeDashoffset = 280 * (1 - clamp(tp.still / HOLD_T, 0, 1)); }
  else { tp.still = 0; ensEl.classList.remove('show'); }
  if (tp.still >= HOLD_T) { ensEl.classList.add('full'); IAI.begin(); }
}
const keyAxis = () => {
  const k = inp.keys;
  inp.kx = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0);
  inp.ky = ((k.KeyW || k.ArrowUp) ? 1 : 0) - ((k.KeyS || k.ArrowDown) ? 1 : 0);
};
window.addEventListener('keydown', (e) => {
  if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); return; }
  inp.keys[e.code] = true; keyAxis();
  if (e.code === 'Space') { e.preventDefault(); if (started && !paused) { sfx.resume(); IAI.begin(); } }
  if (e.code === 'Enter' && !started) $('#btnGo').click();
  if (e.code === 'Escape' && started) togglePause();
});
window.addEventListener('keyup', (e) => { inp.keys[e.code] = false; keyAxis(); if (e.code === 'Space' && IAI.state === 'kamae') IAI.release(); });
window.addEventListener('blur', () => { inp.keys = {}; keyAxis(); store.set('ukiyo.dist', P.dist); });

// ---- the map (東京絵図): drawn once as an old printed map, the rider marked on top
const mapCv = $('#mapCv'), mapG = mapCv.getContext('2d');
let mapBase = null;
const MW = mapCv.width, MH = mapCv.height, mapS = Math.min(MW / (WORLD.x1 - WORLD.x0), MH / (WORLD.z1 - WORLD.z0));
const mx = (x) => (x - WORLD.x0) * mapS, mz = (z) => (z - WORLD.z0) * mapS;
function drawMapBase() {
  const c = document.createElement('canvas'); c.width = MW; c.height = MH; const g = c.getContext('2d');
  g.fillStyle = '#efe3c8'; g.fillRect(0, 0, MW, MH);
  // the bay: below the coast, minus the islands
  g.fillStyle = '#9fb6c9'; g.beginPath(); g.moveTo(0, mz(coastZ(WORLD.x0)));
  for (let x = WORLD.x0; x <= WORLD.x1; x += 200) g.lineTo(mx(x), mz(coastZ(x)));
  g.lineTo(MW, MH); g.lineTo(0, MH); g.closePath(); g.fill();
  g.fillStyle = '#efe3c8'; g.strokeStyle = '#1d1b20'; g.lineWidth = 1;
  for (const I of ISLANDS) { const x0 = mx(I.x - I.hw), z0 = mz(I.z - I.hd), w = I.hw * 2 * mapS, h = I.hd * 2 * mapS, r = I.r * mapS; g.beginPath(); g.roundRect ? g.roundRect(x0, z0, w, h, r) : g.rect(x0, z0, w, h); g.fill(); g.stroke(); }
  // seigaiha in the bay
  g.strokeStyle = 'rgba(35, 70, 110, 0.35)'; g.lineWidth = 1;
  for (let y = 0; y < MH; y += 9) for (let x = (y / 9) % 2 ? 0 : 9; x < MW; x += 18) { const wx = x / mapS + WORLD.x0, wz = y / mapS + WORLD.z0; if (site(wx, wz).sd > -40) continue; g.beginPath(); g.arc(x, y, 8, Math.PI, 0); g.stroke(); }
  // parks and the palace
  for (const D of DISTRICTS) if (D.kind === 'park' || D.kind === 'palace') { g.fillStyle = D.kind === 'park' ? 'rgba(110, 140, 80, 0.45)' : 'rgba(150, 160, 110, 0.4)'; g.beginPath(); g.arc(mx(D.x), mz(D.z), D.r * mapS * 0.8, 0, TAU); g.fill(); }
  // rivers, roads, expressways
  const line = (p, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i < p.n; i += 3) { const X = mx(p.x[i]), Z = mz(p.z[i]); i ? g.lineTo(X, Z) : g.moveTo(X, Z); } g.lineTo(mx(p.x[p.n - 1]), mz(p.z[p.n - 1])); g.stroke(); };
  for (const p of PATHS) if (p.kind === 'river') line(p, '#6f93b5', Math.max(1.5, p.half * 2 * mapS));
  for (const p of PATHS) if (p.kind === 'art' || p.kind === 'path') line(p, 'rgba(29, 27, 32, 0.55)', p.kind === 'path' ? 1 : 1.6);
  for (const p of PATHS) if (p.kind === 'exp') line(p, '#d9472b', 2.2);
  // districts in vertical script, landmarks as small vermilion marks
  g.fillStyle = '#1d1b20'; g.textAlign = 'center'; g.textBaseline = 'top';
  for (const D of DISTRICTS) {
    const fs = D.r > 800 ? 17 : 13; g.font = `700 ${fs}px ${FONT_MIN}`;
    const chars = [...D.name]; chars.forEach((ch, k) => g.fillText(ch, mx(D.x), mz(D.z) - chars.length * fs * 0.5 + k * fs));
  }
  g.fillStyle = '#d9472b';
  for (const L of LANDMARKS) { g.beginPath(); g.arc(mx(L.x), mz(L.z), 3, 0, TAU); g.fill(); }
  g.font = `400 13px ${FONT_BRUSH}`; g.fillStyle = '#23466e'; g.fillText('東京湾', mx(1500), mz(8000));
  g.strokeStyle = '#1d1b20'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, MW - 3, MH - 3);
  // the title slip
  g.fillStyle = '#efe3c8'; g.fillRect(MW - 46, 12, 34, 120); g.strokeStyle = '#d9472b'; g.lineWidth = 2; g.strokeRect(MW - 46, 12, 34, 120);
  g.fillStyle = '#1d1b20'; g.font = `400 22px ${FONT_BRUSH}`; [...'東京絵図'].forEach((ch, k) => g.fillText(ch, MW - 29, 20 + k * 26));
  mapBase = c;
}
function drawMap() {
  if (!mapBase) drawMapBase();
  mapG.drawImage(mapBase, 0, 0);
  const X = mx(P.pos.x), Z = mz(P.pos.z);
  mapG.save(); mapG.translate(X, Z); mapG.rotate(-P.yaw + Math.PI);
  mapG.fillStyle = '#d9472b'; mapG.strokeStyle = '#1d1b20'; mapG.lineWidth = 1.5;
  mapG.beginPath(); mapG.moveTo(0, -11); mapG.lineTo(7, 8); mapG.lineTo(0, 4); mapG.lineTo(-7, 8); mapG.closePath(); mapG.fill(); mapG.stroke(); mapG.restore();
  const d = distAt(P.pos.x, P.pos.z); $('#mapWhere').textContent = d >= 0 ? `いま ${DISTRICTS[d].name}` : 'いま 町なか';
}

// ---- sheets
const TIMES = ['移ろう', '夕', '宵', '暁', '霞', '昼'];
function refreshMenu() {
  $('#mTime').textContent = `時刻：${TIMES[moodFix + 1]}`; $('#mSound').textContent = `音：${sfx.on ? 'あり' : 'なし'}`; $('#mThreat').textContent = `妖：${threatOn ? '出る' : '出ない'}`;
  $('#recDist').textContent = (P.dist / 1000).toFixed(1); $('#recSouls').textContent = P.souls;
}
function togglePause(force) {
  paused = force !== undefined ? force : !paused;
  $('#menuSheet').hidden = !paused;
  if (paused) { refreshMenu(); drawMap(); if (IAI.state === 'kamae') IAI.cancel(false); }
}
$('#btnMenu').addEventListener('click', () => togglePause());
$('#mClose').addEventListener('click', () => togglePause(false));
$('#mTime').addEventListener('click', () => { moodFix = moodFix >= 4 ? -1 : moodFix + 1; store.set('ukiyo.mood3', moodFix); refreshMenu(); });
$('#mSound').addEventListener('click', () => { sfx.toggle(); refreshMenu(); });
$('#mThreat').addEventListener('click', () => { threatOn = !threatOn; store.set('ukiyo.threat', threatOn); if (!threatOn) { for (const f of forms) if (f.mode !== 'pass') f.done = true; for (const e of ijins) e.alive = false, e.deadT = 9; } refreshMenu(); });
$('#mHome').addEventListener('click', () => { placeStart(); togglePause(false); });
$('#mRandom').addEventListener('click', () => { const r = randomRoad(); placeAt(r.x, r.z, r.yaw, S.cruise); togglePause(false); });
function showOver(cause) {
  $('#overCause').textContent = cause; $('#overText').textContent = `${(P.dist / 1000).toFixed(1)} km を走り、魂を${kanjiNum(P.souls)}つ集めた。`;
  $('#overSheet').hidden = false; paused = true;
}
$('#overRetry').addEventListener('click', () => { $('#overSheet').hidden = true; paused = false; revive(); const r = roadNear(P.pos.x, P.pos.z, P.pos.y, P.yaw); if (r) placeAt(r.cx, r.cz, P.yaw, S.cruise * 0.5); });
$('#overHome').addEventListener('click', () => { $('#overSheet').hidden = true; paused = false; revive(); placeStart(); });
function begin(random) {
  sfx.resume();
  $('#startSheet').hidden = true; $('#hud').hidden = false; $('#btnMenu').hidden = false;
  started = true;
  if (random) { const r = randomRoad(); placeAt(r.x, r.z, r.yaw, S.cruise); } else placeStart();
  sfx.hyoshigi();
  const hint = $('#hint'); hint.hidden = false;
  hint.innerHTML = isTouch ? 'なぞって曲がる ／ 指を止めて長押しで構え ／ 鼓の「ポン」で離して一閃' : '矢印で走る ／ スペース長押しで構え ／ 鼓の「ポン」で離して一閃';
  setTimeout(() => { hint.style.opacity = 0; }, 8000);
  setTimeout(() => { const d = distAt(P.pos.x, P.pos.z); if (d >= 0) showCart(DISTRICTS[d].name, DISTRICTS[d].sub); cartCur = d; }, 600);
}
$('#btnGo').addEventListener('click', () => begin(false));
$('#btnRandom').addEventListener('click', () => begin(true));
