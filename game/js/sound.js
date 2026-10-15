// ---------------------------------------------------------------- sound: procedural WebAudio, in the voice of the noh stage
// The board hums and the wind rises with speed. The other world speaks in stage instruments: the nohkan flute when
// an assault arrives, the kakegoe call (ヨォー) when a figure winds up, the tsuzumi (ポン) that marks the instant to cut,
// hyoshigi clappers at the start, and a taiko under the cut itself.
const sfx = (() => {
  let ac = null, drive = null, master, hum, humG, humF, wind, windG, windF, lp, droneG, droneO;
  let on = store.get('ukiyo.sound', true);
  function init() {
    if (ac) return;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    // everything goes through a compressor, so a blast can hit hard without clipping
    master = ac.createGain(); master.gain.value = on ? 0.8 : 0;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.22;
    lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000; lp.connect(master); master.connect(comp); comp.connect(ac.destination);
    hum = ac.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 60; humF = ac.createBiquadFilter(); humF.type = 'lowpass'; humF.frequency.value = 400;
    humG = ac.createGain(); humG.gain.value = 0; hum.connect(humF); humF.connect(humG); humG.connect(lp); hum.start();
    const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    wind = ac.createBufferSource(); wind.buffer = nb; wind.loop = true; windF = ac.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 500; windF.Q.value = 0.6;
    windG = ac.createGain(); windG.gain.value = 0; wind.connect(windF); windF.connect(windG); windG.connect(lp); wind.start();
    // the held breath of the stance: a low breathy shakuhachi-like tone
    droneO = ac.createOscillator(); droneO.type = 'sine'; droneO.frequency.value = 146.8; droneG = ac.createGain(); droneG.gain.value = 0; droneO.connect(droneG); droneG.connect(master); droneO.start();
    sfx.noise = nb;
    // a soft-clipping stage for the heavy cuts: it thickens the low end and makes a hit feel solid
    drive = ac.createWaveShaper(); const cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; cv[i] = Math.tanh(x * 3.2); } drive.curve = cv; drive.connect(lp);
  }
  const now = () => ac.currentTime;
  function env(g, t0, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dcy); }
  function tone(freq, type, peak, a, dcy, dest = lp, glide = 0, delay = 0) {
    if (!ac) return; const t0 = now() + delay, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), t0 + a + dcy);
    env(g, t0, a, peak, dcy); o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + a + dcy + 0.05);
  }
  function noise(peak, a, dcy, ftype, f, q = 1, delay = 0, fEnd = 0, dest = lp) {
    if (!ac) return; const t0 = now() + delay, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = sfx.noise; fl.type = ftype; fl.frequency.setValueAtTime(f, t0); if (fEnd) fl.frequency.exponentialRampToValueAtTime(fEnd, t0 + a + dcy); fl.Q.value = q;
    env(g, t0, a, peak, dcy); s.connect(fl); fl.connect(g); g.connect(dest); s.start(t0, Math.random()); s.stop(t0 + a + dcy + 0.05);
  }
  const MIYAKO = [293.7, 311.1, 392, 440, 466.2]; // the miyako-bushi scale, on D
  return {
    resume() { init(); if (ac && ac.state === 'suspended') ac.resume(); },
    get on() { return on; },
    toggle() { on = !on; store.set('ukiyo.sound', on); if (master) master.gain.value = on ? 0.8 : 0; return on; },
    update(speed, kamae, slow) {
      if (!ac) return; const t0 = now(), k = clamp(speed / 70, 0, 1);
      hum.frequency.setTargetAtTime(48 + k * 70, t0, 0.1); humF.frequency.setTargetAtTime(220 + k * 900, t0, 0.1); humG.gain.setTargetAtTime(0.03 + k * 0.05, t0, 0.15);
      windF.frequency.setTargetAtTime(300 + k * 1500, t0, 0.2); windG.gain.setTargetAtTime(k * k * 0.32, t0, 0.2);
      lp.frequency.setTargetAtTime(kamae || slow ? 1400 : 18000, t0, kamae ? 0.25 : 0.08);
      droneG.gain.setTargetAtTime(kamae ? 0.06 : 0, t0, 0.2); droneO.frequency.setTargetAtTime(146.8 * (1 + Math.sin(t0 * 5) * 0.004), t0, 0.05);
    },
    whoosh() { noise(0.22, 0.01, 0.22, 'bandpass', 700, 1.4, 0, 3200); },
    hop() { noise(0.12, 0.005, 0.12, 'bandpass', 900, 2); },
    land(k) { noise(0.25 * k + 0.05, 0.005, 0.18, 'lowpass', 500); tone(70, 'sine', 0.2 * k + 0.05, 0.005, 0.2); },
    scrape(k) { noise(0.12 * k, 0.005, 0.08, 'bandpass', 2600, 3); },
    crash() { noise(0.5, 0.005, 0.5, 'lowpass', 900, 1, 0, 120); tone(55, 'sine', 0.5, 0.005, 0.5, lp, 0.5); },
    splash() { noise(0.2, 0.01, 0.3, 'highpass', 1400, 0.8); },
    dash() { noise(0.18, 0.01, 0.35, 'bandpass', 600, 1, 0, 2600); },
    chime(n) { const f = MIYAKO[n % 5] * (1 + Math.floor(n / 5) % 3); tone(f * 2, 'triangle', 0.08, 0.003, 0.5); tone(f * 4.01, 'sine', 0.03, 0.003, 0.3); },
    volley() { noise(0.06, 0.01, 0.4, 'bandpass', 1800, 4, 0, 900); },
    // the nohkan: a shrill breathy flute that rises and breaks (the hishigi)
    nohkan() {
      if (!ac) return; const t0 = now(), o = ac.createOscillator(), g = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(880, t0); o.frequency.exponentialRampToValueAtTime(1760, t0 + 0.9); o.frequency.exponentialRampToValueAtTime(2349, t0 + 1.25);
      v.frequency.value = 6; vg.gain.value = 18; v.connect(vg); vg.connect(o.frequency); v.start(t0); v.stop(t0 + 1.6);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.2); g.gain.setValueAtTime(0.07, t0 + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
      o.connect(g); g.connect(lp); o.start(t0); o.stop(t0 + 1.65); noise(0.03, 0.2, 1.3, 'bandpass', 2400, 6);
    },
    // kakegoe: a voiced "yo-o" through two formants
    yoo() {
      if (!ac) return; const t0 = now(), o = ac.createOscillator(), f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t0); o.frequency.linearRampToValueAtTime(260, t0 + 0.35); o.frequency.linearRampToValueAtTime(170, t0 + 0.7);
      f1.type = 'bandpass'; f1.frequency.value = 480; f1.Q.value = 6; f2.type = 'bandpass'; f2.frequency.value = 860; f2.Q.value = 7;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.72);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(lp); o.start(t0); o.stop(t0 + 0.75);
    },
    // the tsuzumi: a skin struck once, pitch dropping fast
    pon() { tone(520, 'sine', 0.35, 0.002, 0.22, master, 0.55); noise(0.12, 0.001, 0.04, 'bandpass', 2400, 2); },
    cut() { noise(0.25, 0.004, 0.25, 'highpass', 2000, 0.7, 0, 6000); },
    strike(perfect) {
      // heavier steel + deeper taiko body
      noise(0.6, 0.002, 0.28, 'highpass', 2800, 0.7);
      for (const f of [2093, 3136, 4699]) tone(f, 'sine', perfect ? 0.14 : 0.1, 0.002, perfect ? 2.0 : 1.4, master);
      tone(75, 'sine', 1.05, 0.004, 1.15, master, 0.38, 0.05);   // deeper drop
      noise(0.55, 0.004, 0.7, 'lowpass', 240, 1, 0.05);
      tone(48, 'triangle', 0.7, 0.006, 1.4, master, 0.45, 0.08); // sub weight
      if (perfect) { tone(55, 'sine', 0.95, 0.004, 1.5, master, 0.42, 0.25); this.hyoshigi(0.55); }
    },
    clang() { for (const f of [1250, 1870, 2610]) tone(f, 'square', 0.04, 0.002, 0.35); noise(0.2, 0.002, 0.1, 'bandpass', 3200, 3); },
    hurt() { tone(120, 'sawtooth', 0.25, 0.005, 0.35, lp, 0.4); noise(0.3, 0.005, 0.3, 'lowpass', 1200); },
    kamae(onK) { if (onK) { noise(0.08, 0.002, 0.06, 'bandpass', 3000, 4); tone(1600, 'sine', 0.03, 0.002, 0.15); } },
    noto() { noise(0.1, 0.002, 0.05, 'bandpass', 2600, 5); noise(0.08, 0.002, 0.05, 'bandpass', 2000, 5, 0.09); },
    // zubaba: the blade tears the air (zu), then two heavy hits land (ba, ba), three on a perfect cut, all through the drive
    zubaba(perfect) {
      if (!ac) return; const n = perfect ? 3 : 2;
      noise(0.85, 0.002, 0.11, 'bandpass', 5200, 1.2, 0, 700, drive);              // zu: a falling tear
      noise(0.4, 0.001, 0.05, 'highpass', 3000, 0.7, 0.01, 0, drive);
      for (let k = 0; k < n; k++) {
        const d = 0.075 + k * 0.075, last = k === n - 1;
        noise(last ? 1.0 : 0.85, 0.002, last ? 0.32 : 0.2, 'lowpass', 1600, 0.8, d, 180, drive);   // ba: the body
        tone(last ? 120 : 150, 'sine', last ? 1.1 : 0.9, 0.003, last ? 0.55 : 0.32, drive, 0.3, d); // the thump under it
        noise(0.45, 0.001, 0.04, 'bandpass', 2600, 2, d, 0, drive);                                  // the edge of the hit
      }
      for (const f of [2093, 3136]) tone(f, 'sine', 0.06, 0.002, 0.9, master, 1, 0.08 + n * 0.075);
      tone(46, 'triangle', 0.8, 0.006, 1.2, master, 0.5, 0.08 + (n - 1) * 0.075);
    },
    // the draw: a fast rising steel hiss that ends in a ring
    draw() {
      noise(0.35, 0.004, 0.09, 'bandpass', 2500, 2, 0, 9000);
      for (const f of [3520, 5274]) tone(f, 'sine', 0.06, 0.002, 0.45, master, 1, 0.07);
    },
    // the blast: a crack, a sub-bass drop, a roaring body, crackling debris and a long rumble
    explode(perfect) {
      if (!ac) return; const K = perfect ? 1.35 : 1.05;
      noise(1.15 * K, 0.001, 0.1, 'highpass', 1600, 0.65);                         // the crack
      tone(95, 'sine', 1.35 * K, 0.004, 1.05, master, 0.25);                        // deeper drop
      tone(52, 'triangle', 1.05 * K, 0.005, 1.5, master, 0.42);                     // more weight
      noise(1.1 * K, 0.005, 1.7, 'lowpass', 1800, 0.75, 0, 140);                    // the roar
      noise(0.75 * K, 0.025, 3.4, 'lowpass', 110, 0.65, 0.04);                      // longer rumble
      for (let i = 0; i < (perfect ? 26 : 18); i++) { const d = 0.08 + Math.pow(Math.random(), 1.6) * 0.9; noise(0.28 + Math.random() * 0.22, 0.001, 0.04 + Math.random() * 0.05, 'bandpass', 2200 + Math.random() * 3800, 3, d); }
      if (perfect) { tone(48, 'sine', 1.0, 0.004, 1.7, master, 0.5, 0.15); this.hyoshigi(0.7); }
    },
    // a level crossing's bell, far or near
    fumikiri(k) { tone(740, 'square', 0.05 * k, 0.002, 0.16, lp); tone(1480, 'sine', 0.03 * k, 0.002, 0.12, lp); },
    // tsuke-uchi: wooden clappers struck on a board — battabatta... battari — for the mie
    tsuke(perfect) {
      const hits = perfect ? [0, 0.05, 0.1, 0.15, 0.2, 0.36] : [0, 0.06, 0.12, 0.28];
      hits.forEach((d, i) => { const last = i === hits.length - 1; noise(last ? 0.9 : 0.45, 0.001, last ? 0.09 : 0.04, 'bandpass', last ? 1500 : 1800, last ? 3 : 5, d); tone(last ? 520 : 640, 'square', last ? 0.12 : 0.05, 0.001, last ? 0.08 : 0.03, lp, 1, d); });
    },
    // the temple bell far off: low partials with a long decay
    bell() { for (const [f, a, dcy] of [[98, 0.12, 6], [196.5, 0.07, 4.5], [263, 0.05, 3.5], [348, 0.035, 2.5], [522, 0.02, 1.6]]) tone(f, 'sine', a, 0.01, dcy, master); },
    // higurashi: kana-kana-kana, a pulsing high call falling away
    higurashi() {
      if (!ac) return; const t0 = now(), o = ac.createOscillator(), g = ac.createGain(), am = ac.createOscillator(), amg = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(4300, t0); o.frequency.linearRampToValueAtTime(3700, t0 + 2.6);
      am.frequency.setValueAtTime(14, t0); am.frequency.linearRampToValueAtTime(9, t0 + 2.6); amg.gain.value = 0.5;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.022, t0 + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.8);
      const mod = ac.createGain(); mod.gain.value = 0.5; am.connect(amg); amg.connect(mod.gain);
      o.connect(mod); mod.connect(g); g.connect(master); o.start(t0); am.start(t0); o.stop(t0 + 2.9); am.stop(t0 + 2.9);
    },
    // hyoshigi: two hard wooden claps
    hyoshigi(delay = 0) { for (const d of [0, 0.16]) { noise(0.5, 0.001, 0.05, 'bandpass', 1900, 7, delay + d); tone(1150, 'square', 0.06, 0.001, 0.05, lp, 1, delay + d); } },
  };
})();
