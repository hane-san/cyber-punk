// ---------------------------------------------------------------- look: renderer, print materials, sky, ink-line post pass
// The picture is made like a woodblock print. Surfaces are flat colour in two or three tones; the sky is a
// graded bokashi with a dark top band; mist (霞) swallows the feet of distant buildings; and a post pass draws
// sumi outlines from depth and colour edges, then lays the image on washi paper.
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
const PR = Math.min(window.devicePixelRatio || 1, LOWQ ? 1.5 : 1.75);
renderer.setPixelRatio(PR);
renderer.setSize(innerWidth, innerHeight);
renderer.autoClear = true;
$('#app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.5, 26000);

// shared uniforms: every print material reads the same light, mist and hour
const U = {
  uSun: { value: new V3(-0.6, 0.3, 0.3).normalize() }, uLight: { value: new THREE.Color(1, 1, 1) }, uShade: { value: new THREE.Color(0.6, 0.62, 0.75) },
  uMist: { value: new THREE.Color(COL.paper) }, uFog: { value: new THREE.Vector2(380, 1250) }, uLowMist: { value: 0.9 },
  uNight: { value: 0.3 }, uTime: { value: 0 },
};
const GL_COMMON = `
uniform vec3 uSun; uniform vec3 uLight; uniform vec3 uShade; uniform vec3 uMist; uniform vec2 uFog; uniform float uLowMist; uniform float uNight; uniform float uTime;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float mistF(vec3 wp, float dist){
  float f = smoothstep(uFog.x, uFog.y, dist);
  // ground mist: the feet of far things sink into a band of 霞
  float low = (1.0 - smoothstep(-6.0, 12.0 + dist * 0.07, wp.y)) * smoothstep(70.0, 640.0, dist) * uLowMist;
  return clamp(max(f, low * 0.92), 0.0, 1.0);
}`;

// ---- the print material: vertex colour, flat tones, and painted detail by surface type (aWin)
// aWin: 1 office glass, 2 wooden front (lattice and paper screens), 3 roof tiles, 4 flats with balconies,
//       5 warehouse sheeting, 7 shop building (glowing shop fronts below office windows)
const ukiyoVS = `
attribute vec3 aCol; attribute float aWin; attribute float aBase;
varying vec3 vCol; varying vec3 vN; varying vec3 vWp; varying float vWin; varying float vBase;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWp = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vCol = aCol; vWin = aWin; vBase = aBase; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const ukiyoFS = `${GL_COMMON}
varying vec3 vCol; varying vec3 vN; varying vec3 vWp; varying float vWin; varying float vBase;
void main(){
  vec3 n = normalize(vN);
  float l = dot(n, uSun);
  vec3 tint = l > 0.18 ? uLight : (l > -0.25 ? mix(uShade, uLight, 0.5) : uShade);
  if (n.y > 0.8) tint = uLight * 1.03;
  vec3 col = vCol * tint, glow = vec3(0.0);
  float w = vWin, vert = 1.0 - step(0.4, abs(n.y));
  vec2 fc = vec2(dot(vWp.xz, normalize(vec2(-n.z, n.x) + 1e-5)), vWp.y);
  float fy = vWp.y - vBase;
  if (w > 0.5 && vert > 0.5) {
    if (w < 1.5 || (w > 3.5 && w < 4.5) || w > 6.5) {
      bool flats = w > 3.5 && w < 4.5;
      vec2 cs = flats ? vec2(2.8, 3.0) : vec2(3.2, 3.7);
      vec2 g = fc / cs, f = fract(g), id = floor(g);
      float inside = step(0.14, f.x) * step(f.x, 0.86) * step(flats ? 0.38 : 0.24, f.y) * step(f.y, 0.82);
      float r = h21(id + floor(vWp.xz / 37.0) * 13.1);
      float lit = step(1.0 - (0.06 + uNight * 0.48), r);
      if (flats) col = mix(col, col * 1.18, step(f.y, 0.18)); // balcony rails
      col = mix(col, col * 0.46 + vec3(0.03, 0.05, 0.1), inside * (1.0 - lit));
      glow += inside * lit * mix(vec3(1.0, 0.84, 0.52), vec3(0.62, 0.9, 1.0), step(0.94, r)) * (0.25 + 0.95 * uNight);
      if (w > 6.5 && fy < 4.2 && fy > 0.3) { // shop fronts: one bright band at street level
        float r2 = h21(floor(vec2(fc.x / 7.0, 3.0)) + floor(vWp.xz / 53.0));
        vec3 sc = r2 < 0.33 ? vec3(1.0, 0.55, 0.42) : r2 < 0.66 ? vec3(0.45, 0.92, 1.0) : vec3(1.0, 0.85, 0.5);
        float band = step(0.6, fy) * step(fy, 3.4) * step(0.08, fract(fc.x / 7.0)) * step(fract(fc.x / 7.0), 0.92);
        col = mix(col, col * 0.4, band); glow += band * sc * (0.3 + 0.9 * uNight);
      }
    } else if (w < 2.5) {
      vec2 g = fc / vec2(1.8, 2.8), f = fract(g), id = floor(g);
      float inside = step(0.1, f.x) * step(f.x, 0.9) * step(0.22, f.y) * step(f.y, 0.86);
      float slat = max(step(0.72, fract(fc.x / 0.3)), step(0.86, fract(fc.y / 0.46)));
      float r = h21(id + floor(vWp.xz / 29.0) * 7.7), lit = step(1.0 - (0.1 + uNight * 0.55), r);
      col = mix(col, col * 0.5, inside * slat * 0.85);
      col = mix(col, col * 0.85 + vec3(0.06, 0.05, 0.03), inside * (1.0 - slat) * (1.0 - lit));
      glow += inside * (1.0 - slat) * lit * vec3(1.0, 0.74, 0.4) * (0.15 + 0.85 * uNight);
    } else if (w > 4.5 && w < 5.5) {
      col *= 1.0 - 0.22 * step(0.75, fract(fc.x / 0.8));
    }
  }
  if (w > 2.5 && w < 3.5 && n.y < 0.97) { // roof tiles: rows running down the slope
    vec2 h = normalize(vec2(-n.z, n.x) + 1e-5);
    float u = dot(vWp.xz, h);
    col *= 1.0 - 0.3 * step(0.8, fract(u / 0.55));
  }
  float dist = length(vWp - cameraPosition);
  float m = mistF(vWp, dist);
  gl_FragColor = vec4(mix(col, uMist, m) + glow * (1.0 - m * 0.8), 1.0);
}`;
const ukiyoMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: ukiyoVS, fragmentShader: ukiyoFS });
// lanterns, neon tubes, lamps: their colour, brighter at night
const glowFS = `${GL_COMMON}
varying vec3 vCol; varying vec3 vN; varying vec3 vWp; varying float vWin; varying float vBase;
void main(){ float dist = length(vWp - cameraPosition); float m = mistF(vWp, dist) * 0.7; gl_FragColor = vec4(mix(vCol * (0.7 + 0.75 * uNight), uMist, m), 1.0); }`;
const glowMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: ukiyoVS, fragmentShader: glowFS });

// ---- textured print material (signs, masks, cape): flat, with mist; aCol tints
const texVS = `
attribute vec3 aCol; varying vec3 vCol; varying vec2 vUv; varying vec3 vWp; varying vec3 vN;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWp = wp.xyz; vUv = uv; vCol = aCol; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`;
function texMat(map, opt = {}) {
  const u = { ...U, uMap: { value: map }, uGlow: { value: opt.glow || 0 }, uLit: { value: opt.lit ? 1 : 0 }, uTint: { value: new THREE.Color(opt.tint || 0xffffff) }, uInner: { value: new THREE.Color(opt.inner || 0xffffff) } };
  return new THREE.ShaderMaterial({
    uniforms: u, vertexShader: texVS, side: opt.side || THREE.FrontSide, transparent: !!opt.transparent, depthWrite: !opt.transparent,
    fragmentShader: `${GL_COMMON}
uniform sampler2D uMap; uniform float uGlow; uniform float uLit; uniform vec3 uTint; uniform vec3 uInner;
varying vec3 vCol; varying vec2 vUv; varying vec3 vWp; varying vec3 vN;
void main(){
  vec4 t = texture2D(uMap, vUv);
  if (t.a < 0.45) discard;
  vec3 c = t.rgb * uTint * (gl_FrontFacing ? vec3(1.0) : uInner);
  if (uLit > 0.5) { vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0); float l = dot(n, uSun); c *= l > 0.1 ? uLight : mix(uShade, uLight, 0.4); }
  c *= 1.0 + uGlow * (0.15 + 0.6 * uNight);
  float dist = length(vWp - cameraPosition), m = mistF(vWp, dist) * (1.0 - uGlow * 0.4);
  gl_FragColor = vec4(mix(c, uMist, m), 1.0);
}` });
}

// ---- canvas textures
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.userData = { canvas: c, draw }; return t;
}
function redraw(t) { const c = t.userData.canvas, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); t.userData.draw(g, c.width, c.height); t.needsUpdate = true; }
const FONT_BRUSH = '"Yuji Syuku", "Zen Antique", "Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif';
const FONT_MIN = '"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif';
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

// sign boards: 32 vertical signs in one atlas (8 × 4 cells of 128 × 256)
const SIGN_WORDS = ['電脳', '酒', '質', '湯', '薬', '蕎麦', '異界', '占', '鮨', '電気', '茶屋', '宿', '義体', '御守', '神隠', '夜行', '百鬼', '錦絵', '歌舞伎', '珈琲', '麻雀', '拉麺', '劇場', '活動写真', '両替', '鍼灸', '古書', '銭湯', '天麩羅', '居酒屋', '電影', '回路'];
const SIGN_STYLE = [
  [COL.sumi, COL.asagi, 0x9ff3ff], [0x3b1018, COL.shu, 0xffb08a], [COL.ai, COL.kin, 0xffe6a0], [0x2a1a10, COL.sakura, 0xffd8e0],
  [COL.shikkui, COL.beni, COL.beni], [0x16202a, 0x7cf0b0, 0xc8ffe4], [COL.beni, COL.tamago, 0xfff2c8], [COL.sumi, 0xff6a3d, 0xffc49a],
];
const signTex = canvasTex(1024, 1024, (g) => {
  for (let k = 0; k < 32; k++) {
    const cx = (k % 8) * 128, cy = Math.floor(k / 8) * 256, st = SIGN_STYLE[k % SIGN_STYLE.length], word = SIGN_WORDS[k];
    g.fillStyle = hex(st[0]); g.fillRect(cx + 4, cy + 4, 120, 248);
    g.strokeStyle = hex(st[1]); g.lineWidth = 6; g.shadowColor = hex(st[2]); g.shadowBlur = 10; g.strokeRect(cx + 12, cy + 12, 104, 232);
    g.shadowBlur = 14; g.fillStyle = hex(st[2]); g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = word.length, fs = Math.min(92, 216 / n);
    g.font = `700 ${fs}px ${FONT_BRUSH}`;
    for (let i = 0; i < n; i++) g.fillText(word[i], cx + 64, cy + 128 + (i - (n - 1) / 2) * fs * 1.02);
    g.shadowBlur = 0;
  }
});
// the cape: indigo with a white mitsudomoe crest; the lining is vermilion (tinted in the shader)
const capeTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#2b4a78'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; for (let y = 10; y < h; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 4); g.stroke(); }
  g.save(); g.translate(64, 52); g.fillStyle = '#f1ead8'; g.beginPath(); g.arc(0, 0, 25, 0, TAU); g.fill();
  g.fillStyle = '#2b4a78'; g.beginPath(); g.arc(0, 0, 21, 0, TAU); g.fill(); g.fillStyle = '#f1ead8';
  for (let k = 0; k < 3; k++) { g.rotate(TAU / 3); g.beginPath(); g.arc(0, -9, 7, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-7, -9); g.quadraticCurveTo(-12, 8, 6, 15); g.quadraticCurveTo(-4, 4, 7, -9); g.fill(); }
  g.restore();
});
capeTex.wrapS = capeTex.wrapT = THREE.ClampToEdgeWrapping;

// noh masks, painted: 0 小面 (young woman), 1 般若 (jealous demon), 2 翁 (old man), 3 癋見 (tight-lipped demon), 4 天狗
const MASKS = ['小面', '般若', '翁', '癋見', '天狗'];
const maskTex = MASKS.map((nm, k) => canvasTex(256, 320, (g, w, h) => {
  const face = ['#f4eee2', '#e9d39a', '#efe2c4', '#a8452e', '#c8392a'][k];
  g.fillStyle = face; g.beginPath(); g.ellipse(128, 168, 112, 150, 0, 0, TAU); g.fill();
  g.lineWidth = 4; g.strokeStyle = '#1d1b20'; g.stroke();
  g.fillStyle = '#1d1b20'; g.strokeStyle = '#1d1b20';
  if (k === 0) { // centre-parted hair, high painted brows, narrow eyes, small red lips
    g.beginPath(); g.moveTo(128, 18); g.quadraticCurveTo(60, 30, 26, 120); g.lineTo(40, 120); g.quadraticCurveTo(70, 52, 128, 44); g.quadraticCurveTo(186, 52, 216, 120); g.lineTo(230, 120); g.quadraticCurveTo(196, 30, 128, 18); g.fill();
    g.fillStyle = 'rgba(40,40,40,0.55)'; g.beginPath(); g.ellipse(88, 92, 16, 7, 0, 0, TAU); g.ellipse(168, 92, 16, 7, 0, 0, TAU); g.fill();
    g.fillStyle = '#1d1b20'; g.beginPath(); g.ellipse(86, 150, 22, 5, -0.1, 0, TAU); g.ellipse(170, 150, 22, 5, 0.1, 0, TAU); g.fill();
    g.fillStyle = '#c0283c'; g.beginPath(); g.ellipse(128, 238, 22, 9, 0, 0, TAU); g.fill(); g.fillStyle = '#1d1b20'; g.fillRect(110, 236, 36, 3);
    g.fillStyle = 'rgba(230,140,140,0.25)'; g.beginPath(); g.arc(70, 200, 22, 0, TAU); g.arc(186, 200, 22, 0, TAU); g.fill();
  } else if (k === 1) { // furrowed brows, gold eyes, a wide mouth with fangs
    g.lineWidth = 7; g.beginPath(); g.moveTo(50, 110); g.quadraticCurveTo(90, 70, 118, 120); g.moveTo(206, 110); g.quadraticCurveTo(166, 70, 138, 120); g.stroke();
    g.fillStyle = '#d9a73e'; g.beginPath(); g.arc(88, 145, 20, 0, TAU); g.arc(168, 145, 20, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#1d1b20'; g.beginPath(); g.arc(88, 145, 7, 0, TAU); g.arc(168, 145, 7, 0, TAU); g.fill();
    g.fillStyle = '#7a1420'; g.beginPath(); g.moveTo(52, 230); g.quadraticCurveTo(128, 330, 204, 230); g.quadraticCurveTo(128, 260, 52, 230); g.fill(); g.lineWidth = 4; g.stroke();
    g.fillStyle = '#f4eee2'; for (const x of [80, 176]) { g.beginPath(); g.moveTo(x - 8, 238); g.lineTo(x, 268); g.lineTo(x + 8, 240); g.fill(); }
    g.fillStyle = '#c0283c'; g.fillRect(90, 236, 76, 6);
  } else if (k === 2) { // white brows and beard, crescent laughing eyes
    g.fillStyle = '#f8f6f0'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(70 + (i % 3) * 8, 96 - (i > 2 ? 6 : 0), 22, 9, -0.3, 0, TAU); g.ellipse(186 - (i % 3) * 8, 96 - (i > 2 ? 6 : 0), 22, 9, 0.3, 0, TAU); g.fill(); }
    g.lineWidth = 6; g.strokeStyle = '#1d1b20'; g.beginPath(); g.arc(86, 140, 18, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(152, 132); g.arc(170, 140, 18, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.lineWidth = 2.5; for (const y of [180, 196]) { g.beginPath(); g.moveTo(60, y); g.quadraticCurveTo(128, y + 14, 196, y); g.stroke(); }
    g.fillStyle = '#f8f6f0'; g.beginPath(); g.moveTo(70, 230); g.quadraticCurveTo(128, 340, 186, 230); g.quadraticCurveTo(128, 262, 70, 230); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; for (let x = 84; x < 180; x += 10) { g.beginPath(); g.moveTo(x, 240); g.lineTo(x + (x - 128) * 0.1, 300); g.stroke(); }
  } else { // 癋見 and 天狗: bulging gold eyes, clamped mouth (the tengu adds a long nose in geometry)
    g.lineWidth = 8; g.beginPath(); g.moveTo(44, 108); g.lineTo(118, 126); g.moveTo(212, 108); g.lineTo(138, 126); g.stroke();
    g.fillStyle = '#d9a73e'; g.beginPath(); g.arc(86, 150, 24, 0, TAU); g.arc(170, 150, 24, 0, TAU); g.fill(); g.lineWidth = 4; g.stroke();
    g.fillStyle = '#1d1b20'; g.beginPath(); g.arc(86, 150, 9, 0, TAU); g.arc(170, 150, 9, 0, TAU); g.fill();
    g.lineWidth = 9; g.beginPath(); g.moveTo(70, 246); g.quadraticCurveTo(128, 226, 186, 246); g.stroke();
  }
}));

// effect sprites: ink splat, wave crest, petal, hitodama, brush ring, slash, spark, soft dot, cloud swirl
function brushRing(g, cx, cy, r, w, col) {
  g.strokeStyle = col; g.lineCap = 'round';
  for (let k = 0; k < 4; k++) { g.lineWidth = w * (1 - k * 0.18); g.globalAlpha = 0.85 - k * 0.15; g.beginPath(); g.arc(cx + k, cy - k, r - k * 1.5, -0.3 + k * 0.08, TAU * 0.93 - k * 0.1); g.stroke(); }
  g.globalAlpha = 1;
}
const FX = {
  ink: canvasTex(128, 128, (g) => { const R = mulberry(7); g.fillStyle = '#1d1b20'; g.beginPath(); g.arc(64, 64, 30, 0, TAU); g.fill(); for (let i = 0; i < 18; i++) { const a = R() * TAU, d = 30 + R() * 30, r = 2 + R() * 7; g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r, 0, TAU); g.fill(); g.lineWidth = r * 0.8; g.strokeStyle = '#1d1b20'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a) * d, 64 + Math.sin(a) * d); g.stroke(); } }),
  wave: canvasTex(128, 128, (g) => {
    // a Hokusai crest: an indigo curl with white foam claws on its lip
    g.fillStyle = '#23466e'; g.beginPath(); g.moveTo(10, 120); g.quadraticCurveTo(10, 30, 80, 22); g.quadraticCurveTo(120, 20, 118, 50); g.quadraticCurveTo(90, 34, 70, 60); g.quadraticCurveTo(52, 88, 70, 120); g.fill();
    g.strokeStyle = '#1d1b20'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#f4efe2'; for (let i = 0; i < 6; i++) { const x = 70 + i * 8, y = 28 + Math.abs(i - 2) * 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 10, x + 9, y + 2); g.quadraticCurveTo(x + 4, y + 2, x, y + 8); g.fill(); }
    g.strokeStyle = '#8fb4d8'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(24 + i * 6, 118); g.quadraticCurveTo(24 + i * 6, 52 + i * 6, 76, 40 + i * 6); g.stroke(); }
  }),
  petal: canvasTex(64, 64, (g) => { g.fillStyle = '#f6c3c8'; g.beginPath(); g.moveTo(32, 6); g.quadraticCurveTo(58, 26, 32, 58); g.quadraticCurveTo(6, 26, 32, 6); g.fill(); g.strokeStyle = '#b8283a'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#fbe6e8'; g.beginPath(); g.moveTo(32, 6); g.lineTo(28, 14); g.lineTo(36, 14); g.fill(); }),
  maple: canvasTex(64, 64, (g) => { g.fillStyle = '#d9472b'; g.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.62, b = a + 0.31; g.lineTo(32 + Math.cos(a) * 28, 34 + Math.sin(a) * 28); g.lineTo(32 + Math.cos(b) * 10, 34 + Math.sin(b) * 10); } g.closePath(); g.fill(); g.strokeStyle = '#7a1420'; g.lineWidth = 1.5; g.stroke(); }),
  soul: canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 34, 2, 32, 34, 26); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(190,240,255,0.95)'); r.addColorStop(0.7, 'rgba(90,170,230,0.5)'); r.addColorStop(1, 'rgba(60,90,200,0)'); g.fillStyle = r; g.beginPath(); g.arc(32, 34, 26, 0, TAU); g.fill(); }),
  ring: canvasTex(256, 256, (g) => brushRing(g, 128, 128, 104, 16, '#d9472b')),
  ringG: canvasTex(256, 256, (g) => brushRing(g, 128, 128, 104, 20, '#f3d58c')),
  ens: canvasTex(256, 256, (g) => brushRing(g, 128, 128, 100, 14, '#1d1b20')),
  slash: canvasTex(512, 64, (g) => { const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.2, 'rgba(255,255,255,1)'); gr.addColorStop(0.85, 'rgba(255,250,240,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 32); g.quadraticCurveTo(256, 4, 512, 30); g.quadraticCurveTo(256, 44, 0, 32); g.fill(); }),
  spark: canvasTex(32, 32, (g) => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,240,1)'); r.addColorStop(0.4, 'rgba(255,210,120,0.8)'); r.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); }),
  dot: canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }),
  cloud: canvasTex(128, 128, (g) => { g.fillStyle = '#f4efe2'; g.strokeStyle = '#1d1b20'; g.lineWidth = 3; g.beginPath(); g.arc(64, 70, 34, 0, TAU); g.fill(); g.stroke(); g.lineWidth = 2.5; g.beginPath(); g.arc(64, 70, 20, 0.2, TAU * 0.8); g.stroke(); g.beginPath(); g.arc(64, 70, 8, 0.6, TAU * 0.7); g.stroke(); }),
};

// ---- the geometry builder: flat-shaded triangles with per-vertex colour, surface type and base height
const _c = new THREE.Color();
class Builder {
  constructor() { this.p = []; this.n = []; this.c = []; this.w = []; this.b = []; this.uv = []; }
  get count() { return this.p.length / 3; }
  // a triangle; `hint` is a point inside the solid so the face can be turned outward
  tri(a, b, c, col, win = 0, base = -999, hint = null, uvs = null) {
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (hint) { const fx = (a[0] + b[0] + c[0]) / 3 - hint[0], fy = (a[1] + b[1] + c[1]) / 3 - hint[1], fz = (a[2] + b[2] + c[2]) / 3 - hint[2]; if (nx * fx + ny * fy + nz * fz < 0) { const t = b; b = c; c = t; nx = -nx; ny = -ny; nz = -nz; if (uvs) uvs = [uvs[0], uvs[2], uvs[1]]; } }
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    _c.set(col);
    for (const q of [a, b, c]) { this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz); this.c.push(_c.r, _c.g, _c.b); this.w.push(win); this.b.push(base); }
    if (uvs) for (const q of uvs) this.uv.push(q[0], q[1]);
    else this.uv.push(0, 0, 0, 0, 0, 0);
  }
  quad(a, b, c, d, col, win, base, hint, uvq) { this.tri(a, b, c, col, win, base, hint, uvq && [uvq[0], uvq[1], uvq[2]]); this.tri(a, c, d, col, win, base, hint, uvq && [uvq[0], uvq[2], uvq[3]]); }
  // a tapered box (frustum) standing at y0: bottom half sizes hw0,hd0, top hw1,hd1, rotated by rot about its centre
  frustum(cx, y0, cz, hw0, hd0, hw1, hd1, h, rot, col, win = 0, topCol = null, base = y0, noBottom = true) {
    const co = Math.cos(rot), si = Math.sin(rot);
    const P = (lx, y, lz) => [cx + lx * co + lz * si, y, cz - lx * si + lz * co];
    const b = [P(-hw0, y0, -hd0), P(hw0, y0, -hd0), P(hw0, y0, hd0), P(-hw0, y0, hd0)];
    const t = [P(-hw1, y0 + h, -hd1), P(hw1, y0 + h, -hd1), P(hw1, y0 + h, hd1), P(-hw1, y0 + h, hd1)];
    const hint = [cx, y0 + h / 2, cz];
    for (let k = 0; k < 4; k++) { const j = (k + 1) % 4; this.quad(b[k], b[j], t[j], t[k], col, win, base, hint); }
    this.quad(t[0], t[1], t[2], t[3], topCol === null ? col : topCol, 0, base, hint);
    if (!noBottom) this.quad(b[0], b[1], b[2], b[3], col, 0, base, hint);
  }
  box(cx, y0, cz, hw, h, hd, rot, col, win, topCol, noBottom = true) { this.frustum(cx, y0, cz, hw, hd, hw, hd, h, rot, col, win, topCol, y0, noBottom); }
  // a gabled roof over a hw × hd footprint at y0, ridge along local x, with eaves
  gable(cx, y0, cz, hw, hd, h, rot, col, ov = 0.6) {
    const co = Math.cos(rot), si = Math.sin(rot);
    const P = (lx, y, lz) => [cx + lx * co + lz * si, y, cz - lx * si + lz * co];
    const W = hw + ov, D = hd + ov, hint = [cx, y0 + h * 0.3, cz];
    const a = P(-W, y0, -D), b = P(W, y0, -D), c = P(W, y0, D), d = P(-W, y0, D), r0 = P(-W, y0 + h, 0), r1 = P(W, y0 + h, 0);
    this.quad(a, b, r1, r0, col, 3, -999, hint); this.quad(d, c, r1, r0, col, 3, -999, hint);
    this.tri(a, r0, d, col, 0, -999, hint); this.tri(b, r1, c, col, 0, -999, hint);
  }
  // a hipped roof (four slopes) with curved-looking eaves: a low wide frustum below a pyramid cap
  hip(cx, y0, cz, hw, hd, h, rot, col, ov = 1.2) {
    this.frustum(cx, y0, cz, hw + ov, hd + ov, hw * 0.55, hd * 0.55, h * 0.55, rot, col, 3);
    this.frustum(cx, y0 + h * 0.55, cz, hw * 0.55, hd * 0.55, hw * 0.08, Math.max(0.2, hd * 0.08 + (hd - hw) * 0.4), h * 0.45, rot, col, 3);
  }
  cyl(cx, y0, cz, r0, r1, h, seg, col, win = 0, cap = true) {
    const hint = [cx, y0 + h / 2, cz];
    for (let k = 0; k < seg; k++) {
      const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU;
      const p0 = [cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0], p1 = [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0];
      const q0 = [cx + Math.cos(a0) * r1, y0 + h, cz + Math.sin(a0) * r1], q1 = [cx + Math.cos(a1) * r1, y0 + h, cz + Math.sin(a1) * r1];
      this.quad(p0, p1, q1, q0, col, win, y0, hint);
      if (cap && r1 > 0.01) this.tri([cx, y0 + h, cz], q0, q1, col, 0, y0, hint);
    }
  }
  // a thin beam between two points (square section)
  beam(a, b, r, col) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1;
    const d = [dx / L, dy / L, dz / L], up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    let s = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]]; const sl = Math.hypot(...s); s = s.map((v) => v / sl * r);
    const u = [d[1] * s[2] - d[2] * s[1], d[2] * s[0] - d[0] * s[2], d[0] * s[1] - d[1] * s[0]];
    const c = (p, i, j) => [p[0] + s[0] * i + u[0] * j, p[1] + s[1] * i + u[1] * j, p[2] + s[2] * i + u[2] * j];
    const hint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], cs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    for (let k = 0; k < 4; k++) { const i = cs[k], j = cs[(k + 1) % 4]; this.quad(c(a, i[0], i[1]), c(a, j[0], j[1]), c(b, j[0], j[1]), c(b, i[0], i[1]), col, 0, -999, hint); }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('aCol', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aWin', new THREE.Float32BufferAttribute(this.w, 1));
    g.setAttribute('aBase', new THREE.Float32BufferAttribute(this.b, 1));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
  mesh(mat = ukiyoMat) { const m = new THREE.Mesh(this.geometry(), mat); m.matrixAutoUpdate = false; m.updateMatrix(); return m; }
}

// ---- water: indigo with seigaiha (青海波) scallops that drift
const waterMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uDeep: { value: new THREE.Color(0x24507f) }, uLine: { value: new THREE.Color(0x9cc0de) } },
  vertexShader: `varying vec3 vWp; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWp = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: `${GL_COMMON}
uniform vec3 uDeep; uniform vec3 uLine; varying vec3 vWp;
float seigaiha(vec2 p){
  float k0 = floor(p.y / 0.5) + 2.0;
  for (int j = 0; j < 6; j++) {
    float k = k0 - float(j), off = mod(k, 2.0);
    float cx = floor((p.x - off) / 2.0 + 0.5) * 2.0 + off;
    vec2 c = vec2(cx, k * 0.5);
    float d = length(p - c); if (d < 1.0) return d;
    float d2 = length(p - c - vec2(p.x > cx ? 2.0 : -2.0, 0.0)); if (d2 < 1.0) return d2;
  }
  return 1.0;
}
void main(){
  vec2 p = vWp.xz / 4.2 + vec2(0.0, uTime * 0.12);
  float d = seigaiha(p), r = fract(d * 3.0);
  float dist = length(vWp - cameraPosition);
  float wl = (1.0 - smoothstep(0.0, 0.16 + dist * 0.0009, r)) * (1.0 - smoothstep(60.0, 520.0, dist));
  vec3 c = mix(uDeep, uDeep * 1.25, d);
  c = mix(c, uLine, wl * 0.8);
  c *= mix(vec3(1.0), uLight, 0.5);
  gl_FragColor = vec4(mix(c, uMist, smoothstep(uFog.x, uFog.y * 1.2, dist)), 1.0);
}` });
const water = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000).rotateX(-Math.PI / 2), waterMat);
water.position.y = WATER_Y; scene.add(water);

