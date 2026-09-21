'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const COL = ['#22d3ee', '#1f6bff', '#8b5cf6', '#f43f5e', '#22e39b', '#fbbf24', '#ffd23f'];

// Background particles + confetti/fireworks canvas. Exposes burst / rain / fireworks.
const FxLayer = forwardRef(function FxLayer(_, ref) {
  const fxRef = useRef(null);
  const bgRef = useRef(null);
  const parts = useRef([]);
  const timers = useRef([]);

  const api = useRef({
    burst(x, y, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, s = 3 + Math.random() * 9;
        parts.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, g: 0.18, life: 1, d: 0.012 + Math.random() * 0.012,
          c: COL[(Math.random() * COL.length) | 0], r: 2 + Math.random() * 4, t: Math.random() < 0.5 ? 0 : 1, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 });
      }
    },
    rain() {
      for (let i = 0; i < 140; i++) {
        parts.current.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 5, g: 0.05, life: 1, d: 0.004,
          c: COL[(Math.random() * COL.length) | 0], r: 4 + Math.random() * 5, t: 1, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 });
      }
    },
    fireworks(n) {
      for (let i = 0; i < n; i++) {
        timers.current.push(setTimeout(() => {
          const x = innerWidth * (0.12 + Math.random() * 0.76), y = innerHeight * (0.12 + Math.random() * 0.4), c = COL[(Math.random() * 6) | 0];
          for (let k = 0; k < 110; k++) {
            const a = (k / 110) * 6.283, s = 2 + Math.random() * 7;
            parts.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.07, life: 1, d: 0.011, c: Math.random() < 0.6 ? c : '#ffd23f', r: 2.4, t: 0, rot: 0, vr: 0, spark: 1 });
          }
        }, i * 380));
      }
      timers.current.push(setTimeout(() => api.current.rain(), 400));
    },
  });
  useImperativeHandle(ref, () => api.current, []);

  useEffect(() => {
    const fx = fxRef.current, g = fx.getContext('2d');
    const bg = bgRef.current, b = bg.getContext('2d');
    const dots = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random(), s: 0.0002 + Math.random() * 0.0004, r: 1 + Math.random() * 2.2 }));
    let mx = 0.5, my = 0.5, raf1, raf2;

    const fit = () => {
      fx.width = innerWidth * devicePixelRatio; fx.height = innerHeight * devicePixelRatio;
      g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      bg.width = innerWidth; bg.height = innerHeight;
    };
    const move = (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; };
    fit();
    addEventListener('resize', fit);
    addEventListener('pointermove', move);

    const loop = () => {
      g.clearRect(0, 0, innerWidth, innerHeight);
      g.globalCompositeOperation = 'source-over';
      parts.current = parts.current.filter((p) => p.life > 0 && p.y < innerHeight + 40);
      for (const p of parts.current) {
        p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.d;
        g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c;
        if (p.t) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); }
        else { g.shadowBlur = p.spark ? 12 : 0; g.shadowColor = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * Math.max(0.3, p.life), 0, 6.283); g.fill(); g.shadowBlur = 0; }
      }
      g.globalAlpha = 1;
      raf1 = requestAnimationFrame(loop);
    };
    const bgLoop = () => {
      b.clearRect(0, 0, bg.width, bg.height);
      for (const d of dots) {
        d.y -= d.s; if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
        const x = d.x * bg.width + (mx - 0.5) * 40 * d.z, y = d.y * bg.height + (my - 0.5) * 40 * d.z;
        b.fillStyle = `hsla(${(d.x * 360 + d.z * 90) % 360},90%,60%,${0.35 + d.z * 0.4})`;
        b.shadowBlur = 8; b.shadowColor = '#fff'; b.beginPath(); b.arc(x, y, d.r * d.z, 0, 6.283); b.fill();
      }
      raf2 = requestAnimationFrame(bgLoop);
    };
    loop(); bgLoop();
    const ts = timers.current;
    return () => {
      cancelAnimationFrame(raf1); cancelAnimationFrame(raf2);
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
