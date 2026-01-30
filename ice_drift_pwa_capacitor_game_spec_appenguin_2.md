# Ice Drift — PWA + Capacitor Game Spec (Appenguin 2.0 Showcase)

A **fancy, touch-first browser game** that ships as:
- a **standalone web game**
- an **installable PWA** (offline-capable)
- **Android/iOS apps** via **Capacitor** (Appenguin 2.0)

No backend required.

---

## High-level concept
**Ice Drift** is a one-tap/hold **drift runner**.

**Core loop:**
- You’re a penguin sliding downhill on ice.
- **Hold** to drift (curved trajectory), **release** to snap back.
- Collect fish, chain “clean drifts” for a multiplier.
- Avoid hazards (rocks, cracks, snow mounds).
- Survive as long as possible.

**Why this is a great Appenguin 2.0 showcase**
- Feels like a real native game while staying web-first.
- Works offline (PWA + bundled assets inside Capacitor).
- Looks premium with WebGL effects and particles.
- Touch-first controls are perfect for mobile stores.

---

## Goals
1. **Ship fast** (MVP in days/weeks, not months).
2. **Premium feel** (particles, trails, parallax, smooth audio).
3. **Offline-first** (no network dependency).
4. **Wrap cleanly** with Capacitor (no store review surprises).

---

## MVP scope (v1)
### Gameplay
- Infinite procedural downhill track.
- Single main mechanic: **drift**.
- 3 obstacle types:
  - **Rocks** (instant fail)
  - **Ice cracks** (slows + shakes + near-fail if repeated)
  - **Snow mounds** (bump + lane shift)
- Collect **fish** for points.

### Scoring
- Distance score + fish score.
- **Combo multiplier** for consecutive “clean drifts” (no collisions, tight turns).
- “Perfect drift” bonus (timing window + proximity to obstacles).

### Progression
- Fish act as soft currency.
- Unlock 3–5 cosmetic skins (penguin hats/scarves/boards).

### UX
- Main menu
- Run
- Results screen
- Settings: SFX/music/vibration toggles

---

## Fancy-but-cheap polish (v1.1)
These are high ROI and don’t require major content production:
- **Parallax background layers** (mountains, clouds, aurora).
- **Snowfall particles** with subtle depth.
- **Drift trail glow** (additive blend) + skid marks.
- **Near-miss effects** (brief slow-mo + vignette + whoosh).
- **Haptics** (Capacitor) for perfect drifts and collisions.

---

## Controls (mobile-first)
- **Hold** anywhere on screen: drift
- **Release**: snap back / straighten
- Optional (later):
  - Two-finger tap: pause
  - Swipe down: quick restart

---

## Tech stack
### Game
- **Phaser 3 + TypeScript**
- **Vite** for bundling/build

### PWA
- Web app manifest + service worker
- Cache strategy for offline play

### Mobile
- **Capacitor** wrapper for Android/iOS
- Native touches:
  - Haptics
  - Share sheet
  - Storage

No server required.

---

## Architecture (web-first, platform-agnostic)
Keep core game logic independent from platform (web vs Capacitor).

### Suggested module layout
- `core/` — pure logic
  - deterministic RNG + run seed
  - scoring + combo
  - progression + unlock rules
  - collision decisions (as rules)

- `engine/` — Phaser-specific
  - scenes: Boot, Menu, Run, Results
  - rendering, sprites, particle systems
  - input mapping (touch/mouse/keyboard)

- `platform/` — adapters
  - `web/` adapters (localStorage, Web Share)
  - `cap/` adapters (Capacitor Storage/Haptics/Share)

### Why this matters
- Same game runs on web/PWA/capacitor without branching logic everywhere.
- Easy to add features later (ads/IAP/leaderboards) without rewriting the game.

---

## Repo skeleton
```text
apps/game/
  src/
    core/
    engine/
    platform/
      web/
      cap/
  public/
  index.html
  vite.config.ts

apps/capacitor/   (optional wrapper package)
packages/shared/  (optional later)
```

---

## PWA requirements (offline-first)
- Cache **all** assets required to start and play offline.
- Version assets (e.g., hashed filenames) to avoid corrupted caches on updates.
- One-time “Downloading assets…” loader; then instant boots forever.
- Save locally:
  - best score
  - unlocked skins
  - settings

---

## Capacitor / App Store pitfalls to avoid
These reduce rejection risk:
- **Bundle the built web app inside the mobile app** (don’t load game JS remotely).
- Avoid anything that looks like a “thin web wrapper.”
- Add minimal native touches:
  - haptics
  - share button
  - local settings storage

Optional later:
- daily challenge notification (local notifications)

---

## Launch plan
1. **MVP web build** (desktop + mobile touch)
2. Add **PWA** (offline + installable)
3. Wrap with **Capacitor** (Android first, then iOS)
4. Store checklist:
   - icons + splash screens
   - screenshots
   - privacy policy page
   - age rating (no UGC/chat = easy)
5. Ship v1, then iterate:
   - new obstacles
   - daily seed challenge
   - cosmetics

---

## Monetization (post-approval)
Avoid adding complexity before first approval.

Options:
- Ads (rewarded video to continue once)
- Cosmetic IAP pack
- Remove ads IAP

---

## Stretch ideas (optional)
- **Daily seed challenge**: share a code, no backend.
- Ghost replay (best run stored locally).
- Seasonal themes (winter/night/aurora).

---

## Definition of Done (v1)
- Playable start-to-fail loop with stable FPS on mid-tier Android.
- Offline playable as PWA.
- Capacitor build runs with bundled assets.
- Local persistence (best score, settings, unlocks).
- App-store friendly: no remote code loading, no UGC.

