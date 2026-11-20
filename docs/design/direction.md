# Studex visual direction — "Calm precision" (v1, 2026-11-20)

Ohm asked for Apple-level UI: beautiful, smooth, native-feeling. This document is the design
contract for every screen. It refines `docs/spec/01-product.md` §10 (quality bar) and §11 (voice);
where they conflict, the spec wins. Owner: lead. Implemented in `packages/ui` (P0-08).

## 1. Principles
1. **Content first.** Numbers are the hero; chrome recedes. One idea per screen region.
2. **Depth through material, not decoration.** Native Liquid Glass on iOS 26 for floating chrome;
   flat, quiet surfaces everywhere else. No gradients for their own sake, no heavy shadows.
3. **Motion explains.** Every animation shows cause and effect (tap → number changes). Springs, not
   linear tweens. One hero moment only: the first count-up to your %.
4. **Honest color.** Accent for action and progress; green/red only as small status marks (psych).
5. **Native manners.** Platform tab bar, sheets, haptics, Dynamic Type, Reduce Motion, continuous
   corners. It should feel like it shipped with the phone.

## 2. Color tokens (light / dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `bg.grouped` | #F2F2F7 | #000000 | Screen background |
| `bg.surface` | #FFFFFF | #1C1C1E | Cards, rows |
| `bg.elevated` | #FFFFFF | #2C2C2E | Sheets, popovers |
| `fill.control` | rgba(120,120,128,0.12) | rgba(120,120,128,0.24) | Buttons, ring track, chips |
| `label.primary` | #000000 | #FFFFFF | Main text |
| `label.secondary` | rgba(60,60,67,0.60) | rgba(235,235,245,0.60) | Supporting text |
| `label.tertiary` | rgba(60,60,67,0.30) | rgba(235,235,245,0.30) | Hints, threshold tick |
| `separator` | rgba(60,60,67,0.18) | rgba(84,84,88,0.65) | Hairlines |
| `accent` | #4B5CF6 | #8A96FF | Primary actions, gauge, links |
| `accent.soft` | rgba(75,92,246,0.12) | rgba(138,150,255,0.18) | Tinted buttons, NOW row |
| `status.attended` | #1EA446 | #32D74B | Small marks only |
| `status.bunked` | #E5372B | #FF5A4E | Small marks only |
| `status.close` | #C27C00 | #FFB340 | Small marks only |
| `glass.fallback` | rgba(255,255,255,0.72) | rgba(28,28,30,0.72) | Floating chrome without Liquid Glass |
| `glass.border` | rgba(0,0,0,0.06) | rgba(255,255,255,0.08) | Hairline around fallback glass |
All text pairs meet WCAG 2.2 AA (NFR-A11Y-001); verify contrast in the gallery.

## 3. Typography (system font: SF Pro on iOS, Roboto on Android, system stack on web)
| Token | Size/line | Weight | Notes |
|---|---|---|---|
| `hero` | 88/88 | 700 | tabular-nums, letterSpacing −2, `maxFontSizeMultiplier` 1.3 |
| `largeTitle` | 34/41 | 700 | Screen titles |
| `title1` / `title2` / `title3` | 28/34 · 22/28 · 20/25 | 700 · 700 · 600 | |
| `headline` | 17/22 | 600 | Row titles, buttons |
| `body` | 17/22 | 400 | |
| `callout` / `subhead` | 16/21 · 15/20 | 400 | |
| `footnote` / `caption1` | 13/18 · 12/16 | 400 | |
| `caption2` | 11/13 | 600 | Uppercase badges ("NOW"), letterSpacing 0.5 |
Every number uses tabular figures. Text scales with the OS setting (up to 200% for body).

## 4. Space, shape, elevation
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 56. Screen margin 20 (16 below 360 dp width).
- Touch targets ≥ 44 pt / 48 dp. List rows ≥ 56.
- Radii with **continuous corners** (`borderCurve: 'continuous'` on iOS): sm 10 · md 14 · lg 20 ·
  xl 28 (sheets) · pill 999.
- One floating shadow token: iOS `#000`, opacity 0.08, radius 24, offset y 8; Android elevation 6.
  Cards on grouped backgrounds use surface color, not shadow.

