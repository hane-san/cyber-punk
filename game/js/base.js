'use strict';
// ---------------------------------------------------------------- base: maths, noise, palette, settings
// Every script shares the global lexical scope, so names declared here are visible in the later files.
const V3 = THREE.Vector3;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const $ = (s) => document.querySelector(s);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const LOWQ = isTouch;

// integer hash → [0, 1)
function hash3(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1013, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const hash2 = (x, y) => hash3(x, y, 0);
function vnoise(x, z, s) {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash3(xi, zi, s), b = hash3(xi + 1, zi, s), c = hash3(xi, zi + 1, s), d = hash3(xi + 1, zi + 1, s);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// The print palette: traditional Japanese colour names, as woodblock pigments.
const COL = {
  paper: 0xefe3c8,   // 生成り
  sumi: 0x1d1b20,    // 墨
  ai: 0x23466e,      // 藍
  bero: 0x1f4f8f,    // ベロ藍 (Prussian blue)
  asagi: 0x3fb3c4,   // 浅葱: the board's light
  shu: 0xd9472b,     // 朱
  beni: 0xb8283a,    // 紅
  kin: 0xd9a73e,     // 金
  tamago: 0xf3d58c,  // 卵色: lit windows
  nezumi: 0x8a8781,  // 鼠
  ainezumi: 0x5b6a7a,// 藍鼠
  ginnezumi: 0xa9aab0,// 銀鼠
  shironeri: 0xe9e4d8,// 白練
  rikyu: 0x7c7a5a,   // 利休鼠
  cha: 0x6b4a2f,     // 茶
  kogecha: 0x4a3426, // 焦茶
  benigara: 0x8f3b2b,// 弁柄
  rokusho: 0x4f8f80, // 緑青 (copper roofs)
  matsu: 0x3d5838,   // 松葉
  moegi: 0xaebf80,   // 萌黄
  sakura: 0xf1b9bd,  // 桜
  tsuchi: 0xc6bca2,  // 土
  suna: 0xd8ceb4,    // 砂
  kawara: 0x7a8393,  // 瓦
  shikkui: 0xeee9dc, // 漆喰
  nibi: 0x5d6068,    // 鈍色 (asphalt)
};

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

// The board: the Wind Lover hover-board handling, tuned up for city streets.
// roll: how fast the lean answers; grip: sideways bite; cruise/maxSpeed in m/s.
const BOARD = { name: '電動板', hover: 0.55, grip: 6.2, accel: 17, roll: 5.2, defaults: { maxSpeed: 100, cruise: 40, inertia: 1.2, gravity: 30, turn: 1.0, camDist: 12.5, fovKick: 1.3, auto: true } };
const S = { ...BOARD.defaults, ...(store.get('ukiyo.settings.v2', {}) || {}) };
const saveS = () => store.set('ukiyo.settings.v2', S);