// ---- sky: a woodblock bokashi. A dark top band (一文字ぼかし), pale middle, warm horizon, flat sun disc and
// two long bands of suyari-gasumi mist with wavy edges.
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uBand: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() }, uSunDir: { value: new V3(0, 0.2, 1) }, uNightS: { value: 0 }, uT: { value: 0 } },
  vertexShader: `varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uBand; uniform vec3 uSunCol; uniform vec3 uSunDir; uniform float uNightS; uniform float uT;
varying vec3 vD;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec3 d = normalize(vD); float e = d.y, az = atan(d.z, d.x);
  vec3 c = mix(uHor, uMid, smoothstep(-0.01, 0.3, e));
  // ichimonji bokashi: the dark band sits only at the very top of the sheet
  c = mix(c, uTop, smoothstep(0.38, 0.62, e));
  // suyari-gasumi: long bands with soft wavy edges
  for (int k = 0; k < 2; k++) {
    float fk = float(k), y0 = 0.035 + fk * 0.085, wv = sin(az * (3.0 + fk * 2.0) + fk * 2.3 + uT * 0.01) * 0.012 + sin(az * 11.0 + fk) * 0.004;
    float band = smoothstep(y0 - 0.02 + wv, y0 + wv, e) * (1.0 - smoothstep(y0 + 0.025 + wv, y0 + 0.045 + wv, e));
    float gap = smoothstep(0.2, 0.35, abs(sin(az * (1.5 + fk) + fk * 4.0)));
    c = mix(c, uBand, band * gap * 0.85);
  }
  // the sun (or the moon): a flat disc
  float sd = dot(d, normalize(uSunDir));
  c = mix(c, uSunCol, smoothstep(0.9985, 0.9989, sd));
  // a few stars at night
  vec2 sp = floor(vec2(az * 260.0, e * 300.0));
  float st = step(0.9965, h21(sp)) * smoothstep(0.08, 0.3, e) * uNightS;
  c += st * 0.6;
  gl_FragColor = vec4(c, 1.0);
}` });
const sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

