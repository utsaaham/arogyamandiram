"use client";
import { useState, useEffect, useRef, MutableRefObject } from "react";

type Line = { t: string; r?: string; b?: boolean; c?: string };

/* ── Hook ── */
function useFade(t = 0.1): [MutableRefObject<any>, boolean] {
  const ref = useRef<any>(null);
  const [v, set] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { set(true); o.disconnect(); } }, { threshold: t });
    o.observe(el);
    return () => o.disconnect();
  }, [t]);
  return [ref, v] as const;
}

/* ── Icons ── */
const Ic = {
  arrow: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  check: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  fork: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M21 15v7"/></svg>,
  drop: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 007 7z"/></svg>,
  moon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  zap: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  scale: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10M4 8l8 9 8-9"/></svg>,
  spark: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.8a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-1.9a2 2 0 001.3-1.3L12 3z"/></svg>,
  flame: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 002.5 2.5z"/></svg>,
};

const MARQUEE = "Dal Makhani · Butter Chicken · Biryani · Chole Bhature · Poha · Paneer Tikka · Dosa · Idli Sambar · Aloo Paratha · Rajma Chawal · Masala Chai · AI Food Logger · Sleep Journal · Workout Streaks · Water Tracking · AI Insights · Weight Trends · Calorie Ring".split(" · ");

