# ArogyaM Scores — One-Page Plan

Last updated: July 1, 2026
Replaces: `whoop-life-feature-analysis.md` (WHOOP hardware rows and regulated medical features removed — see "Removed from scope" at the bottom).

ArogyaM builds a WHOOP-style daily scores experience as **one page** in the web app, powered by Apple Health data pushed from the ArogyaM iOS app.

---

## The Page: **Vitals**

One page, one daily loop — it answers "how much capacity do I have today, and what should I do with it?"

Route: `/vitals` · Nav label: **Vitals** · Tagline on page: *"Your daily scores"*

### Page layout (top to bottom)

1. **Readiness** (hero ring, 0–100) — the readiness/recovery score. One score, not two: WHOOP's "Recovery" and the doc's earlier "Readiness" measured the same thing, so they are merged.
2. **Today's Guidance** — Push / Maintain / Recover band with a one-line plain-language driver (e.g. "Low HRV and short sleep — take it easy today"). Feeds the existing workout AI readiness signals.
3. **Score grid** — three cards:
   - **Strain** (0–100) — cardiovascular load so far today
   - **Sleep** (0–100) — last night's sleep performance
   - **Stress** (Low / Moderate / High estimate)
4. **Trends** — 7/30-day charts for each score (reuses the existing `MetricChart` component and period-filter pattern).

---

## The Scores

| Score | Name on page | Inputs | Method |
| --- | --- | --- | --- |
| Readiness/Recovery | **Readiness** | HRV (SDNN), resting HR, respiratory rate, wrist temp deviation, last night's sleep, yesterday's strain | Each input compared to the user's own 14-day rolling baseline; weighted blend; weights renormalize when an input is missing so the score works from day one |
| Strain | **Strain** | Active calories, workouts (duration + avg HR), steps, exercise minutes | Daily cardiovascular load vs. personal baseline; scales through the day |
| Sleep | **Sleep** | Duration vs. need, deep/REM share, bed/wake consistency, awake time | Duration is the dominant term; stage and consistency bonuses/penalties |
| Stress | **Stress** | Daily HRV vs. baseline, HR elevation vs. baseline, sleep debt | Estimate only, three bands; explicitly labeled "stress estimate" |

All wellness-framed: "estimate", "patterns", never "diagnosis". No medical claims.

---

## Data: what the iPhone already sends vs. what to add

The iOS app (`ArogyaM-iOS-v1`) pushes an 8-day payload to `POST /api/health-snapshots/[username]`; `lib/healthDataSync.ts` maps it into `DailyLog`.

| Signal | Status | Used by |
| --- | --- | --- |
| Avg heart rate | ✅ already synced | Stress |
| Steps, active calories, distance | ✅ already synced | Strain |
| Sleep (total, stages, bed/wake) | ✅ already synced | Sleep, Readiness |
| Workouts (type, duration, kcal, avg HR) | ✅ already synced | Strain |
| **HRV (SDNN)** | ➕ add to iOS app | Readiness, Stress |
| **Resting heart rate** | ➕ add to iOS app | Readiness, Stress |
| **Respiratory rate** | ➕ add to iOS app | Readiness |
| **Sleeping wrist temperature** | ➕ add to iOS app (Watch Series 8+ only, optional) | Readiness |

New payload fields are optional — old app builds keep syncing fine.

## iOS app ("watch page") role — v1

The iOS app stays the **data collector**, nothing more in v1:

1. Request the 5 new HealthKit read permissions (HRV, resting HR, respiratory rate, wrist temperature, VO2 max).
2. Fetch daily values for the new metrics and include them in the existing snapshot payload (`heart.restingBpm`, `heart.hrvSdnnMs`, `vitals.respiratoryRate`, `vitals.wristTempC`, `vitals.vo2Max`).
3. No new screens. The Health Sync page keeps working as-is.

Later (v2, optional): show the four scores natively in the iOS app by reading them back from the web API.