// ---- far mountains: Fuji to the west-south-west, the Tanzawa and Okutama ranges, twin-peaked Tsukuba to the north-east.
// They ride with the camera like the sky, so they never come closer.
const farMat = new THREE.ShaderMaterial({
  uniforms: { uMist: U.uMist, uBody: { value: new THREE.Color(0x3d5b86) }, uSnow: { value: new THREE.Color(0xf2efe6) }, uFade: { value: 0.35 } },
  vertexShader: `attribute float aSnow; attribute float aH; varying float vS; varying float vH; void main(){ vS = aSnow; vH = aH; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 uMist; uniform vec3 uBody; uniform vec3 uSnow; uniform float uFade; varying float vS; varying float vH;
void main(){ vec3 c = mix(uBody, uSnow, step(0.5, vS)); c = mix(c, uMist, uFade + (1.0 - smoothstep(0.0, 0.5, vH)) * (1.0 - uFade) * 0.9); gl_FragColor = vec4(c, 1.0); }` });
const farGroup = new THREE.Group(); scene.add(farGroup);
function mountain(dirx, dirz, dist, height, radius, snowLine, seed, peaks = 1) {
  const pos = [], snow = [], hh = [], R = mulberry(seed), A = 72, H = 20;
  const prof = (r) => { // concave Hokusai slopes with a flat-ish crown
    const u = clamp(r / radius, 0, 1); return Math.pow(1 - u, 1.9) * 0.97 + 0.03 * (1 - u);
  };
  const ang = Math.atan2(dirz, dirx), cx = Math.cos(ang) * dist, cz = Math.sin(ang) * dist;
  for (let pk = 0; pk < peaks; pk++) {
    const ox = peaks > 1 ? (pk - 0.5) * radius * 0.7 : 0, sx = -Math.sin(ang), sz = Math.cos(ang);
    const px = cx + sx * ox, pz = cz + sz * ox, hk = peaks > 1 ? (pk ? 1 : 0.92) : 1;
    const vert = (a, r) => { const jag = 1 + (vnoise(a * 3, r / radius * 4, seed) - 0.5) * 0.12; const y = height * hk * prof(r) * jag - 40; return [px + Math.cos(a) * r, y, pz + Math.sin(a) * r]; };
    for (let i = 0; i < A; i++) for (let j = 0; j < H; j++) {
      const a0 = i / A * TAU, a1 = (i + 1) / A * TAU, r0 = j / H * radius, r1 = (j + 1) / H * radius;
      const q = [vert(a0, r0), vert(a1, r0), vert(a1, r1), vert(a0, r1)];
      for (const t of [[0, 1, 2], [0, 2, 3]]) for (const k of t) {
        const v = q[k]; pos.push(...v);
        const hn = (v[1] + 40) / (height * hk), a = k === 0 || k === 3 ? a0 : a1;
        snow.push(hn > snowLine + Math.sin(a * 9 + seed) * 0.06 + (vnoise(a * 5, 1, seed + 3) - 0.5) * 0.08 ? 1 : 0); hh.push(hn);
      }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aSnow', new THREE.Float32BufferAttribute(snow, 1)); g.setAttribute('aH', new THREE.Float32BufferAttribute(hh, 1));
  const m = new THREE.Mesh(g, farMat); m.frustumCulled = false; farGroup.add(m); return m;
}
mountain(-92, 36, 15500, 1750, 5200, 0.62, 3);          // Fuji
mountain(-80, 10, 17500, 600, 2600, 2, 11); mountain(-70, -8, 17800, 520, 3000, 2, 12); mountain(-90, 60, 17000, 480, 2400, 2, 13); mountain(-60, -40, 18000, 430, 2600, 2, 14);
mountain(12, -58, 17500, 520, 2200, 2, 21, 2);           // Tsukuba's twin peaks

// ---- moods: the hour turns slowly through dusk, night, dawn and day. Each sets the sky, the mist and the light.
const MOODS = [
  { name: '夕', top: 0x1d3f74, mid: 0x7a86ad, hor: 0xf1cd98, band: 0xf7dfb8, sun: 0xe0472c, mist: 0xe6c9a0, light: 0xfff0d8, shade: 0x8a8cab, night: 0.45, az: -2.75, el: 0.035, ink: 0x1d1b20 },
  { name: '夜', top: 0x0a1328, mid: 0x1a2a4c, hor: 0x3a4568, band: 0x4c5a80, sun: 0xf2ead0, mist: 0x2a3554, light: 0x8890ba, shade: 0x4a5279, night: 1.0, az: 0.9, el: 0.3, ink: 0x0b0d16 },
  { name: '暁', top: 0x33507f, mid: 0x9ca4c4, hor: 0xf3c8b8, band: 0xfbe3d7, sun: 0xee583a, mist: 0xe7d3cc, light: 0xfff0ea, shade: 0x989dbb, night: 0.3, az: -0.35, el: 0.04, ink: 0x1d1b20 },
  { name: '昼', top: 0x2356a0, mid: 0x8fb1d7, hor: 0xf1e9d2, band: 0xfbf4e3, sun: 0xe74f2e, mist: 0xebe2cc, light: 0xfffaf0, shade: 0xa7adbf, night: 0.0, az: 1.3, el: 0.55, ink: 0x1d1b20 },
].map((m) => ({ ...m, c: Object.fromEntries(['top', 'mid', 'hor', 'band', 'sun', 'mist', 'light', 'shade', 'ink'].map((k) => [k, new THREE.Color(m[k])])) }));
const DAY_PERIOD = 720; // seconds for a full turn of the hour
let moodFix = store.get('ukiyo.mood', -1); // -1 = the hour moves; otherwise a fixed mood index
let moodPhase = 0;
const _m = { top: new THREE.Color(), mid: new THREE.Color(), hor: new THREE.Color(), band: new THREE.Color(), sun: new THREE.Color(), mist: new THREE.Color(), light: new THREE.Color(), shade: new THREE.Color(), ink: new THREE.Color() };
function updateMood(dt) {
  if (moodFix >= 0) moodPhase = lerp(moodPhase, moodFix, 1 - Math.exp(-1.5 * dt)); else moodPhase = (moodPhase + dt * MOODS.length / DAY_PERIOD) % MOODS.length;
  const i = Math.floor(moodPhase) % MOODS.length, f = smooth(0.55, 1, moodPhase - Math.floor(moodPhase)), A = MOODS[i], B = MOODS[(i + 1) % MOODS.length];
  for (const k in _m) _m[k].copy(A.c[k]).lerp(B.c[k], f);
  const night = lerp(A.night, B.night, f), az = lerp(A.az, A.az + wrapA(B.az - A.az), f), el = lerp(A.el, B.el, f);
  skyMat.uniforms.uTop.value.copy(_m.top); skyMat.uniforms.uMid.value.copy(_m.mid); skyMat.uniforms.uHor.value.copy(_m.hor); skyMat.uniforms.uBand.value.copy(_m.band);
  skyMat.uniforms.uSunCol.value.copy(_m.sun); skyMat.uniforms.uSunDir.value.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)); skyMat.uniforms.uNightS.value = smooth(0.6, 1, night);
  U.uMist.value.copy(_m.mist); U.uLight.value.copy(_m.light); U.uShade.value.copy(_m.shade); U.uNight.value = night;
  // light comes from the sun when it is up; at night from high in the south-east (the moon)
  U.uSun.value.set(Math.cos(az) * Math.cos(Math.max(el, 0.35)), Math.sin(Math.max(el, 0.35)), Math.sin(az) * Math.cos(Math.max(el, 0.35))).normalize();
  farMat.uniforms.uBody.value.copy(_m.top).lerp(_m.hor, 0.25);
  farMat.uniforms.uSnow.value.copy(_m.light).lerp(_m.mist, 0.2);
  waterMat.uniforms.uDeep.value.setHex(0x24507f).lerp(_m.top, 0.35);
  post.uniforms.uInk.value.copy(_m.ink); post.uniforms.uInkFar.value.copy(_m.top).lerp(_m.mist, 0.25);
  renderer.setClearColor(_m.hor);
  return MOODS[Math.round(moodPhase) % MOODS.length].name;
}