export default function Landing() {
  const [h, hv] = useFade(0.05);
  const [mk, mkv] = useFade(0.3);
  const [st, stv] = useFade();
  const [ft, ftv] = useFade(0.06);
  const [ai, aiv] = useFade(0.06);
  const [sp, spv] = useFade();
  const [ct, ctv] = useFade();

  const R = 52, C = 2 * Math.PI * R, pct = 1840 / 2200;
  const rv = (vis: boolean, cls = "") => `lp-reveal ${vis ? "vis" : ""} ${cls}`;

  return (
      <>
        {/* ── Inline all styles (for artifact preview; use landing.css in production) ── */}
        <style dangerouslySetInnerHTML={{ __html: `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#060806;--s1:#0C0F0D;--s2:#121614;--s3:#1A1F1C;--g:#1EDD8B;--g-dim:#16B471;--g-glow:rgba(30,221,139,0.15);--g-glow2:rgba(30,221,139,0.06);--t1:#F0EEEB;--t2:#9B9990;--t3:#5C5A53;--br:rgba(255,255,255,0.06);--font-body:'Inter',system-ui,sans-serif;--font-display:'Outfit',system-ui,sans-serif}
html,body,#root{margin:0;padding:0;background:var(--bg);color:var(--t1);font-family:var(--font-body);-webkit-font-smoothing:antialiased;overflow-x:hidden}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.05);border-radius:2px}
a{color:inherit;text-decoration:none}
.lp-wrap{max-width:1120px;margin:0 auto;padding:0 28px}

/* HERO */
.lp-hero{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:100px 28px 60px;overflow:hidden}
.lp-hero-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-55%);width:800px;height:600px;background:radial-gradient(ellipse,rgba(30,221,139,0.07) 0%,transparent 65%);pointer-events:none;z-index:0}
.lp-hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px);background-size:72px 72px;mask-image:radial-gradient(ellipse 60% 50% at 50% 40%,black 20%,transparent 70%);-webkit-mask-image:radial-gradient(ellipse 60% 50% at 50% 40%,black 20%,transparent 70%);pointer-events:none;z-index:0}

/* App name */
.lp-appname{font-family:var(--font-display);font-weight:800;font-size:clamp(48px,10vw,120px);letter-spacing:-0.04em;line-height:0.95;position:relative;z-index:1;background:linear-gradient(135deg,#1EDD8B 0%,#0fa968 40%,#1EDD8B 80%,#7EFCBA 100%);background-size:200% 200%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:lp-gs 6s ease-in-out infinite}
@keyframes lp-gs{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}

.lp-hero-sub{font-size:12px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:var(--t3);margin-top:14px;position:relative;z-index:1}
.lp-hero-headline{font-family:var(--font-display);font-weight:400;font-size:clamp(20px,3vw,36px);line-height:1.35;color:var(--t2);margin-top:36px;max-width:560px;position:relative;z-index:1}
.lp-hero-headline em{font-style:normal;color:var(--t1);font-weight:600}

/* Buttons */
.lp-btn-p{display:inline-flex;align-items:center;gap:8px;padding:13px 30px;border-radius:9px;background:var(--g);color:var(--bg);font-family:var(--font-body);font-size:14px;font-weight:600;border:none;cursor:pointer;transition:all .25s cubic-bezier(.16,1,.3,1);position:relative;overflow:hidden}
.lp-btn-p::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);background-size:250% 250%;animation:lp-sh 4s ease-in-out infinite;pointer-events:none}
@keyframes lp-sh{0%,100%{background-position:200% 200%}50%{background-position:-50% -50%}}
.lp-btn-p:hover{background:#25F09A;transform:translateY(-2px);box-shadow:0 6px 30px rgba(30,221,139,0.25)}
.lp-btn-g{display:inline-flex;align-items:center;gap:6px;padding:13px 26px;border-radius:9px;background:transparent;color:var(--t2);font-family:var(--font-body);font-size:14px;font-weight:500;border:1px solid var(--br);cursor:pointer;transition:all .25s}
.lp-btn-g:hover{background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.12);color:var(--t1)}

/* Trust */
.lp-trust{display:flex;gap:20px;flex-wrap:wrap;justify-content:center;margin-top:24px;position:relative;z-index:1}
.lp-trust span{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--t3)}

/* Reveal */
.lp-reveal{opacity:0;transform:translateY(28px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
.lp-reveal.vis{opacity:1;transform:translateY(0)}
.lp-d1{transition-delay:.06s}.lp-d2{transition-delay:.12s}.lp-d3{transition-delay:.18s}.lp-d4{transition-delay:.24s}.lp-d5{transition-delay:.3s}.lp-d6{transition-delay:.36s}

/* Marquee */
@keyframes lp-mq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.lp-mq-wrap{border-top:1px solid var(--br);border-bottom:1px solid var(--br);padding:16px 0;overflow:hidden;position:relative}
.lp-mq-wrap::before,.lp-mq-wrap::after{content:'';position:absolute;top:0;bottom:0;width:80px;z-index:2;pointer-events:none}
.lp-mq-wrap::before{left:0;background:linear-gradient(90deg,var(--bg),transparent)}
.lp-mq-wrap::after{right:0;background:linear-gradient(270deg,var(--bg),transparent)}
.lp-mq-track{display:flex;gap:48px;animation:lp-mq 45s linear infinite;white-space:nowrap}
.lp-mq-item{font-family:var(--font-display);font-weight:600;font-size:13px;color:var(--t3);display:flex;align-items:center;gap:48px;flex-shrink:0}
.lp-mq-dot{width:4px;height:4px;border-radius:50%;background:var(--g);opacity:.3;flex-shrink:0}

/* Mockup */
.lp-mock-sec{padding:0 28px 80px;display:flex;justify-content:center;position:relative}
.lp-mock{width:100%;max-width:780px;background:var(--s1);border:1px solid var(--br);border-radius:20px;padding:14px;position:relative;overflow:hidden}
.lp-mock::before{content:'';position:absolute;inset:-1px;border-radius:21px;background:conic-gradient(from 180deg,transparent,var(--g-glow),transparent,var(--g-glow),transparent);z-index:-1;animation:lp-br 8s linear infinite;opacity:.4}
@keyframes lp-br{to{transform:rotate(360deg)}}
.lp-mock-in{background:var(--s2);border:1px solid var(--br);border-radius:14px;padding:16px}
.lp-mock-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.lp-mock-cell{background:var(--s1);border:1px solid var(--br);border-radius:10px;padding:12px;text-align:center}

/* Section headers */
.lp-slbl{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--g);margin-bottom:14px}
.lp-stitle{font-family:var(--font-display);font-weight:700;font-size:clamp(30px,4vw,48px);letter-spacing:-.03em;line-height:1.1;color:var(--t1);max-width:520px}
.lp-stitle .em{color:var(--g)}

/* Stats */
.lp-stats{border-top:1px solid var(--br);border-bottom:1px solid var(--br);padding:40px 0}
.lp-stats-row{display:grid;grid-template-columns:repeat(4,1fr)}
.lp-stat{text-align:center;padding:12px 16px;position:relative}
.lp-stat+.lp-stat::before{content:'';position:absolute;left:0;top:20%;height:60%;width:1px;background:var(--br)}
.lp-stat-n{font-family:var(--font-display);font-weight:700;font-size:clamp(32px,5vw,52px);letter-spacing:-.03em;color:var(--t1);line-height:1}
.lp-stat-l{font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--t3);margin-top:6px}

/* Features */
.lp-ft-sec{padding:100px 0}
.lp-ft-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--br);border:1px solid var(--br);border-radius:16px;overflow:hidden}
.lp-ft-cell{background:var(--s1);padding:28px 24px;transition:background .3s;position:relative}
.lp-ft-cell:hover{background:var(--s2)}
.lp-ft-cell::after{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:var(--g);opacity:0;transition:opacity .3s,left .3s,right .3s}
.lp-ft-cell:hover::after{opacity:.4;left:10%;right:10%}

/* AI terminals */
.lp-ai-sec{padding:80px 0 100px;border-top:1px solid var(--br)}
.lp-ai-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.lp-term{background:#070907;border:1px solid rgba(255,255,255,0.04);border-radius:14px;overflow:hidden;transition:border-color .3s}
.lp-term:hover{border-color:rgba(255,255,255,0.08)}
.lp-term-bar{padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:6px}
.lp-term-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.06)}
.lp-term-lbl{margin-left:auto;display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600}
@keyframes lp-bk{0%,100%{opacity:1}50%{opacity:0}}
.lp-cur{display:inline-block;width:2px;height:13px;background:var(--g);margin-left:2px;vertical-align:text-bottom;animation:lp-bk 1s step-start infinite}

/* Steps */
.lp-sp-sec{padding:80px 0 100px;border-top:1px solid var(--br)}
.lp-sp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.lp-sp{background:var(--s1);border:1px solid var(--br);border-radius:14px;padding:32px 24px 24px;position:relative;transition:border-color .3s}
.lp-sp:hover{border-color:rgba(255,255,255,0.1)}

/* CTA */
.lp-cta-sec{padding:80px 28px 100px;text-align:center;border-top:1px solid var(--br);position:relative;overflow:hidden}

/* Particles */
@keyframes lp-f1{0%,100%{transform:translate(0,0)}25%{transform:translate(15px,-25px)}50%{transform:translate(-10px,-40px)}75%{transform:translate(20px,-15px)}}
@keyframes lp-f2{0%,100%{transform:translate(0,0)}33%{transform:translate(-20px,-30px)}66%{transform:translate(15px,-20px)}}
@keyframes lp-f3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(10px,-35px) scale(1.2)}}
.lp-pt{position:absolute;border-radius:50%;background:var(--g);pointer-events:none;z-index:0}

/* Footer */
.lp-foot{border-top:1px solid var(--br);padding:24px;text-align:center;font-size:12px;color:var(--t3)}
.lp-foot a{color:var(--g-dim)}

@media(max-width:768px){
  .lp-stats-row{grid-template-columns:repeat(2,1fr)!important}
  .lp-stat+.lp-stat::before{display:none}
  .lp-ft-grid,.lp-ai-grid,.lp-sp-grid{grid-template-columns:1fr!important}
  .lp-mock-grid{grid-template-columns:1fr 1fr!important}
  .lp-hero .lp-ctas{flex-direction:column;align-items:center}
  .lp-hero{padding:80px 20px 50px}
  .lp-appname{font-size:clamp(34px,8.5vw,52px)!important;letter-spacing:-0.02em!important}
  .lp-mock-sec{padding:0 16px 60px}
  .lp-mock-top-row{gap:12px!important}
  .lp-mock-recent{display:none!important}
  .lp-mock-in{padding:12px!important}
  .lp-mock-grid{grid-template-columns:repeat(3,1fr)!important;gap:6px!important}
  .lp-mock-cell{padding:10px 8px!important}
  .lp-ring-num{font-size:12px!important}
}
@media(min-width:769px)and(max-width:1024px){
  .lp-ft-grid{grid-template-columns:repeat(2,1fr)!important}
}
      ` }} />

        <div style={{ minHeight: "100vh" }}>

          {/* ═══ HERO ═══ */}
          <section className="lp-hero" ref={h}>
            <div className="lp-hero-glow" />
            <div className="lp-hero-grid" />

            {/* Floating particles */}
            <div className="lp-pt" style={{ width: 3, height: 3, opacity: 0.15, top: "30%", left: "15%", animation: "lp-f1 12s ease-in-out infinite" }} />
            <div className="lp-pt" style={{ width: 2, height: 2, opacity: 0.1, top: "60%", right: "20%", animation: "lp-f2 16s ease-in-out infinite" }} />
            <div className="lp-pt" style={{ width: 4, height: 4, opacity: 0.07, top: "45%", left: "70%", animation: "lp-f3 20s ease-in-out infinite" }} />
            <div className="lp-pt" style={{ width: 2, height: 2, opacity: 0.12, top: "25%", right: "30%", animation: "lp-f1 14s ease-in-out infinite reverse" }} />
            <div className="lp-pt" style={{ width: 3, height: 3, opacity: 0.06, bottom: "30%", left: "25%", animation: "lp-f2 18s ease-in-out infinite" }} />

            {/* App Name — massive t72t-style */}
            <div className={rv(hv)}>
              <h1 className="lp-appname">AROGYAMANDIRAM</h1>
            </div>

            <p className={rv(hv, "lp-d1")} style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--t3)", marginTop: 14, position: "relative", zIndex: 1 }}>
              Health &amp; Wellness
            </p>

            <p className={rv(hv, "lp-d2")} style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "clamp(20px, 3vw, 34px)", lineHeight: 1.35, color: "var(--t2)", marginTop: 36, maxWidth: 560, position: "relative", zIndex: 1, textAlign: "center" }}>
              Track calories, water, sleep, workouts and weight — <em style={{ fontStyle: "normal", color: "var(--t1)", fontWeight: 600 }}>built for Indian lifestyles</em>, powered by AI.
            </p>

            <div className={`${rv(hv, "lp-d3")} lp-ctas`} style={{ display: "flex", gap: 12, marginTop: 44, position: "relative", zIndex: 1 }}>
              <a href="/register" className="lp-btn-p">Get started free {Ic.arrow}</a>
              <a href="/login" className="lp-btn-g">Sign in</a>
            </div>

            <div className={rv(hv, "lp-d4")} style={{ marginTop: 24, position: "relative", zIndex: 1 }}>
              <div className="lp-trust">
                {["Free forever", "No ads", "Your data stays yours"].map(t => (
                    <span key={t}><span style={{ color: "var(--g)" }}>{Ic.check}</span>{t}</span>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ MARQUEE ═══ */}
          <div className="lp-mq-wrap" ref={mk}>
            <div className="lp-mq-track">
              {[...MARQUEE, ...MARQUEE].map((item, i) => (
                  <span key={i} className="lp-mq-item">{item}<span className="lp-mq-dot" /></span>
              ))}
            </div>
          </div>

          {/* ═══ MOCKUP ═══ */}
          <div className="lp-mock-sec" style={{ paddingTop: 80, position: "relative" }}>
            {/* Section glow */}
            <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(30,221,139,0.05) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 780, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <p className={`lp-slbl ${rv(mkv)}`} style={{ margin: 0 }}>Live Dashboard</p>
            <div className={`lp-mock ${rv(mkv)}`}>
              <div className="lp-mock-in">
                {/* Calorie + macros row */}
                <div className="lp-mock-top-row" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 12 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <svg width="96" height="96" viewBox="0 0 140 140">
                      <circle cx="70" cy="70" r={R} fill="none" stroke="var(--s3)" strokeWidth="8" />
                      <circle cx="70" cy="70" r={R} fill="none" stroke="var(--g)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 70 70)" />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span className="lp-ring-num" style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>1,840</span>
                      <span style={{ fontSize: 10, color: "var(--t3)" }}>kcal</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    {[{ l: "Protein", v: 68, m: 120, c: "var(--g)" }, { l: "Carbs", v: 210, m: 280, c: "#5BA3CF" }, { l: "Fat", v: 55, m: 80, c: "#D4A853" }].map(x => (
                        <div key={x.l}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--t3)", marginBottom: 3 }}>
                            <span>{x.l}</span><span>{x.v}/{x.m}g</span>
                          </div>
                          <div style={{ height: 4, background: "var(--s3)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(x.v / x.m) * 100}%`, background: x.c, borderRadius: 2 }} />
                          </div>
                        </div>
                    ))}
                  </div>
                  {/* Recent meals mini list */}
                  <div className="lp-mock-recent" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Recent</span>
                    {[{ e: "🍳", n: "Poha", k: "320" }, { e: "🍛", n: "Dal Chawal", k: "480" }, { e: "🥘", n: "Paneer Sabzi", k: "390" }].map(x => (
                        <div key={x.n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--t2)" }}>
                          <span>{x.e} {x.n}</span><span style={{ color: "var(--t3)" }}>{x.k}</span>
                        </div>
                    ))}
                  </div>
                </div>
                {/* Mini stat tiles */}
                <div className="lp-mock-grid">
                  {[
                    { icon: Ic.drop, v: "1.6 L", sub: "/ 2.5 L target", color: "var(--g)" },
                    { icon: Ic.flame, v: "14 days", sub: "active streak", color: "#D4A853" },
                    { icon: Ic.moon, v: "7.2h", sub: "sleep avg ★★★★", color: "#8B7EC8" },
                  ].map(x => (
                      <div key={x.sub} className="lp-mock-cell">
                        <div style={{ color: x.color, display: "flex", justifyContent: "center", marginBottom: 6 }}>{x.icon}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--t1)" }}>{x.v}</div>
                        <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>{x.sub}</div>
                      </div>
                  ))}
                </div>
                {/* AI insight bar */}
                <div style={{ marginTop: 10, background: "rgba(30,221,139,0.04)", border: "1px solid rgba(30,221,139,0.1)", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 8, alignItems: "start" }}>
                  <span style={{ color: "var(--g)", flexShrink: 0, marginTop: 1 }}>{Ic.spark}</span>
                  <p style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.5, margin: 0 }}>Protein target hit 5/7 days — best week this month. Keep it up.</p>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* ═══ STATS ═══ */}
          <section className="lp-stats" ref={st}>
            <div className="lp-wrap">
              <div className="lp-stats-row">
                {[{ n: "150+", l: "Indian foods" }, { n: "6", l: "Health metrics" }, { n: "AI", l: "Powered insights" }, { n: "100%", l: "Private" }].map((x, i) => (
                    <div key={x.l} className={`lp-stat ${rv(stv, `lp-d${i + 1}`)}`}>
                      <div className="lp-stat-n">{x.n}</div>
                      <div className="lp-stat-l">{x.l}</div>
                    </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ FEATURES ═══ */}
          <section className="lp-ft-sec" ref={ft}>
            <div className="lp-wrap">
              <div className={rv(ftv)} style={{ marginBottom: 48 }}>
                <p className="lp-slbl">Features</p>
                <h2 className="lp-stitle">Six metrics. <span className="em">One place.</span></h2>
              </div>
              <div className="lp-ft-grid">
                {[
                  { icon: Ic.fork, t: "Food & Calories", d: "150+ Indian dishes with precise macros. Search, log by meal, watch your ring fill.", c: "var(--g)" },
                  { icon: Ic.drop, t: "Water Intake", d: "One-tap presets. Animated glass fill. Daily progress toward your target.", c: "var(--g)" },
                  { icon: Ic.moon, t: "Sleep Journal", d: "Log bedtime, wake time, quality. 7-day chart reveals your patterns.", c: "#8B7EC8" },
                  { icon: Ic.zap, t: "Workouts", d: "Log any activity. Or describe it in plain text — AI parses the rest.", c: "#C4724E" },
                  { icon: Ic.scale, t: "Weight Tracking", d: "Daily weigh-ins with trend arrows. Charts from one week to a year.", c: "#D4A853" },
                  { icon: Ic.spark, t: "AI Insights", d: "Personalized coaching from your actual data. Day, week, month, or year.", c: "var(--g)" },
                ].map((x, i) => (
                    <div key={x.t} className={`lp-ft-cell ${rv(ftv, `lp-d${i + 1}`)}`}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${x.c} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${x.c} 15%, transparent)`, marginBottom: 14, color: x.c }}>{x.icon}</div>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 6 }}>{x.t}</h3>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--t3)" }}>{x.d}</p>
                    </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ AI DEMO ═══ */}
          <section className="lp-ai-sec" ref={ai}>
            <div className="lp-wrap">
              <div className={rv(aiv)} style={{ marginBottom: 48 }}>
                <p className="lp-slbl">AI-Powered</p>
                <h2 className="lp-stitle">Type naturally. <span className="em">Log instantly.</span></h2>
              </div>
              <div className="lp-ai-grid">
                {[
                  { label: "Food Logger", icon: Ic.fork, color: "var(--g)", input: "dal makhani for lunch with 2 rotis", lines: [{ t: "✓ Logged under Lunch", c: "var(--g)" }, { t: "Dal Makhani · 1 bowl", r: "320 kcal" }, { t: "Roti × 2", r: "240 kcal" }, { t: "Total", r: "560 kcal", b: true }] as Line[] },
                  { label: "Workout Logger", icon: Ic.zap, color: "#C4724E", input: "45 min run and 3 sets bench", lines: [{ t: "✓ Cardio + Strength", c: "#C4724E" }, { t: "Running · 45 min", r: "380 kcal" }, { t: "Bench Press · 3×10", r: "90 kcal" }, { t: "Total burned", r: "470 kcal", b: true }] as Line[] },
                  { label: "Insights", icon: Ic.spark, color: "#8B7EC8", input: "This week's summary", lines: [{ t: "✓ 3 insights generated", c: "#8B7EC8" }, { t: "Protein goal 5/7 days ✓" }, { t: "Sleep avg 7.1h ↑ 0.8h" }, { t: "Hydration 6-day streak" }] as Line[] },
                ].map((card, ci) => (
                    <div key={card.label} className={`lp-term ${rv(aiv, `lp-d${ci + 1}`)}`}>
                      <div className="lp-term-bar">
                        <div className="lp-term-dot" /><div className="lp-term-dot" /><div className="lp-term-dot" />
                        <div className="lp-term-lbl" style={{ color: card.color }}>{card.icon}<span>{card.label}</span></div>
                      </div>
                      <div style={{ padding: "14px 14px 20px" }}>
                        <p style={{ fontFamily: "'SF Mono','Fira Code','Courier New',monospace", fontSize: 11, color: "var(--t1)", opacity: 0.75, marginBottom: 12 }}>
                          {card.input}<span className="lp-cur" />
                        </p>
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                          {card.lines.map((ln, li) => (
                              <div key={li} style={{ fontSize: 11, display: "flex", justifyContent: ln.r ? "space-between" : "flex-start", color: ln.c || "var(--t3)", fontWeight: ln.b ? 600 : 400, ...(ln.b ? { borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 5, marginTop: 3 } : {}) }}>
                                <span>{ln.t}</span>
                                {ln.r && <span style={{ color: ln.b ? "var(--t1)" : "var(--t3)" }}>{ln.r}</span>}
                              </div>
                          ))}
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ STEPS ═══ */}
          <section className="lp-sp-sec" ref={sp}>
            <div className="lp-wrap">
              <div className={rv(spv)} style={{ marginBottom: 48 }}>
                <p className="lp-slbl">How it works</p>
                <h2 className="lp-stitle">Three steps. <span className="em">That's it.</span></h2>
              </div>
              <div className="lp-sp-grid">
                {[
                  { n: "01", t: "Log daily", d: "Meals, water, sleep, workouts — each takes seconds. Smart search finds 150+ Indian foods." },
                  { n: "02", t: "See patterns", d: "Progress rings, macro bars, trend charts. Visualise a week to a full year at a glance." },
                  { n: "03", t: "Get smarter", d: "AI reads your data, surfaces what's working. No generic tips — just your patterns." },
                ].map((x, i) => (
                    <div key={x.n} className={`lp-sp ${rv(spv, `lp-d${i + 1}`)}`}>
                      <div style={{ position: "absolute", top: 0, left: 24, width: 28, height: 2, background: "var(--g)", borderRadius: 1 }} />
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 42, color: "rgba(30,221,139,0.07)", lineHeight: 1, display: "block", marginBottom: 14 }}>{x.n}</span>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--t1)", marginBottom: 8 }}>{x.t}</h3>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--t3)" }}>{x.d}</p>
                    </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ CTA ═══ */}
          <section className="lp-cta-sec" ref={ct}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 400, background: "radial-gradient(ellipse,rgba(30,221,139,0.04) 0%,transparent 65%)", pointerEvents: "none" }} />
            <div className={rv(ctv)} style={{ position: "relative", zIndex: 1 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(34px, 5vw, 54px)", letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--t1)", marginBottom: 14 }}>
                Start tracking <span style={{ color: "var(--g)" }}>today.</span>
              </h2>
              <p style={{ fontSize: 15, color: "var(--t3)", marginBottom: 36 }}>Free forever. No ads. No data sold.</p>
              <a href="/register" className="lp-btn-p" style={{ fontSize: 15, padding: "15px 40px" }}>
                Get started free {Ic.arrow}
              </a>
            </div>
          </section>

          {/* ═══ FOOTER ═══ */}
          <footer className="lp-foot">
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "-0.02em" }}>AROGYAMANDIRAM</span>
            <span style={{ margin: "0 10px", opacity: 0.3 }}>·</span>
            Wellness begins within.
            <span style={{ margin: "0 10px", opacity: 0.3 }}>·</span>
            <a href="https://github.com/utsaaham/arogyamandiram" target="_blank" rel="noopener noreferrer">GitHub</a>
          </footer>
        </div>
      </>
  );
}