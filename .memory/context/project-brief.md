---
name: project-brief
type: context
last_updated: 2026-04-15
updated_by: codex-gpt-5
---

# Project Brief

## What It Is

**Arogyamandiram** is a health and wellness web app with a clean dashboard UX, AI-assisted logging, personalized plans, reminders, and habit gamification. It focuses on everyday health workflows: meals, hydration, workouts, sleep, weight, todos, and external health-data sync.

## Who It's For

Users who want one place to track daily health behavior instead of splitting food, water, workout, sleep, and reminders across separate apps. Product positioning is now global rather than country-specific; the built-in food catalog still reflects existing seeded categories, while the food pipeline also pulls in USDA FoodData Central results when local cache coverage is thin.

## What Problems It Solves

- Fragmented daily health workflows across multiple apps
- Limited culturally relevant food search and meal ideas
- Manual logging friction for food and workout tracking
- Weak feedback loops around consistency, reminders, and day planning
- Limited visibility into health-device or mobile-app sync data

## Core Features

| Feature | Description |
|---------|-------------|
| Food Logger | Cached `Food` collection + USDA fallback; quick search, custom entries, AI natural-language parsing |
| Water Tracker | Animated glass visualization with customizable quick-add amounts |
| Weight Journal | Trend charts (7D–1Y), BMI calculator, history table |
| Workout Tracker | Exercise logging, calorie burn estimation, AI workout logging, edit modal |
| Sleep Tracker | Bedtime/wake time, duration, quality rating (1–5 stars) |
| AI Orchestrator | Natural-language router for water, weight, sleep, food, meal ideas, and workouts |
| AI Daily Plan | Per-day overview, food suggestions, workout suggestions, regeneration controls |
| AI Insights | Recommendations and period-based analysis (yesterday/week/month/year) |
| Gamification | Streaks, badges, XP, leveling system |
| Achievements | Badge collection grid, streak overview, personal records |
| Reminders | Email reminders with SMTP/IMAP setup, schedules, reply processing, cron hooks |
| Health Data Sync | External endpoint ingestion with interval sync, status tracking, source provenance |
| Daily Todos | Template-based recurring checklist surfaced in dashboard flows |
| Onboarding | Multi-step setup with target calculation and dashboard tour state |

## Project Status (as of 2026-04-15)

Active development. Core features are broad and mostly implemented; the current branch is centered on minor updates around email reminders, AI daily plans, sync automation, settings cleanup, and global product positioning. The memory docs needed refresh because several older assumptions remained after the repo grew beyond the original tracker scope.
