---
name: UI Frontend Agent - Skills
last_updated: 2026-09-07
updated_by: codex
---

# Skills

## Technologies Owned

- **Next.js 15 Client Components** - `'use client'` components, hooks, modals
- **Tailwind CSS 3.4** - dark styling, responsive breakpoints, token use
- **Framer Motion 11.15** - modal/page transitions
- **Recharts 2.15** - chart rendering
- **Lucide React 0.468** - icons
- **CSS keyframe animations** - in `app/globals.css`
- **UI state-heavy settings flows** - `app/(dashboard)/settings/page.tsx`
- **Orchestrator UI** - `components/orchestrator/*`

## Design System

### Color Palette

```text
Background:   #08080d / #0a0a0a / #171717
Text:         #f5f5f5 / #a3a3a3
Emerald:      #34d399
Violet:       #8b5cf6
Cyan:         #06b6d4
Amber:        #f59e0b
Rose:         #ef4444
Gold:         #ffdf00 / #d4af37
```

### Typography

```text
Heading:  Bebas Neue
Body:     Outfit
Mono:     JetBrains Mono
```

### Core Classes

```text
.glass-card
.card-glow
```

### Layout

```text
Dashboard desktop uses bento utility classes in globals.css
Sidebar breakpoint: lg (1024px)
Mobile nav: fixed bottom
Safe area: CSS variables for iOS notch handling
```

### Reusable UI Components

- `ProgressRing.tsx`
- `MacroBar.tsx`
- `MetricChart.tsx`
- `StatCard.tsx`
- `StatMini.tsx`
- `Toast.tsx`
- `Skeleton.tsx`

## Repo-Specific UI Patterns

- Dashboard has different desktop and mobile compositions in the same page file
- Settings is a large tabbed client page with query-param-driven tab state
- AI and debug surfaces are part of the product, not throwaway internal pages
- Hidden scrollbars are intentional and rely on custom overflow handling
