// Tiny WebAudio synth for cartoon SFX. No assets.
let ac = null, master = null, muted = false;
function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
export function unlockAudio() { ctx(); }
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }
export function isMuted() { return muted; }

function tone({ f = 440, f2, type = 'square', t = 0.1, v = 0.3, a = 0.005, d, delay = 0, curve = 'exp' }) {
  const c = ctx(); if (!c || muted) return;
  const o = c.createOscillator(), g = c.createGain();
  const t0 = c.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (f2) (curve === 'exp' ? o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + t) : o.frequency.linearRampToValueAtTime(f2, t0 + t));
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + (d || t));
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + (d || t) + 0.05);
}
function noise({ t = 0.1, v = 0.3, hp = 800, lp = 6000, delay = 0 }) {
  const c = ctx(); if (!c || muted) return;
  const n = Math.floor(c.sampleRate * t), buf = c.createBuffer(1, n, c.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(); s.buffer = buf;
  const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp;
  const l = c.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp;
  const g = c.createGain(); g.gain.value = v;
  s.connect(h); h.connect(l); l.connect(g); g.connect(master); s.start(c.currentTime + delay);
}

export const sfx = {
  click() { tone({ f: 600, f2: 900, type: 'triangle', t: 0.06, v: 0.2 }); },
  chop(p = 1) { noise({ t: 0.08, v: 0.35, hp: 400, lp: 3000 }); tone({ f: 180 * p, f2: 80, type: 'square', t: 0.08, v: 0.25 }); },
  crit() { noise({ t: 0.12, v: 0.4, hp: 300, lp: 5000 }); tone({ f: 500, f2: 150, type: 'sawtooth', t: 0.15, v: 0.3 }); tone({ f: 900, f2: 1400, type: 'triangle', t: 0.12, v: 0.2, delay: 0.03 }); },
  knot() { tone({ f: 700, f2: 1200, type: 'triangle', t: 0.1, v: 0.25 }); tone({ f: 1200, f2: 1800, type: 'triangle', t: 0.12, v: 0.2, delay: 0.08 }); },
  creak() { tone({ f: 120, f2: 60, type: 'sawtooth', t: 0.5, v: 0.15 }); },
  fall() { noise({ t: 0.5, v: 0.5, hp: 80, lp: 1200 }); tone({ f: 90, f2: 35, type: 'square', t: 0.45, v: 0.35 }); },
  log() { tone({ f: 300, f2: 420, type: 'triangle', t: 0.08, v: 0.2 }); },
  coin() { tone({ f: 1046, type: 'square', t: 0.08, v: 0.15 }); tone({ f: 1568, type: 'square', t: 0.2, v: 0.15, delay: 0.07 }); },
  buy() { [523, 659, 784, 1046].forEach((f, i) => tone({ f, type: 'triangle', t: 0.12, v: 0.2, delay: i * 0.07 })); },
  nope() { tone({ f: 200, f2: 120, type: 'square', t: 0.2, v: 0.2 }); },
  jump() { tone({ f: 300, f2: 700, type: 'triangle', t: 0.18, v: 0.25 }); },
  land() { noise({ t: 0.08, v: 0.2, hp: 100, lp: 800 }); },
  swing() { noise({ t: 0.12, v: 0.25, hp: 1500, lp: 8000 }); tone({ f: 800, f2: 300, type: 'sine', t: 0.12, v: 0.15 }); },
  crash() { noise({ t: 0.35, v: 0.6, hp: 100, lp: 2500 }); tone({ f: 150, f2: 40, type: 'sawtooth', t: 0.35, v: 0.35 }); },
  boost() { tone({ f: 200, f2: 1200, type: 'sawtooth', t: 0.4, v: 0.2 }); noise({ t: 0.4, v: 0.15, hp: 2000, lp: 9000 }); },
  drift() { noise({ t: 0.1, v: 0.08, hp: 3000, lp: 9000 }); },
  moo() { tone({ f: 160, f2: 120, type: 'sawtooth', t: 0.5, v: 0.2, a: 0.08 }); tone({ f: 240, f2: 180, type: 'triangle', t: 0.5, v: 0.12, a: 0.08 }); },
  fanfare() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone({ f, type: 'square', t: 0.15, v: 0.15, delay: i * 0.1 })); },
  pancake() { tone({ f: 880, f2: 1320, type: 'sine', t: 0.1, v: 0.2 }); },
  tick() { tone({ f: 1500, type: 'sine', t: 0.03, v: 0.1 }); },
};

// Engine / gallop loop for the trail
let gallop = null;
export function startGallop() {
  const c = ctx(); if (!c || gallop) return;
  const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
  o.type = 'triangle'; o.frequency.value = 70; g.gain.value = 0;
  lfo.type = 'square'; lfo.frequency.value = 6; lg.gain.value = 0.06; lfo.connect(lg); lg.connect(g.gain);
  o.connect(g); g.connect(master); o.start(); lfo.start();
  gallop = { o, g, lfo };
}
export function setGallop(speed01) {
  if (!gallop || !ac) return;
  gallop.lfo.frequency.setTargetAtTime(3 + speed01 * 8, ac.currentTime, 0.1);
  gallop.o.frequency.setTargetAtTime(60 + speed01 * 50, ac.currentTime, 0.1);
  gallop.g.gain.setTargetAtTime(muted ? 0 : 0.03 + speed01 * 0.06, ac.currentTime, 0.1);
}
export function stopGallop() {
  if (!gallop) return;
  try { gallop.o.stop(); gallop.lfo.stop(); } catch (e) {}
  gallop = null;
}