// ---- the post pass: sumi lines from depth and colour, washi paper, and the effects of the strike
let rt = null;
const post = new THREE.ShaderMaterial({
  uniforms: {
    tCol: { value: null }, tDep: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uNear: { value: camera.near }, uFar: { value: camera.far },
    uInk: { value: new THREE.Color(COL.sumi) }, uInkFar: { value: new THREE.Color(COL.ai) }, uMono: { value: 0 }, uFlash: { value: new THREE.Color(1, 1, 1) }, uFlashK: { value: 0 },
    uRadial: { value: 0 }, uRadC: { value: new THREE.Vector2(0.5, 0.5) }, uVig: { value: 0 }, uFocus: { value: 0 }, uTime: { value: 0 }, uPR: { value: PR }, uShu: { value: new THREE.Color(COL.shu) }, uPaper: { value: new THREE.Color(COL.paper) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
uniform sampler2D tCol; uniform sampler2D tDep; uniform vec2 uRes; uniform float uNear; uniform float uFar;
uniform vec3 uInk; uniform vec3 uInkFar; uniform float uMono; uniform vec3 uFlash; uniform float uFlashK; uniform float uRadial; uniform vec2 uRadC;
uniform float uVig; uniform float uFocus; uniform float uTime; uniform float uPR; uniform vec3 uShu; uniform vec3 uPaper;
varying vec2 vUv;
float W(vec2 uv){ float d = texture2D(tDep, uv).x; return (uFar - d * (uFar - uNear)) / (uNear * uFar); }
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float lum(vec3 c){ return dot(c, vec3(0.3, 0.59, 0.11)); }
void main(){
  vec2 px = 1.0 / uRes;
  float wc = W(vUv), z = 1.0 / wc;
  float o = mix(2.6, 1.25, smoothstep(10.0, 90.0, z)) * max(1.0, uPR * 0.75);
  vec2 dx = vec2(px.x * o, 0.0), dy = vec2(0.0, px.y * o);
  float wl = W(vUv - dx), wr = W(vUv + dx), wu = W(vUv + dy), wd = W(vUv - dy);
  float L = (wl + wr + wu + wd - 4.0 * wc) / wc;
  float mx = max(max(wl, wr), max(wu, wd));
  float Lp = (wl + wr + wu + wd - 4.0 * wc) / mx;
  float e1 = smoothstep(0.03, 0.08, -L);                                       // silhouettes and outer corners, on the near side
  float e2 = smoothstep(0.035, 0.09, Lp) * (1.0 - smoothstep(0.22, 0.36, Lp)); // inner creases
  // colour edges draw the painted detail (windows, signs, roof rows)
  vec3 cc = texture2D(tCol, vUv).rgb;
  vec3 cl = texture2D(tCol, vUv - dx).rgb, cr = texture2D(tCol, vUv + dx).rgb, cu = texture2D(tCol, vUv + dy).rgb, cd = texture2D(tCol, vUv - dy).rgb;
  float ce = length(cr - cl) + length(cu - cd);
  float e3 = smoothstep(0.26, 0.5, ce) * 0.55 * (1.0 - smoothstep(120.0, 700.0, z));
  float fade = 1.0 - smoothstep(380.0, 2200.0, z) * 0.7;
  if (z > uFar * 0.9) fade = 0.0;
  float ink = clamp(max(max(e1, e2 * 0.75), e3) * fade, 0.0, 1.0);
  vec3 inkC = mix(uInk, uInkFar, smoothstep(60.0, 900.0, z));
  vec3 col = cc;
  // washi: soft cloud of fibre and a fine tooth; independent of resolution
  vec2 sp = gl_FragCoord.xy / uPR;
  float grain = vn(sp * 0.45) * 0.5 + vn(sp * 0.07 + 13.0) * 0.5;
  float fib = vn(vec2(sp.x * 0.03, sp.y * 0.9) + 7.0);
  col *= 0.94 + 0.06 * grain + 0.025 * (fib - 0.5);
  // a printer's limited pigments: pull the colour a touch toward paper in the lights
  col = mix(col, col * uPaper / 0.92, 0.12);
  // the strike: the frame turns to sumi on paper with vermilion kept
  float lu = lum(col), red = col.r - max(col.g, col.b);
  vec3 mono = lu > 0.5 ? uPaper : (lu > 0.3 ? mix(uPaper, uInk, 0.18) : (lu > 0.14 ? mix(uPaper, uInk, 0.42) : mix(uPaper, uInk, 0.7)));
  mono = mix(mono, uShu, smoothstep(0.12, 0.28, red));
  col = mix(col, mono, uMono);
  col = mix(col, inkC, ink * (1.0 + uMono * 0.3));
  // focus lines (集中線) toward the strike
  vec2 q = (vUv - uRadC) * vec2(uRes.x / uRes.y, 1.0);
  float a = atan(q.y, q.x) / 3.14159 * 110.0, r = length(q);
  float ln = step(0.55, h21(vec2(floor(a), 3.0))) * step(fract(a), 0.32 + 0.3 * h21(vec2(floor(a), 9.0))) * smoothstep(0.18 + 0.2 * h21(vec2(floor(a), 5.0)), 0.75, r);
  col = mix(col, uInk, ln * uRadial);
  // vignettes: vermilion for danger, sumi wash for the held breath of the stance
  float v = smoothstep(0.42, 1.05, length((vUv - 0.5) * vec2(1.0, 1.25)) * 1.45);
  col = mix(col, uShu * 0.85, v * uVig);
  col = mix(col, vec3(lu) * vec3(1.02, 0.98, 0.92), uFocus * 0.35);
  col = mix(col, uInk, v * uFocus * 0.55);
  col = mix(col, uFlash, uFlashK);
  gl_FragColor = vec4(col, 1.0);
}`,
  depthTest: false, depthWrite: false,
});
const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post); postQuad.frustumCulled = false; postScene.add(postQuad);
function makeRT() {
  const w = Math.floor(innerWidth * PR), h = Math.floor(innerHeight * PR);
  if (rt) { rt.depthTexture.dispose(); rt.dispose(); }
  rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  rt.depthTexture = new THREE.DepthTexture(w, h); rt.depthTexture.type = THREE.UnsignedIntType;
  post.uniforms.tCol.value = rt.texture; post.uniforms.tDep.value = rt.depthTexture; post.uniforms.uRes.value.set(w, h);
}
makeRT();
function renderFrame() {
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}
function applyLens() {
  const w = innerWidth, h = innerHeight, shift = w < h ? 0.09 : 0.05;
  camera.aspect = w / h; camera.setViewOffset(w, h, 0, -h * shift, w, h); camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); makeRT(); applyLens(); });

// redraw the painted textures once the brush fonts arrive
if (document.fonts && document.fonts.load) {
  Promise.all([document.fonts.load(`700 64px "Yuji Syuku"`), document.fonts.load(`700 64px "Shippori Mincho"`)]).then(() => { redraw(signTex); }).catch(() => {});
}