## 5. Motion (Reanimated 4)
| Token | Definition | Use |
|---|---|---|
| `spring.snappy` | damping 24, stiffness 320, mass 1 | Press feedback, toggles, mark buttons |
| `spring.smooth` | damping 20, stiffness 180, mass 1 | Layout changes, cards, chips |
| `spring.gentle` | damping 22, stiffness 110, mass 1 | Toasts, large surfaces |
| `timing.fade` | 180 ms, bezier(0.2, 0, 0, 1) | Cross-fades |
| `timing.emphasized` | 320 ms, bezier(0.3, 0, 0, 1) | Entrances |
- **Press:** scale to 0.97 on press-in (snappy), back on release. Never on disabled controls.
- **Hero count-up (first reveal only):** 0 → value over 1,200 ms, ease-out cubic; tabular digits;
  the gauge ring sweeps in sync; one success haptic when it lands; the verdict sentence then rises
  8 pt and fades in (emphasized, 150 ms delay).
- **Marking:** the tapped button fills with its tint (snappy) and the icon scales 0.8 → 1; the row
  collapses into a state pill; the subject chip and the Today header numbers roll their digits in
  ≤ 300 ms; light haptic, identical for Attended and Bunked; an undo toast rises on glass (gentle)
  and leaves after 5 s with a hairline progress bar.
- **Lists:** springy layout transitions for insert/remove; first render may stagger rows 30 ms
  apart (max 6 rows, 12 pt rise). Nothing re-staggers on later renders.
- **Reduce Motion:** replace movement with 200 ms fades; the count-up shows the final number.
- **Never:** confetti, bounce on errors, more than one hero animation at once, animations > 400 ms
  except the first count-up.

## 6. Haptics (expo-haptics; respects the Settings toggle)
mark / undo → impact light · end-of-day sweep and "back above" toast → notification success ·
destructive confirm → notification warning · segmented or picker change → selection ·
first count-up landing → notification success.

## 7. Materials
- **iOS 26+:** `GlassView` (expo-glass-effect) for floating chrome — the undo toast, the Today
  header capsule, floating action bars — when `isLiquidGlassAvailable()`. The tab bar is native
  (`NativeTabs`) and becomes Liquid Glass automatically.
- **Elsewhere:** `glass.fallback` + `glass.border`; on web add `backdrop-filter: blur(20px)
  saturate(180%)` through a `.web.tsx` variant.

## 8. Icons
One `Icon` primitive with semantic names → SF Symbols on iOS (expo-symbols), Ionicons on Android
and web. Tabs: Today `sun.max` · Subjects `books.vertical` · Plan `calendar` · Library `folder` ·
Tutor `sparkles`. Marks: `checkmark` · `xmark` · `minus.circle` (cancelled).

## 9. Core components
- **Gauge ring:** 168 pt, stroke 14, round caps, `fill.control` track, `accent` progress, a short
  `label.tertiary` tick at the threshold. The ring never turns red; status shows as a small dot.
- **NumberTicker:** per-digit vertical roll with tabular figures; used for every live number.
- **ClassRow:** time column (start in headline, end in caption, tabular) · subject short name
  (headline) + room · kind (subhead, secondary) + budget chip (caption) · two equal 44 pt circular
  mark buttons (✓, ✕) side by side. Marked → a state pill ("Attended" / "Bunked" with a small
  status dot), tap to change. NOW row: `accent.soft` background + "NOW" capsule. Past unmarked:
  dashed hollow circle + "Did you make it?".
- **Card:** surface, radius lg, padding 20. **Button:** primary filled accent (height 50, radius md,
  headline white) · tinted (`accent.soft` + accent text) · plain. **Chip**, **Badge**,
  **SegmentedControl** (native-feeling), **Toast** (glass), **EmptyState** (44 pt symbol in accent,
  title3, body secondary, one primary button), **Skeleton** (soft shimmer).

## 10. Screen composition — Today
Large title "Today" with the date as subtitle and the avatar on the right → hero card (gauge,
caption "Overall", hero %, verdict sentence) → "Now", "Coming up", "Earlier" sections of ClassRows →
end-of-day sweep card ("Mark remaining {n} Attended"). Later phases add cards below, never above
the hero.

## 11. References (study, do not copy)
Apple Fitness (rings, digits), Apple Weather (big numerals, glass cards), Reminders and Things 3
(calm lists), Linear mobile (precision).
