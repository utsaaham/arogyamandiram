"use client";
import { useState, useEffect, useRef, MutableRefObject } from "react";
import { StreakCard as AchievementStreakCard } from "@/components/achievements/StreakCard";
import { BadgeCard } from "@/components/achievements/BadgeCard";
import type { UserBadge } from "@/types";

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

const MOCK_RECENT_BADGES: UserBadge[] = [
  { id: "meal_50", name: "50 Meals", description: "Logged 50 meals.", icon: "🍽", category: "milestone", earnedAt: "2026-03-12" },
  { id: "first_meal", name: "First Steps", description: "Logged your first meal.", icon: "🍳", category: "first", earnedAt: "2026-03-11" },
  { id: "first_water", name: "First Drop", description: "Logged water for the first time.", icon: "💧", category: "first", earnedAt: "2026-03-10" },
  { id: "first_workout", name: "First Rep", description: "Logged your first workout.", icon: "🏋️", category: "first", earnedAt: "2026-03-09" },
  { id: "first_weight", name: "First Weigh-In", description: "Logged your weight for the first time.", icon: "⚖️", category: "first", earnedAt: "2026-03-08" },
];

export default function Landing() {
  const [h, hv] = useFade(0.05);
  const [mk, mkv] = useFade(0.3);
  const [st, stv] = useFade();
  const [ft, ftv] = useFade(0.06);
  const [ai, aiv] = useFade(0.06);
  const [sp, spv] = useFade();
  const [ct, ctv] = useFade();

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

/* ── iPhone 16 Pro mockup (393×852pt → 260×564px) ── */
.mk-phone-wrap{display:none;justify-content:center;align-items:center}
.mk-phone{width:260px;background:linear-gradient(160deg,#3a3a3c 0%,#2c2c2e 40%,#1c1c1e 100%);border-radius:46px;padding:3px;box-shadow:0 0 0 1px rgba(255,255,255,0.13),0 0 0 2px rgba(0,0,0,0.9),0 32px 64px rgba(0,0,0,0.8),0 0 40px rgba(20,220,180,0.05),inset 0 1px 0 rgba(255,255,255,0.1);position:relative}
.mk-phone-btn-pwr{position:absolute;right:-3px;top:110px;width:3px;height:58px;background:linear-gradient(180deg,#3a3a3c,#2c2c2e);border-radius:0 2px 2px 0}
.mk-phone-btn-v1{position:absolute;left:-3px;top:92px;width:3px;height:26px;background:linear-gradient(180deg,#3a3a3c,#2c2c2e);border-radius:2px 0 0 2px}
.mk-phone-btn-v2{position:absolute;left:-3px;top:130px;width:3px;height:50px;background:linear-gradient(180deg,#3a3a3c,#2c2c2e);border-radius:2px 0 0 2px}
.mk-phone-btn-mute{position:absolute;left:-3px;top:70px;width:3px;height:18px;background:linear-gradient(180deg,#3a3a3c,#2c2c2e);border-radius:2px 0 0 2px}
/* screen: 254×558px = 393:852 ratio */
.mk-phone-screen{background:#060806;border-radius:44px;overflow:hidden;width:254px;height:558px;display:flex;flex-direction:column}
/* status bar */
.mk-phone-status{display:flex;justify-content:space-between;align-items:center;padding:12px 20px 4px;position:relative;z-index:3}
.mk-phone-time{font-family:'Outfit',system-ui,sans-serif;font-weight:600;font-size:12px;color:#E8E6E2;letter-spacing:-0.01em}
.mk-phone-di{position:absolute;left:50%;transform:translateX(-50%);top:9px;width:92px;height:28px;background:#000;border-radius:18px;z-index:4;display:flex;align-items:center;justify-content:flex-end;padding-right:10px;gap:6px;box-shadow:0 0 0 1px #1a1a1a}
.mk-phone-di-cam{width:10px;height:10px;border-radius:50%;background:#161616;border:1.5px solid #222}
.mk-phone-di-dot{width:7px;height:7px;border-radius:50%;background:#14dcb4;opacity:0.25}
.mk-phone-si{display:flex;align-items:center;gap:4px}
/* body */
.mk-phone-body{padding:16px 10px 0;display:flex;flex-direction:column;gap:7px;flex:1;min-height:0;overflow:hidden}
/* bottom nav */
.mk-ph-nav{background:#0D0D14;border-top:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-around;padding:8px 0 12px;flex-shrink:0}
.mk-ph-nav-item{display:flex;align-items:center;justify-content:center;flex:1;opacity:0.45}
.mk-ph-nav-item.active{opacity:1}
.mk-ph-nav-item svg{width:17px;height:17px}
/* header card */
.mk-ph-hdr{background:#0d1117;border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:11px 12px}
.mk-ph-hdr-row{display:flex;justify-content:space-between;align-items:center}
.mk-ph-greet{font-family:'Outfit',system-ui,sans-serif;font-size:16px;font-weight:800;color:#E8E6E2;line-height:1.2;letter-spacing:-0.02em}
.mk-ph-badge-row{display:flex;align-items:center;gap:4px;margin-top:3px}
.mk-ph-badge-dot{width:5px;height:5px;border-radius:50%;background:#14dcb4;box-shadow:0 0 5px #14dcb4}
.mk-ph-badge-text{font-size:7.5px;font-weight:800;letter-spacing:0.13em;color:#14dcb4;text-transform:uppercase}
.mk-ph-date{font-size:8.5px;color:#2a3348;margin-top:2px}
.mk-ph-avatar{width:48px;height:48px;border-radius:50%;background:#1a2035;display:flex;align-items:center;justify-content:center;font-family:'Outfit',system-ui,sans-serif;font-size:17px;font-weight:900;color:#a3a3a3;flex-shrink:0}
.mk-ph-divider{height:1px;background:rgba(255,255,255,0.05);margin:8px 0}
.mk-ph-xp-row{display:flex;justify-content:space-between;margin-bottom:4px;font-size:8px}
.mk-ph-xp-hint{color:#2a3348}
.mk-ph-xp-val{font-weight:700;color:#14dcb4}
.mk-ph-xp-track{height:4px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden}
.mk-ph-xp-fill{height:100%;width:51%;background:linear-gradient(90deg,#14dcb4,#00aaff);border-radius:2px}
/* calorie card */
.mk-ph-cal{background:#0d1117;border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:11px 12px}
.mk-ph-cal-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}
.mk-ph-cal-label{font-size:8px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#3a4460;margin-bottom:4px}
.mk-ph-cal-num{font-family:'Outfit',system-ui,sans-serif;font-size:30px;font-weight:800;color:#E8E6E2;line-height:1;letter-spacing:-0.04em}
.mk-ph-cal-unit{font-size:9px;color:#3a4460;margin-top:1px}
.mk-ph-cal-rem{display:flex;align-items:center;gap:4px;margin-top:5px}
.mk-ph-cal-rem-dot{width:6px;height:6px;border-radius:50%;background:#a3a3a3}
.mk-ph-cal-rem-val{font-size:11px;font-weight:700;color:#a3a3a3}
.mk-ph-cal-rem-text{font-size:8.5px;color:#3a4460}
.mk-ph-cal-goal{font-size:8px;color:#3a4460;margin-top:1px}
.mk-ph-ring{position:relative;width:70px;height:70px;flex-shrink:0}
.mk-ph-ring svg{width:100%;height:100%;animation:rpulse 3s ease-in-out infinite}
.mk-ph-ring-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.mk-ph-ring-pct{font-family:'Outfit',system-ui,sans-serif;font-size:13px;font-weight:800;color:#a3a3a3}
.mk-ph-macros{display:flex;flex-direction:column;gap:4px}
.mk-ph-macro{display:flex;flex-direction:column;gap:1.5px}
.mk-ph-macro-hd{display:flex;justify-content:space-between;font-size:7.5px;color:#3a4460}
.mk-ph-macro-track{height:2.5px;background:#1a1f2a;border-radius:2px;overflow:hidden}
.mk-ph-macro-bar{height:100%;border-radius:2px}
/* stats 2×2 */
.mk-ph-stats{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.mk-ph-stat{background:#0d1117;border:1px solid rgba(255,255,255,0.05);border-radius:13px;padding:9px 10px}
.mk-ph-stat-icon{width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;margin-bottom:5px}
.mk-ph-stat-icon svg{width:11px;height:11px;stroke-width:1.7}
.mk-ph-stat-val{font-family:'Outfit',system-ui,sans-serif;font-size:16px;font-weight:800;line-height:1;letter-spacing:-0.02em}
.mk-ph-stat-label{font-size:8px;font-weight:600;color:#9B9990;margin-top:2px}
.mk-ph-stat-sub{font-size:7px;color:#3a4460;margin-top:1px}
/* home bar */
.mk-ph-homebar{width:80px;height:3.5px;background:rgba(255,255,255,0.15);border-radius:2px;margin:6px auto 0}

@media(max-width:768px){
  .lp-stats-row{grid-template-columns:repeat(2,1fr)!important}
  .lp-stat+.lp-stat::before{display:none}
  .lp-ft-grid,.lp-ai-grid,.lp-sp-grid{grid-template-columns:1fr!important}
  .lp-hero .lp-ctas{flex-direction:column;align-items:center}
  .lp-hero{padding:80px 20px 50px}
  .lp-appname{font-size:clamp(34px,8.5vw,52px)!important;letter-spacing:-0.02em!important}
  .lp-mock-sec{padding:0 16px 60px}
  .mk-browser{display:none!important}
  .mk-phone-wrap{display:flex!important}
}
@media(min-width:769px)and(max-width:1024px){
  .lp-ft-grid{grid-template-columns:repeat(2,1fr)!important}
}

/* ── Browser window frame ── */
.mk-browser{width:100%;max-width:920px;border-radius:12px;overflow:hidden;position:relative;box-shadow:0 0 0 1px rgba(255,255,255,0.05),0 18px 48px rgba(0,0,0,0.62),0 4px 12px rgba(0,0,0,0.32)}
.mk-browser::before{display:none}
/* titlebar — real Chrome light theme (#DEE1E6 titlebar, white active tab) */
.mk-chrome{position:relative;z-index:1;background:#dde1e6;border-bottom:none}
.mk-chrome-titlebar{display:flex;align-items:flex-end;padding:8px 12px 0;gap:0;position:relative;min-height:36px}
.mk-chrome-tb-right{display:flex;align-items:center;gap:5px;margin-left:auto;padding-bottom:6px;flex-shrink:0}
.mk-chrome-ext-btn{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#646a73}
.mk-chrome-profile{width:24px;height:24px;border-radius:50%;background:#4f86f7;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;font-weight:700;color:#fff;font-family:var(--font-body)}
.mk-chrome-menu{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#646a73}
.mk-chrome-dots{display:flex;gap:7px;flex-shrink:0;align-items:center;padding-bottom:8px}
.mk-chrome-dot{width:12px;height:12px;border-radius:50%}
.mk-chrome-dot.red{background:#ff5f57}
.mk-chrome-dot.yellow{background:#febc2e}
.mk-chrome-dot.green{background:#28c840}
/* tabs */
.mk-chrome-tabs{display:flex;align-items:flex-end;margin-left:12px;flex:1}
.mk-chrome-tab{background:#ffffff;border-radius:10px 10px 0 0;padding:7px 12px 8px;display:flex;align-items:center;gap:7px;font-size:11px;white-space:nowrap;max-width:260px;position:relative;box-shadow:0 -1px 0 rgba(255,255,255,0.85),0 0 0 1px rgba(0,0,0,0.08)}
.mk-chrome-tab::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:#ffffff}
.mk-chrome-favicon{width:14px;height:14px;border-radius:4px;background:#2cb67d;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#ffffff;font-family:'Outfit',system-ui,sans-serif;flex-shrink:0}
.mk-chrome-tab-title{font-size:10.5px;font-weight:500;color:#2c3035}
.mk-chrome-tab-x{margin-left:4px;width:13px;height:13px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#717780;flex-shrink:0}
/* omnibar row */
.mk-chrome-omnibar{display:flex;align-items:center;gap:8px;padding:7px 12px 8px;background:#f8f9fb;border-bottom:1px solid #d9dee5}
.mk-chrome-nav{display:flex;gap:2px;flex-shrink:0}
.mk-chrome-nav-btn{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#646a73}
.mk-chrome-url{flex:1;background:#eceff3;border:1px solid #e1e5ea;border-radius:15px;padding:4px 11px;display:flex;align-items:center;gap:5px;cursor:text}
.mk-chrome-url-lock{width:10px;height:10px;flex-shrink:0;color:#646a73;opacity:0.85}
.mk-chrome-url-domain{font-size:10.5px;color:#2b2f34}
.mk-chrome-url-path{font-size:10.5px;color:#6a7078;font-weight:400}
.mk-chrome-actions{display:flex;gap:2px;flex-shrink:0}
.mk-chrome-action-btn{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#646a73}
.mk-chrome-url-only{display:flex;justify-content:center;align-items:center;padding:9px 14px 10px;background:#f8f9fb;border-bottom:1px solid #d9dee5}
.mk-chrome-url-site{width:12px;height:12px;border-radius:3px;background:#2cb67d;display:flex;align-items:center;justify-content:center;color:#fff;font-size:7px;font-weight:700;flex-shrink:0}
.mk-chrome-url-shell{position:relative;display:flex;justify-content:center;align-items:center;padding:6px 14px 7px;background:#f8f9fb;border-bottom:none}
.mk-chrome-url-shell .mk-chrome-dots{position:absolute;left:14px;top:50%;transform:translateY(-50%);padding-bottom:0}

/* ── Full dashboard mockup ── */
.mk-outer{width:100%;position:relative;z-index:1}
.mk-outer::before{display:none}
.mk-inner{position:relative;z-index:1;display:flex;background:#0a0c0b;overflow:hidden}
.mk-sb{width:54px;background:#0e1210;border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;align-items:center;padding:14px 0 10px;gap:4px;flex-shrink:0}
.mk-sb-logo{font-family:'Outfit',system-ui,sans-serif;font-weight:800;font-size:11px;color:#1EDD8B;letter-spacing:-0.03em;margin-bottom:10px;line-height:1;display:flex;align-items:center;gap:1px}
.mk-sb-dot{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center}
.mk-sb-dot.act{background:rgba(30,221,139,0.12)}
.mk-sb-dot svg{width:14px;height:14px;stroke-width:1.6}
.mk-main{flex:1;padding:16px 18px 14px;min-width:0;overflow:hidden;background:#0c100e}
.mk-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.mk-greet{font-size:16px;font-weight:600;color:#E8E6E2;letter-spacing:-0.02em}
.mk-greet-sub{font-size:10px;color:#5C5A53;margin-top:2px}
.mk-xp-pill{display:flex;align-items:center;gap:6px;background:#10140F;border:1px solid rgba(255,255,255,0.05);border-radius:20px;padding:5px 10px 5px 8px;font-size:9px;color:#9B9990}
.mk-xp-bar{width:52px;height:4px;background:#1E241F;border-radius:2px;overflow:hidden}
.mk-xp-fill{height:100%;background:#1EDD8B;border-radius:2px;width:51%}
.mk-bento-top{display:grid;grid-template-columns:180px 1fr;gap:10px;margin-bottom:10px}
.mk-ring-card{background:#111712;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.mk-ring-wrap{position:relative;width:100px;height:100px}
.mk-ring-wrap svg{width:100%;height:100%}
.mk-ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.mk-ring-val{font-family:'Outfit',system-ui,sans-serif;font-weight:700;font-size:22px;color:#E8E6E2;letter-spacing:-0.03em;line-height:1}
.mk-ring-unit{font-size:9px;color:#5C5A53;margin-top:1px}
.mk-ring-sub{font-size:9px;color:#5C5A53;text-align:center;line-height:1.3}
.mk-badges-card{background:#111712;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;min-width:0}
.mk-badges-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.mk-badges-title{font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#5C5A53}
.mk-badges-link{font-size:9px;color:#1EDD8B;font-weight:500}
.mk-badges-scroll{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.mk-badge-slot{min-width:0}
.mk-badge-slot .badge-card-wrapper{padding:0}
.mk-badge-slot .portrait-card{height:auto;min-height:140px;border-radius:9px;overflow:visible}
.mk-badge-slot .deck-card{border-width:1px}
.mk-badge-slot .w-full.items-stretch{gap:2px;padding:2px 2px 0}
.mk-badge-slot .deck-banner{font-size:7px;padding:2px 3px;letter-spacing:0;border-radius:3px}
.mk-badge-slot .deck-banner span{font-size:7px}
.mk-badge-slot .tracking-wider{font-size:8px;letter-spacing:.02em}
.mk-badge-slot .deck-type-footer{font-size:7.5px;padding:2px 0}
.mk-badge-slot .line-clamp-2{font-size:8px;line-height:1.2}
.mk-badge-slot .h-20.w-20{height:2.2rem;width:2.2rem;border-radius:8px;background:transparent;border:none;box-shadow:none}
.mk-badge-slot .h-20.w-20 > div{border-radius:7px;border-color:rgba(255,255,255,0.14);box-shadow:none}
.mk-badge-slot .h-12.w-12{height:1.9rem;width:1.9rem}
.mk-badge-slot .h-14.w-14{height:2.1rem;width:2.1rem}
.mk-badge-slot .h-8.w-8{height:1.1rem;width:1.1rem}
.mk-macros-card{background:#111712;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:10px 14px;margin-bottom:10px}
.mk-macros-title{font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#5C5A53;margin-bottom:8px}
.mk-macros-row{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.mk-macro-item{display:flex;flex-direction:column;gap:3px;min-width:0}
.mk-macro-head{display:flex;justify-content:space-between;gap:6px;align-items:center}
.mk-macro-label{font-size:8px;color:#79827d}
.mk-macro-val{font-size:10px;font-weight:600;color:#E8E6E2;white-space:nowrap}
.mk-macro-bar{height:3px;width:100%;background:#1E241F;border-radius:2px;overflow:hidden}
.mk-macro-fill{height:100%;border-radius:2px}
.mk-stats-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:10px}
.mk-stat-card{background:#111712;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:10px;display:flex;align-items:center;gap:8px}
.mk-stat-icon{width:18px;height:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mk-stat-icon svg{width:14px;height:14px;stroke-width:1.6}
.mk-stat-val{font-size:13px;font-weight:700;color:#E8E6E2;font-family:'Outfit',system-ui,sans-serif}
.mk-stat-label{font-size:8px;color:#5C5A53;margin-top:1px}
.mk-stat-sub{font-size:7px;color:#4f5a53;margin-top:1px}
.mk-bottom-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mk-streak-card{background:#111712;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:10px 12px}
.mk-streak-title{font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#5C5A53;margin-bottom:6px}
.mk-streak-scroll{display:flex;gap:6px;overflow:hidden;margin-bottom:8px}
.mk-streak-slot{flex:0 0 104px;width:104px;height:44px;overflow:hidden}
.mk-streak-slot > *{transform:scale(0.68);transform-origin:top left;width:150px}
.mk-streak-note{font-size:10px;color:#5C5A53;margin-bottom:8px;width:100%;line-height:1.35}
.mk-streak-dots{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;width:100%}
.mk-sdot{width:100%;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;background:#171C18;color:#5C5A53;border:1px solid rgba(255,255,255,0.05)}
.mk-sdot.today{background:rgba(30,221,139,0.12);color:#1EDD8B;border-color:rgba(30,221,139,0.3)}
.mk-sdot.done{background:rgba(30,221,139,0.06);color:#16B471;border-color:rgba(30,221,139,0.15)}
.mk-ai-card{background:rgba(30,221,139,0.06);border:1px solid rgba(30,221,139,0.12);border-radius:12px;padding:10px 12px;display:flex;gap:7px;align-items:flex-start}
.mk-ai-card p{font-size:10px;color:#9B9990;line-height:1.5;margin:0}
@keyframes rpulse{0%,100%{filter:none}50%{filter:none}}
@media(max-width:768px){
  .mk-bento-top{grid-template-columns:1fr!important}
  .mk-stats-grid{grid-template-columns:1fr 1fr!important}
  .mk-sb{display:none!important}
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
          <div className="lp-mock-sec" style={{ paddingTop: 72, position: "relative" }}>
            {/* Subtle section lift */}
            <div style={{ position: "absolute", top: "34%", left: "50%", transform: "translateX(-50%)", width: 640, height: 360, background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 920, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <p className={`lp-slbl ${rv(mkv)}`} style={{ margin: 0 }}>Live Dashboard</p>
            <div className={`mk-browser ${rv(mkv)}`}>

              {/* Browser chrome */}
              <div className="mk-chrome">
                <div className="mk-chrome-url-shell">
                  <div className="mk-chrome-dots">
                    <div className="mk-chrome-dot red" />
                    <div className="mk-chrome-dot yellow" />
                    <div className="mk-chrome-dot green" />
                  </div>
                  <div className="mk-chrome-url" style={{ flex: "0 1 520px", justifyContent: "center" }}>
                    <span className="mk-chrome-url-site">A</span>
                    <span className="mk-chrome-url-domain">arogyamandiram.vercel.app</span>
                    <span className="mk-chrome-url-path">/dashboard</span>
                  </div>
                </div>

              </div>

              <div className="mk-outer">
              <div className="mk-inner">

                {/* Sidebar */}
                <div className="mk-sb">
                  <div className="mk-sb-logo">AM</div>
                  <div className="mk-sb-dot act">
                    <svg fill="none" viewBox="0 0 24 24" stroke="#1EDD8B" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M9 22V12h6v10" /></svg>
                  </div>
                  <div className="mk-sb-dot">
                    <svg fill="none" viewBox="0 0 24 24" stroke="#5C5A53" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
                  </div>
                  <div className="mk-sb-dot">
                    <svg fill="none" viewBox="0 0 24 24" stroke="#5C5A53" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 007 7z" /></svg>
                  </div>
                  <div className="mk-sb-dot">
                    <svg fill="none" viewBox="0 0 24 24" stroke="#5C5A53" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3z" /><path d="M21 15v7" /></svg>
                  </div>
                  <div className="mk-sb-dot">
                    <svg fill="none" viewBox="0 0 24 24" stroke="#5C5A53" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                  </div>
                  <div className="mk-sb-dot">
                    <svg fill="none" viewBox="0 0 24 24" stroke="#5C5A53" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10M4 8l8 9 8-9" /></svg>
                  </div>
                </div>

                {/* Main content */}
                <div className="mk-main">

                  {/* Header */}
                  <div className="mk-hdr">
                    <div>
                      <div className="mk-greet">Good Evening, K 👋</div>
                      <div className="mk-greet-sub">Mar 13, 2026 · Let&apos;s make today count.</div>
                    </div>
                    <div className="mk-xp-pill">
                      <span style={{ fontWeight: 600, color: "#1EDD8B" }}>LV 4</span>
                      <div className="mk-xp-bar"><div className="mk-xp-fill" /></div>
                      <span>203 / 400 XP</span>
                    </div>
                  </div>

                  {/* Row 1: Ring + Badges */}
                  <div className="mk-bento-top">
                    <div className="mk-ring-card">
                      <div className="mk-ring-wrap">
                        <svg viewBox="0 0 140 140">
                          <circle cx="70" cy="70" r="58" fill="none" stroke="#1A1F1C" strokeWidth="8" />
                          <circle cx="70" cy="70" r="58" fill="none" stroke="url(#mkrgrad)" strokeWidth="8"
                            strokeLinecap="round" strokeDasharray="192 364" transform="rotate(-90 70 70)" />
                          <defs>
                            <linearGradient id="mkrgrad" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#1EDD8B" /><stop offset="100%" stopColor="#16B471" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="mk-ring-center">
                          <span className="mk-ring-val">1,327</span>
                          <span className="mk-ring-unit">kcal</span>
                        </div>
                      </div>
                      <div className="mk-ring-sub">1,221 remaining<br />of 2,548 kcal goal</div>
                    </div>

                    <div className="mk-badges-card">
                      <div className="mk-badges-hdr">
                        <span className="mk-badges-title">Recent badges</span>
                        <span className="mk-badges-link">View all →</span>
                      </div>
                      <div className="mk-badges-scroll">
                        {MOCK_RECENT_BADGES.map((badge) => (
                          <div key={badge.id} className="mk-badge-slot">
                            <BadgeCard badge={badge} locked={false} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="mk-macros-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span className="mk-macros-title">Today&apos;s macros</span>
                      <span style={{ fontSize: 9, color: "#1EDD8B", fontWeight: 500 }}>Details →</span>
                    </div>
                    <div className="mk-macros-row">
                      {[
                        { l: "Protein", v: "28/191g", w: "15%", c: "#3B82F6" },
                        { l: "Carbs",   v: "206/255g", w: "81%", c: "#1EDD8B" },
                        { l: "Fat",     v: "43/85g",   w: "51%", c: "#EF4444" },
                        { l: "Fiber",   v: "15/25g",   w: "60%", c: "#3B82F6" },
                        { l: "Sugar",   v: "25/50g",   w: "50%", c: "#F59E0B" },
                        { l: "Sodium",  v: "1010/2300mg", w: "44%", c: "#38bdf8" },
                      ].map((m) => (
                        <div key={m.l} className="mk-macro-item">
                          <div className="mk-macro-head">
                            <span className="mk-macro-label">{m.l}</span>
                            <span className="mk-macro-val">{m.v}</span>
                          </div>
                          <div className="mk-macro-bar">
                            <div className="mk-macro-fill" style={{ width: m.w, background: m.c }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stat cards */}
                  <div className="mk-stats-grid">
                    {[
                      { paths: ["M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 007 7z"], color: "#1EDD8B", val: "680 ml", label: "Water", sub: "2.5 L target" },
                      { paths: ["M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 002.5 2.5z"], color: "#EF4444", val: "0", label: "Burned", sub: "0 workouts" },
                      { paths: ["M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2","M7 2v20","M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3z","M21 15v7"], color: "#f5a623", val: "2", label: "Meals", sub: "644 kcal" },
                      { paths: ["M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"], color: "#8B5CF6", val: "—", label: "Sleep", sub: "8h target" },
                    ].map((s) => (
                      <div key={s.label} className="mk-stat-card">
                        <div className="mk-stat-icon">
                          <svg fill="none" viewBox="0 0 24 24" stroke={s.color} strokeLinecap="round" strokeLinejoin="round">
                            {s.paths.map((d, i) => <path key={i} d={d} />)}
                          </svg>
                        </div>
                        <div>
                          <div className="mk-stat-val">{s.val}</div>
                          <div className="mk-stat-label">{s.label}</div>
                          <div className="mk-stat-sub">{s.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom: Streaks + AI */}
                  <div className="mk-bottom-row">
                    <div className="mk-streak-card">
                      <div className="mk-streak-title">Active streaks</div>
                      <div className="mk-streak-scroll">
                        <div className="mk-streak-slot">
                          <AchievementStreakCard label="Active days" current={1} best={10} />
                        </div>
                        <div className="mk-streak-slot">
                          <AchievementStreakCard label="Weight" current={1} best={5} />
                        </div>
                      </div>
                      <div className="mk-streak-note">
                        Just 7 active days from your first 7-day badge.
                      </div>
                      <div className="mk-streak-dots">
                        {["M","T","W","T","F","S","S"].map((d, i) => (
                          <div key={i} className={`mk-sdot${i === 3 ? " today" : ""}`}>{d}</div>
                        ))}
                      </div>
                    </div>

                    <div className="mk-ai-card">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#1EDD8B" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <path d="M12 3l1.9 5.8a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-1.9a2 2 0 001.3-1.3L12 3z" />
                      </svg>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: "#1EDD8B", letterSpacing: "0.05em", textTransform: "uppercase" as const, marginBottom: 4 }}>
                          AI Insight
                        </div>
                        <p>Carb intake is solid at 81% of target. Consider adding a protein-rich snack — you&apos;re only at 15% of your protein goal today.</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>{/* /mk-outer */}
            </div>{/* /mk-browser */}

            {/* ── iPhone 16 Pro mockup (mobile only) ── */}
            <div className="mk-phone-wrap">
              <div className="mk-phone">
                <div className="mk-phone-btn-mute" />
                <div className="mk-phone-btn-v1" />
                <div className="mk-phone-btn-v2" />
                <div className="mk-phone-btn-pwr" />

                <div className="mk-phone-screen">
                  {/* Status bar */}
                  <div className="mk-phone-status">
                    <span className="mk-phone-time">9:41</span>
                    <div className="mk-phone-di">
                      <div className="mk-phone-di-dot" />
                      <div className="mk-phone-di-cam" />
                    </div>
                    <div className="mk-phone-si">
                      <svg width="13" height="10" viewBox="0 0 16 12" fill="none"><rect x="0" y="8" width="3" height="4" rx="0.5" fill="#E8E6E2"/><rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="#E8E6E2"/><rect x="9" y="2" width="3" height="10" rx="0.5" fill="#E8E6E2"/><rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="#E8E6E2" opacity="0.3"/></svg>
                      <svg width="13" height="10" viewBox="0 0 20 14" fill="none"><path d="M10 11.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" fill="#E8E6E2"/><path d="M4.5 7.5C6.2 5.8 8 5 10 5s3.8.8 5.5 2.5" stroke="#E8E6E2" strokeWidth="1.8" strokeLinecap="round"/><path d="M1 4C3.8 1.3 6.7 0 10 0s6.2 1.3 9 4" stroke="#E8E6E2" strokeWidth="1.8" strokeLinecap="round" opacity="0.4"/></svg>
                      <svg width="19" height="10" viewBox="0 0 24 12" fill="none"><rect x="0.5" y="0.5" width="20" height="11" rx="3" stroke="#E8E6E2" strokeOpacity="0.4"/><rect x="2" y="2" width="15" height="8" rx="2" fill="#E8E6E2"/><path d="M21.5 4v4" stroke="#E8E6E2" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round"/></svg>
                    </div>
                  </div>

                  <div className="mk-phone-body">

                    {/* Header card */}
                    <div className="mk-ph-hdr">
                      <div className="mk-ph-hdr-row">
                        <div className="mk-ph-greet-block">
                          <div className="mk-ph-greet">Good Evening, K 👋</div>
                          <div className="mk-ph-badge-row">
                            <div className="mk-ph-badge-dot" />
                            <span className="mk-ph-badge-text">Arogyamandiram</span>
                          </div>
                          <div className="mk-ph-date">Friday, March 13, 2026</div>
                        </div>
                        <div className="mk-ph-avatar">K</div>
                      </div>
                      <div className="mk-ph-divider" />
                      <div className="mk-ph-xp-row">
                        <span className="mk-ph-xp-hint">Getting started</span>
                        <span className="mk-ph-xp-val">203 / 400 XP</span>
                      </div>
                      <div className="mk-ph-xp-track"><div className="mk-ph-xp-fill" /></div>
                    </div>

                    {/* Calorie card */}
                    <div className="mk-ph-cal">
                      <div className="mk-ph-cal-row">
                        <div>
                          <div className="mk-ph-cal-label">Today&apos;s Calories</div>
                          <div className="mk-ph-cal-num">1,327</div>
                          <div className="mk-ph-cal-unit">kcal consumed</div>
                          <div className="mk-ph-cal-rem">
                            <div className="mk-ph-cal-rem-dot" />
                            <span className="mk-ph-cal-rem-val">1,221</span>
                            <span className="mk-ph-cal-rem-text">kcal remaining</span>
                          </div>
                          <div className="mk-ph-cal-goal">of 2,548 kcal goal</div>
                        </div>
                        <div className="mk-ph-ring">
                          <svg viewBox="0 0 140 140">
                            <circle cx="70" cy="70" r="56" fill="none" stroke="#1a1f2a" strokeWidth="12"/>
                            <circle cx="70" cy="70" r="56" fill="none" stroke="url(#phcgrad)" strokeWidth="12"
                              strokeLinecap="round" strokeDasharray="186 352" transform="rotate(-90 70 70)"/>
                            <defs><linearGradient id="phcgrad" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#14dcb4"/><stop offset="100%" stopColor="#00aaff"/>
                            </linearGradient></defs>
                          </svg>
                          <div className="mk-ph-ring-center">
                            <span className="mk-ph-ring-pct">52%</span>
                          </div>
                        </div>
                      </div>
                      <div className="mk-ph-macros">
                        {[
                          { l: "Protein", v: "28 / 191g", w: "15%", c: "linear-gradient(90deg,#8b5cf6,#4c1d95)" },
                          { l: "Carbs",   v: "206 / 255g", w: "81%", c: "linear-gradient(90deg,#e8a800,#ffc94a)" },
                          { l: "Fat",     v: "43 / 85g",   w: "51%", c: "linear-gradient(90deg,#d93a55,#ff4f6b)" },
                          { l: "Sugar",   v: "25 / 50g",   w: "50%", c: "linear-gradient(90deg,#f5a623,#e89510)" },
                          { l: "Sodium",  v: "800 / 2300mg", w: "35%", c: "linear-gradient(90deg,#3aabff,#2a8bd9)" },
                        ].map((m) => (
                          <div key={m.l} className="mk-ph-macro">
                            <div className="mk-ph-macro-hd"><span>{m.l}</span><span>{m.v}</span></div>
                            <div className="mk-ph-macro-track">
                              <div className="mk-ph-macro-bar" style={{ width: m.w, background: m.c }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats 2×2 */}
                    <div className="mk-ph-stats">
                      {[
                        { paths: ["M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 007 7z"], color: "#00e5a0", bg: "rgba(0,229,160,0.1)", val: "1.6 L", label: "Water", sub: "of 2.5 L target" },
                        { paths: ["M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 002.5 2.5z"], color: "#ff5c7c", bg: "rgba(255,92,124,0.1)", val: "0", label: "Burned", sub: "0 workouts" },
                        { paths: ["M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2","M7 2v20","M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3z","M21 15v7"], color: "#f5a623", bg: "rgba(245,166,35,0.1)", val: "9", label: "Meals", sub: "1,327 kcal logged" },
                        { paths: ["M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"], color: "#8b78ff", bg: "rgba(139,120,255,0.1)", val: "—", label: "Sleep", sub: "of 8h target" },
                      ].map((s) => (
                        <div key={s.label} className="mk-ph-stat">
                          <div className="mk-ph-stat-icon" style={{ background: s.bg }}>
                            <svg fill="none" viewBox="0 0 24 24" stroke={s.color} strokeLinecap="round" strokeLinejoin="round">
                              {s.paths.map((d, i) => <path key={i} d={d} />)}
                            </svg>
                          </div>
                          <div className="mk-ph-stat-val" style={{ color: s.color }}>{s.val}</div>
                          <div className="mk-ph-stat-label">{s.label}</div>
                          <div className="mk-ph-stat-sub">{s.sub}</div>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* Bottom nav bar */}
                  <div className="mk-ph-nav">
                    {/* Dashboard – active */}
                    <div className="mk-ph-nav-item active">
                      <svg fill="none" viewBox="0 0 24 24" stroke="#14dcb4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                      </svg>
                    </div>
                    {/* Sleep */}
                    <div className="mk-ph-nav-item">
                      <svg fill="none" viewBox="0 0 24 24" stroke="#a1a1aa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                      </svg>
                    </div>
                    {/* Water */}
                    <div className="mk-ph-nav-item">
                      <svg fill="none" viewBox="0 0 24 24" stroke="#a1a1aa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 007 7z"/>
                      </svg>
                    </div>
                    {/* Food */}
                    <div className="mk-ph-nav-item">
                      <svg fill="none" viewBox="0 0 24 24" stroke="#a1a1aa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M21 15v7"/>
                      </svg>
                    </div>
                    {/* More */}
                    <div className="mk-ph-nav-item">
                      <svg fill="none" viewBox="0 0 24 24" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="5" cy="12" r="1" fill="#a1a1aa"/><circle cx="12" cy="12" r="1" fill="#a1a1aa"/><circle cx="19" cy="12" r="1" fill="#a1a1aa"/>
                      </svg>
                    </div>
                  </div>
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
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 42, color: "rgba(30,221,139,0.45)", lineHeight: 1, display: "block", marginBottom: 14 }}>{x.n}</span>
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