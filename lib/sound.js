// Sound effects synthesized with the Web Audio API — no audio files to download, tiny CPU cost.
// Browsers only allow audio after a user gesture, so unlock() is called on the first tap/click.

let ctx = null, master = null, muted = false;

const AC = () => (typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null);

function ensure() {
  if (ctx) return ctx;
  const Ctor = AC();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    const comp = ctx.createDynamicsCompressor();   // keeps overlapping notes from clipping
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(comp); comp.connect(ctx.destination);
  } catch { ctx = null; }
  return ctx;
}

export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setMuted(v) { muted = !!v; }
export const isMuted = () => muted;

// one note with a quick attack and exponential decay
function tone(freq, at, dur, { type = 'triangle', vol = 0.3, to = 0, lp = 0 } = {}) {
  const c = ctx, t0 = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = o;
  if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
  node.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function play(fn) {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  try { fn(); } catch { /* never let audio break the quiz */ }
}

// ✅ bright rising arpeggio + sparkle
export const correct = () => play(() => {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.085, 0.3, { type: 'triangle', vol: 0.32 }));
  tone(2093, 0.3, 0.35, { type: 'sine', vol: 0.09 });
});

// ❌ friendly "uh-oh": two soft descending marimba notes (no buzzing)
export const wrong = () => play(() => {
  [[392, 0], [293.66, 0.17]].forEach(([f, at]) => {
    tone(f, at, 0.32, { type: 'triangle', vol: 0.3 });
    tone(f * 2, at, 0.16, { type: 'sine', vol: 0.09 });   // short overtone = wooden "tok"
  });
});

// 🏆 short fanfare, held chord, then scattered sparkles
export const finale = (perfect = false) => play(() => {
  const m = [[523.25, 0, 0.12], [523.25, 0.13, 0.12], [523.25, 0.26, 0.12], [659.25, 0.4, 0.2], [783.99, 0.62, 0.2]];
  m.forEach(([f, at, d]) => tone(f, at, d, { type: 'triangle', vol: 0.3 }));
  tone(1046.5, 0.88, 1.1, { type: 'triangle', vol: 0.3 });
  [523.25, 659.25, 783.99].forEach((f) => tone(f, 0.88, 1.3, { type: 'sine', vol: 0.12 }));
  const sparkle = [1318.5, 1568, 1760, 2093, 2637, 2349, 1975, 2793];
  const n = perfect ? 8 : 5;
  for (let i = 0; i < n; i++) tone(sparkle[(Math.random() * sparkle.length) | 0], 1.3 + i * 0.16 + Math.random() * 0.06, 0.28, { type: 'sine', vol: 0.07 });
});
