'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const COL = ['#22d3ee', '#1f6bff', '#8b5cf6', '#f43f5e', '#22e39b', '#fbbf24', '#ffd23f'];
const root = () => document.documentElement;
const isLite = () => root().dataset.perf === 'lite';

// Background dots + confetti/fireworks.
// Performance notes (low-end phones):
//  - confetti canvas only runs while there are particles (zero cost when idle)
//  - particle counts / pixel density scale down in the "lite" tier; no canvas shadowBlur there
//  - dots are simple filled circles (no per-dot shadow), time-based so slow devices keep the same speed
//  - the page measures its own frame rate and steps down a tier if it can't keep up
const FxLayer = forwardRef(function FxLayer(_, ref) {
  const fxRef = useRef(null);
  const bgRef = useRef(null);
  const parts = useRef([]);
  const timers = useRef([]);
  const kick = useRef(() => {});

  const api = useRef({
    burst(x, y, n) {
      const k = isLite() ? 0.35 : 1;
      for (let i = 0; i < Math.round(n * k); i++) {
        const a = Math.random() * 6.283, s = 3 + Math.random() * 9;
        parts.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, g: 0.18, life: 1, d: 0.012 + Math.random() * 0.012,
          c: COL[(Math.random() * COL.length) | 0], r: 2 + Math.random() * 4, t: Math.random() < 0.5 ? 0 : 1, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 });
      }
      kick.current();
    },
    rain() {
      const n = isLite() ? 45 : 140;
      for (let i = 0; i < n; i++) {
        parts.current.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 5, g: 0.05, life: 1, d: 0.004,
          c: COL[(Math.random() * COL.length) | 0], r: 4 + Math.random() * 5, t: 1, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 });
      }
      kick.current();
    },
    fireworks(n) {
      const lite = isLite();
      if (lite) n = Math.min(n, 4);
      const per = lite ? 45 : 110;
      for (let i = 0; i < n; i++) {
        timers.current.push(setTimeout(() => {
          const x = innerWidth * (0.12 + Math.random() * 0.76), y = innerHeight * (0.12 + Math.random() * 0.4), c = COL[(Math.random() * 6) | 0];
          for (let k = 0; k < per; k++) {
            const a = (k / per) * 6.283, s = 2 + Math.random() * 7;
            parts.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.07, life: 1, d: 0.011, c: Math.random() < 0.6 ? c : '#ffd23f', r: 2.4, t: 0, rot: 0, vr: 0, spark: 1 });
          }
          kick.current();
        }, i * 380));
      }
      timers.current.push(setTimeout(() => api.current.rain(), 400));
    },
  });
  useImperativeHandle(ref, () => api.current, []);

  useEffect(() => {
    const fx = fxRef.current, g = fx.getContext('2d');
    const bg = bgRef.current, b = bg.getContext('2d');
    const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
    let dots = [], mx = 0.5, my = 0.5, raf1 = 0, raf2 = 0, running = false, alive = true, bgOn = true;

    const makeDots = () => {
      const n = isLite() ? 16 : 40;
      dots = Array.from({ length: n }, () => {
        const x = Math.random(), z = 0.3 + Math.random();
        return { x, y: Math.random(), z, s: 0.0002 + Math.random() * 0.0004, r: 1.2 + Math.random() * 2.2, c: `hsla(${(x * 360 + z * 90) % 360},90%,60%,${0.35 + z * 0.4})` };
      });
    };
    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, isLite() ? 1 : 2);
      fx.width = innerWidth * dpr; fx.height = innerHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      bg.width = innerWidth; bg.height = innerHeight;
    };
    const move = (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; };
    makeDots(); fit();
    addEventListener('resize', fit);
    if (fine) addEventListener('pointermove', move, { passive: true });

    /* confetti: runs only while particles exist */
    const loop = () => {
      const lite = isLite();
      g.clearRect(0, 0, innerWidth, innerHeight);
      parts.current = parts.current.filter((p) => p.life > 0 && p.y < innerHeight + 40);
      if (parts.current.length > (lite ? 260 : 900)) parts.current.splice(0, parts.current.length - (lite ? 260 : 900));
      for (const p of parts.current) {
        p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.d;
        g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c;
        if (p.t) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); }
        else if (lite) { const r = p.r * Math.max(0.4, p.life); g.fillRect(p.x - r, p.y - r, r * 2, r * 2); }
        else { g.shadowBlur = p.spark ? 12 : 0; g.shadowColor = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * Math.max(0.3, p.life), 0, 6.283); g.fill(); g.shadowBlur = 0; }
      }
      g.globalAlpha = 1;
      if (parts.current.length && alive) raf1 = requestAnimationFrame(loop);
      else { running = false; g.clearRect(0, 0, innerWidth, innerHeight); }
    };
    kick.current = () => { if (!running && alive) { running = true; raf1 = requestAnimationFrame(loop); } };

    /* background dots + self-measured frame rate */
    let last = performance.now(), skip = 0, sample = [], sampled = false;
    const bgLoop = (now) => {
      raf2 = requestAnimationFrame(bgLoop);
      const raw = now - last; last = now;

      if (!sampled && now > 1500) {             // ignore the first 1.5s (page load / hydration)
        sample.push(raw);
        if (sample.length >= 45) {
          sampled = true;
          const med = sample.sort((a, c) => a - c)[sample.length >> 1];
          if (!isLite() && med > 30) { root().dataset.perf = 'lite'; makeDots(); fit(); }
          else if (isLite() && med > 45) { root().dataset.ultra = ''; bgOn = false; b.clearRect(0, 0, bg.width, bg.height); }
        }
      }
      if (!bgOn) return;
      if (isLite() && (skip ^= 1)) return;      // lite: draw the dots at 30fps
      const dt = Math.min(raw, 64) / 16.7 * (isLite() ? 2 : 1);
      b.clearRect(0, 0, bg.width, bg.height);
      const px = fine ? 40 : 0;
      for (const d of dots) {
        d.y -= d.s * dt; if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
        b.fillStyle = d.c; b.beginPath();
        b.arc(d.x * bg.width + (mx - 0.5) * px * d.z, d.y * bg.height + (my - 0.5) * px * d.z, d.r * d.z, 0, 6.283); b.fill();
      }
    };
    raf2 = requestAnimationFrame(bgLoop);

    const ts = timers.current;
    return () => {
      alive = false; cancelAnimationFrame(raf1); cancelAnimationFrame(raf2);
      removeEventListener('resize', fit); removeEventListener('pointermove', move);
      ts.forEach(clearTimeout);
    };
  }, []);

  return (
    <>
      <div className="aurora"><i /><i /><i /><i /><i className="y" /></div>
      <div className="grid" />
      <canvas id="bg" ref={bgRef} />
      <canvas id="fx" ref={fxRef} />
    </>
  );
});

export default FxLayer;