---

## Build order (all in one go)

1. **iOS**: new HealthKit read types + payload fields.
2. **Web sync**: `DailyLog` schema + `applyMetrics` mapping for the new fields.
3. **Score engine**: `lib/scores/` — baselines helper + `readiness.ts`, `strain.ts`, `sleep.ts`, `stress.ts`.
4. **API**: `GET /api/scores` — all four scores + guidance + 7/30-day trends in one response.
5. **Page**: `/vitals` page with hero ring, guidance, score grid, trends (glass-card / bento style).

---

## Built (July 1, 2026)

- **iOS** (`ArogyaM-iOS-v1`): HealthKit read types + per-day fetchers for HRV (SDNN), resting HR, respiratory rate, sleeping wrist temperature (sleep-window average), VO2 max; new optional payload fields `heart.restingBpm`, `heart.hrvSdnnMs`, `vitals.{respiratoryRate,wristTempC,vo2Max}`, plus per-workout `avgHeartRate` and sleep stage hours now carried through.
- **Sync** (`lib/healthDataSync.ts` + `models/DailyLog.ts`): new DailyLog fields `restingHeartRate`, `hrvSdnnMs`, `respiratoryRate`, `wristTempC`, `vo2Max`, `habits`, `mood`, sleep stage hours, workout `avgHeartRate`.
- **Engine** (`lib/scores/`): `baselines.ts` (14-day rolling personal baselines), `readiness.ts`, `strain.ts` (with HR zones), `sleep.ts`, `stress.ts`, `guidance.ts`, `insights.ts` (habit correlations), `index.ts` (`computeVitals`). Pure functions; weights renormalize when signals are missing.
- **API**: `GET /api/scores` (scores + guidance + 30-day trends + insights + today's journal), `POST /api/scores/journal` (habits + mood).
- **Page**: `/vitals` — Readiness hero ring, Today's Guidance band, Strain/Sleep/Stress grid with HR zone chips, habit journal modal, 7D/1M trends (readiness, strain, sleep, stress, HRV, resting HR), habit insights, non-diagnostic disclaimer. Nav entries added to Sidebar + MobileNav.
- **AI coach wiring**: `/api/ai/recommendations` context now includes resting HR, HRV, habits, mood per day plus today's computed Vitals scores and guidance.
- **iOS Vitals v2 (July 1, 2026)**: the iOS app now shows the four scores natively — new Vitals tab (`Features/Vitals/VitalsView.swift`) reads `GET /api/scores` and renders the Readiness hero ring, guidance band, Strain/Sleep/Stress grid, HR zone chips, 7D/1M Swift Charts trends (readiness, strain, sleep, stress, HRV, resting HR), habit insights, and the non-diagnostic disclaimer. Home shows a Readiness glance card. Whole app restyled to iOS 26 Liquid Glass (`glassEffect` cards/buttons/tab bar over an ambient color field). Local water + meal reminder notifications added (`Core/Notifications/NotificationService.swift`, tunable in a Reminders sheet from Home).

## Kept for later phases

| Feature | Working name | Why later |
| --- | --- | --- |
| Wellness age | **Wellness Age** | Needs several weeks of score history first |
| Pace of habits over time | (part of Wellness Age) | Same |
| Blood pressure log | BP Log | Manual entry / cuff import via HealthKit |
| Lab uploads | Labs | Manual first; partnerships later |

~~Native scores in iOS app (Vitals v2)~~ — built July 1, 2026 (see above).

## Removed from scope (was in the WHOOP analysis)

- Hardware-only: WHOOP MG device, 14+ day battery, wireless PowerPack, premium bands, screenless design, haptic alarm, priority support, lifetime warranty.
- Regulated medical: ECG capture, AFib detection, wrist blood-pressure measurement, sleep apnea detection, any diagnosis/treatment features.
- Third-party: Strava integration (revisit on demand).
