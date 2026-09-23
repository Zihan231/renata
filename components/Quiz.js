'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import FxLayer from './FxLayer';
import Header from './Header';
import { BANK, BRANDS, TOTAL, shuffle } from '@/lib/questions';
import { normalizeBdPhone, PHONE_ERROR } from '@/lib/phone';
import * as sfx from '@/lib/sound';

const MARK_OK = 'M38 62 L54 78 L84 44';
const MARK_NO = 'M42 42 L78 78 M78 42 L42 78';
const GOOD = ['Brilliant!', 'Spot on!', 'Excellent!', 'Nailed it!'];
const BAD = ['Oops, not quite!', 'Almost there!', 'Not this one!'];
const MSGS = ['Great effort! 🥳', 'Well done! 🎇', 'Perfect score!🌟'];
const CIRC = 502;

const makeOrder = (item) => shuffle(item.o.map((t, i) => ({ t, ok: i === item.a })));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export default function Quiz() {
  const fx = useRef(null);
  const cardRef = useRef(null);
  const timers = useRef([]);
  const lock = useRef(false);
  const stat = useRef({ tries: 0, first: 0, missed: false, missedQ: [] });

  const [screen, setScreen] = useState('reg');
  const [leaving, setLeaving] = useState(false);
  const [shake, setShake] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '' });
  const [err, setErr] = useState({ field: '', msg: '' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState({ name: '', id: null });

  const [qs, setQs] = useState([]);
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [qkey, setQkey] = useState(0);
  const [order, setOrder] = useState([]);
  const [picked, setPicked] = useState(null);
  const [fb, setFb] = useState({ show: false, ok: true, title: '', text: '', btn: '', last: false });

  const [res, setRes] = useState({ first: 0, tries: 0, missedQ: [] });
  const [ringOn, setRingOn] = useState(false);
  const [count, setCount] = useState(0);
  const [muted, setMuted] = useState(false);

  const later = useCallback((fn, ms) => { timers.current.push(setTimeout(fn, ms)); }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // sound: unlock audio on the first tap (browser autoplay rules), restore the saved mute choice
  useEffect(() => {
    try { const m = localStorage.getItem('renata-mute') === '1'; setMuted(m); sfx.setMuted(m); } catch {}
    const unlock = () => sfx.unlock();
    addEventListener('pointerdown', unlock, { once: true });
    addEventListener('keydown', unlock, { once: true });
    return () => { removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock); };
  }, []);
  const toggleMute = () => {
    const m = !muted; setMuted(m); sfx.setMuted(m);
    try { localStorage.setItem('renata-mute', m ? '1' : '0'); } catch {}
    if (!m) { sfx.unlock(); sfx.correct(); }
  };

  // 3D tilt on the card following the pointer
  useEffect(() => {
    // tilt only with a mouse on a capable device (touch screens fire pointermove on every swipe)
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches || document.documentElement.dataset.perf === 'lite') return;
    const move = (e) => {
      const c = cardRef.current; if (!c) return;
      c.style.transform = `rotateY(${(e.clientX / innerWidth - 0.5) * 7}deg) rotateX(${(0.5 - e.clientY / innerHeight) * 6}deg)`;
    };
    addEventListener('pointermove', move);
    return () => removeEventListener('pointermove', move);
  }, []);

  // screen transition: fade current out, then swap
  const go = useCallback((next) => {
    document.body.classList.toggle('playing', next === 'quiz');
    document.body.classList.toggle('result', next === 'res');
    setLeaving(true);
    later(() => { setScreen(next); setLeaving(false); }, 420);
  }, [later]);

  /* ---------- 1. register ---------- */
  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const name = form.name.trim(), phone = normalizeBdPhone(form.phone);
    let bad = null;
    if (name.length < 2) bad = { field: 'name', msg: 'Please enter your name.' };
    else if (!phone) bad = { field: 'phone', msg: PHONE_ERROR };
    setErr(bad || { field: '', msg: '' });
    if (bad) return;

    setSaving(true);
    let id = null;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 15000);
      const r = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }), signal: ctl.signal });
      clearTimeout(t);
      if (r.ok) id = (await r.json()).id;
      else console.warn('Could not save participant to Excel');
    } catch (e2) { console.warn('Could not save participant', e2); }
    setSaving(false);
    setUser({ name, id });
    go('hello');
    later(() => fx.current?.burst(innerWidth / 2, innerHeight * 0.35, 90), 700);
  };

  /* ---------- 2. start ---------- */
  const start = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    fx.current?.burst(r.left + r.width / 2, r.top + r.height / 2, 70);
    const chosen = shuffle(BANK).slice(0, TOTAL);
    stat.current = { tries: 0, first: 0, missed: false, missedQ: [] };
    lock.current = false;
    setQs(chosen); setIdx(0); setProgress(0); setPicked(null); setOrder(makeOrder(chosen[0])); setQkey((k) => k + 1);
    later(() => go('quiz'), 250);
  };

  /* ---------- 3. quiz ---------- */
  const answer = (i, ok, ev) => {
    if (lock.current) return;
    lock.current = true; stat.current.tries++;
    setPicked({ i, ok });
    const r = ev.currentTarget.getBoundingClientRect();
    if (ok) {
      if (!stat.current.missed) stat.current.first++;
      fx.current?.burst(r.left + r.width / 2, r.top + r.height / 2, 120);
      sfx.correct();
      later(() => feedback(true), 650);
    } else {
      stat.current.missed = true; stat.current.missedQ[idx] = true;
      setShake(true); later(() => setShake(false), 600);
      sfx.wrong();
      navigator.vibrate?.(200);
      later(() => feedback(false), 650);
    }
  };

  const feedback = (ok) => {
    const last = idx === TOTAL - 1;
    setFb({
      show: true, ok, last,
      title: pick(ok ? GOOD : BAD),
      text: ok ? (last ? 'That was the final question!' : 'Get ready for the next question…') : "That's not the right answer. Give it another shot.",
      btn: ok ? (last ? 'See my score 🏆' : 'Next question →') : '↻ Try again',
    });
    if (ok) { fx.current?.rain(); fx.current?.burst(innerWidth / 2, innerHeight / 2, 160); }
  };

  const fbClick = () => {
    setFb((f) => ({ ...f, show: false }));
    if (fb.ok) {
      if (fb.last) { setProgress(TOTAL); later(finish, 300); return; }
      setLeaving(true);
      later(() => {
        const n = idx + 1;
        setIdx(n); setProgress(n); setOrder(makeOrder(qs[n])); setPicked(null); setQkey((k) => k + 1);
        lock.current = false; stat.current.missed = false;
        setLeaving(false);
      }, 420);
    } else {
      setOrder(makeOrder(qs[idx])); setPicked(null); setQkey((k) => k + 1);
      lock.current = false;
    }
  };

  /* ---------- 4. result ---------- */
  const finish = () => {
    const { first, tries, missedQ } = stat.current;
    setRes({ first, tries, missedQ: [...missedQ] });
    setRingOn(false); setCount(0);
    go('res');
    if (user.id) {
      fetch('/api/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ id: user.id, score: first, attempts: tries }) }).catch(() => {});
    }
  };

  useEffect(() => {
    if (screen !== 'res') return;
    const t = setTimeout(() => {
      setRingOn(true);
      let n = 0;
      const iv = setInterval(() => {
        if (n >= res.first) { clearInterval(iv); return; }
        n++; setCount(n);
      }, 2000 / Math.max(1, res.first) / 1.5);
      timers.current.push(iv);
      fx.current?.fireworks(res.first === TOTAL ? 9 : 5);
      sfx.finale(res.first === TOTAL);
    }, 700);
    return () => clearTimeout(t);
  }, [screen, res.first]);

  const again = () => {
    setForm({ name: '', phone: '' }); setErr({ field: '', msg: '' }); setRingOn(false); setCount(0);
    document.body.classList.remove('result', 'playing');
    go('reg');
  };

  const out = leaving ? ' out' : '';
  const q = qs[Math.min(idx, TOTAL - 1)];
  const first = res.first;
  const tiles = BRANDS.map(([n, c], i) => (
    <div className="tile" style={{ '--c': c, '--i': i }} key={n}><div className="in"><img src={`/img/${n}_PNG.png`} alt={n} width="180" height="80" decoding="async" /></div></div>
  ));

  return (
    <>
      <FxLayer ref={fx} />
      <button className="snd" onClick={toggleMute} aria-label={muted ? 'Unmute sound' : 'Mute sound'} title={muted ? 'Sound off' : 'Sound on'}>{muted ? '🔇' : '🔊'}</button>
      <div className="stage">
        <Header />

        <div className={`card${shake ? ' shake' : ''}`} ref={cardRef}>
          {/* 1: register */}
          {screen === 'reg' && (
            <section className={`screen active${out}`}>
              <h1>Bioequivalence <span className="grad">Challenge</span></h1>
              <p className="sub">Enter your details to begin. 3 questions. Are you ready?</p>
              <form onSubmit={submit} noValidate>
                <div className={`field${err.field === 'name' ? ' err' : ''}`}>
                  <input id="name" placeholder=" " autoComplete="name" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <label htmlFor="name">Your full name</label>
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>
                </div>
                <div className={`field${err.field === 'phone' ? ' err' : ''}`}>
                  <input id="phone" placeholder=" " type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <label htmlFor="phone">Phone number</label>
                  <svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg>
                </div>
                <div className="errmsg">{err.msg}</div>
                <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Continue →'}</button>
              </form>
            </section>
          )}

          {/* 2: greeting + start */}
          {screen === 'hello' && (
            <section className={`screen active${out}`}>
              <div className="hello">
                <div className="avatar">{user.name[0]?.toUpperCase()}</div>
                <div className="chip-wrap"><span className="chip"><b /> Registered</span></div>
                <h1>Hello, <span className="grad">{user.name.split(' ')[0]}</span> <span className="w">👋</span></h1>
                <p className="sub">Welcome to Bio Equivalent Challenge. Answer correctly to move forward — a wrong answer lets you try again.</p>
                <div className="rules"><div><b>3</b>Questions</div><div><b>4</b>Options each</div><div><b>∞</b>Retries</div></div>
                <button className="btn big" onClick={start}>🚀 Start Quiz</button>
              </div>
            </section>
          )}

          {/* 3: quiz */}
          {screen === 'quiz' && q && (
            <section className={`screen active${out}`} key={`q${idx}`}>
              <div className="top">
                <div className="steps">
                  {qs.map((_, i) => <span key={i} className={i < progress ? 'done' : i === progress ? 'cur' : ''} />)}
                </div>
                <div className="qn">Q {Math.min(idx + 1, TOTAL)} / {TOTAL}</div>
              </div>
              <div className="q">{q.q}</div>
              <div className="opts">
                {order.map((o, i) => {
                  let cls = 'opt';
                  if (picked) {
                    if (picked.i === i) cls += picked.ok ? ' right' : ' wrong';
                    else if (picked.ok) cls += ' dim';
                  }
                  return (
                    <button key={`${qkey}-${i}`} className={cls} style={{ animationDelay: `${0.15 + i * 0.09}s` }} disabled={!!picked} onClick={(e) => answer(i, o.ok, e)}>
                      <i>{'ABCD'[i]}</i><span>{o.t}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4: result */}
          {screen === 'res' && (
            <section className={`screen active${out}`}>
              <div className="res">
                <div className="rl">
                  <div className="trophy">🏆</div>
                  <h1 style={{ marginTop: 8 }}>Congratulations, <span className="grad">{user.name.split(' ')[0]}</span>!</h1>
                  <p className="sub">{MSGS[first === TOTAL ? 2 : first >= 2 ? 1 : 0]}</p>
                  <div className="score">
                    <svg viewBox="0 0 180 180">
                      <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22d3ee" /><stop offset="1" stopColor="#a78bfa" /></linearGradient></defs>
                      <circle className="bgc" cx="90" cy="90" r="80" />
                      <circle className="fg" cx="90" cy="90" r="80" style={{ strokeDashoffset: ringOn ? CIRC * (1 - first / TOTAL) : CIRC }} />
                    </svg>
                    <div className="n"><span>{count}<small>/3</small></span></div>
                  </div>
                  <div className="stars">
                    {[0, 1, 2].map((i) => <span key={i} className={i < Math.max(1, first) ? '' : 'off'} style={{ animationDelay: `${1.2 + i * 0.3}s` }}>⭐</span>)}
                  </div>
                  <div className="meta"><div>Total attempts <b>{res.tries}</b></div><div>First-try correct <b>{first} / {TOTAL}</b></div></div>
                  <button className="btn" onClick={again}>↻ Play Again</button>
                </div>
                <div className="review">
                  <h4>Your questions &amp; correct answers</h4>
                  {qs.map((it, i) => (
                    <div className="ri" key={i} style={{ animationDelay: `${1.2 + i * 0.25}s` }}>
                      <div className="no">{i + 1}</div>
                      <div>
                        <div className="qq">{it.q}</div>
                        <div className="aa">{it.o[it.a]}</div>
                        <small>{res.missedQ[i] ? 'Corrected after retry' : 'Correct on first try ⚡'}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="showcase">
          <h3><span>Renata Oncology Bio equivalent Products</span></h3>
          <div className="marquee"><div className="track">{tiles}{tiles}</div></div>
        </div>
      </div>

      {/* feedback overlay */}
      <div className={`fb ${fb.show ? 'show ' : ''}${fb.ok ? 'good' : 'bad'}`}>
        <div className="fb-box">
          <div className={`fb-icon${fb.ok ? '' : ' thud'}`}>
            <div className="glow" />
            <svg viewBox="0 0 120 120"><circle className="ring" cx="60" cy="60" r="54" /><path className="mark" d={fb.ok ? MARK_OK : MARK_NO} /></svg>
          </div>
          <h2>{fb.title}</h2>
          <p>{fb.text}</p>
          <button className="btn" onClick={fbClick}>{fb.btn}</button>
        </div>
      </div>
    </>
  );
}
