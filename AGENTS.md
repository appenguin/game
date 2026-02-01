# Ice Drift

Penguin downhill ski game inspired by Ski or Die (EA, 1990). PWA + Capacitor. No backend.

> **Note:** `CLAUDE.md` is a symlink to this file (`AGENTS.md`). Edit `AGENTS.md` directly.

## What this is

A penguin slides downhill on ice. Steer left/right to dodge obstacles (rocks, trees, crevasses). Hit ramps to launch into the air. Perform tricks mid-air (flips, spins) for bonus points. Land cleanly or crash. Collect fish. Survive as long as possible.

Inspired by **Ski or Die** (EA, 1990) -- especially the Downhill Blitz and Acro Aerials events. Top-down scrolling, arcade feel, trick scoring.

## Tech stack

- **Phaser 3** game framework
- **TypeScript**
- **Vite** for bundling
- **Strudel** (`@strudel/web`) for procedural music
- **Capacitor** for mobile wrapping (later)

No backend. All data stored locally (localStorage / Capacitor Storage).

## Project structure

```
src/
  main.ts             Entry point + orientation lock
  core/
    tricks.ts         Trick types, constants, scoring helpers (pure, no Phaser)
    difficulty.ts     Difficulty zones, spawn weights, speed profiles (pure, no Phaser)
    music.ts          Music pattern definitions, level thresholds (pure, no Phaser)
  engine/
    game.ts           Phaser config
    scenes/
      BootScene.ts    Difficulty selection menu, music toggle, launches Run
      RunScene.ts     Gameplay orchestrator, pause/game-over menus
    systems/
      Input.ts        Keyboard + touch + steer/trick buttons + ESC pause
      Spawner.ts      Obstacle spawning, scrolling, collision, hit tracking
      Music.ts        Strudel lifecycle, score-driven layer progression
      Effects.ts      Snow spray, ski trail, event particle bursts, ice sparkle, tree snow
  strudel.d.ts        TypeScript declarations for @strudel/web
  platform/           (planned) Platform adapters (web vs Capacitor)
public/               Static assets (icons, manifest, sprites)
  penguin-sheet.png   Penguin sprite sheet (2 frames @ 46x46: tucked, open wings)
  tree-sheet.png      Tree sprite sheet (4 frames @ 44x48: snow-covered variants)
penguin_images/       Source images (processed by build script)
  trees.png           Source tree image (2x2 grid of 4 snow-covered trees)
scripts/
  build-sprites.py    Generates penguin-sheet.png + tree-sheet.png from penguin_images/
index.html            HTML entry point
vite.config.ts        Vite + PWA config
docs/
  planning/           Implementation plans and progress
  blog/               Dev blog posts
```

## General guidelines

- When suggesting changes to a file, prefer breaking them into smaller chunks
- Never tell the user "you're absolutely right" or similar affirmations
- Act autonomously on reversible changes; ask before changing scoring logic or game feel
- Keep core game logic in `src/core/`, platform-independent
- Keep Phaser-specific code in `src/engine/`
- Platform adapters in `src/platform/` (web vs Capacitor)

## Constraints

- Offline-first: PWA with service worker already precaches all assets (vite-plugin-pwa)
- Touch-first controls with on-screen steer + trick buttons, keyboard as secondary. Input priority: keyboard > touch. Portrait orientation locked.
- Must run at stable FPS on mid-tier Android
- No remote code loading (App Store requirement)
- Bundle all assets inside the app for Capacitor builds

## Controls

- **Steering:** Arrow keys or A/D (keyboard), LEFT/RIGHT buttons or tap screen halves (touch). Angle-based with momentum; steering reduces downhill speed via `cos(heading)`. Ice patches reduce turn rate and increase drift.
- **Wing control (speed):** Up/W = spread wings (brake, +60 drag). Down/S = tuck wings (speed up, 0 drag). Neutral = 10 drag. Works on ground; tuck also works in air (changes sprite).
- **Air trick:** Space/Enter or TRICK touch button. Single "Flip" trick (300 pts), once per jump. Spin with Left/Right while airborne.
- **Landing:** Clean = full points with combo; sloppy = no points; crash = no points + combo reset.
- **Menus:** Arrow keys + Enter/Space navigate all menus (Doom-style). ESC pauses/resumes. R = retry, Q = quit. Touch also works. Pause menu: Resume / Quit. Game over menu: Retry / Quit.
- **Mobile layout:** `[<] [▼ TUCK] [★ TRICK] [>]` single row at bottom.

## Camera and rendering

- Penguin sprite sheet (2 frames: tucked/open wings) at screen center; world scrolls via `camera.scrollX`
- Trees are sprite-based (4 variants from `tree-sheet.png`, randomly selected, 2.2x scale, depth 7 — above penguin at depth 5)
- Other obstacles use procedural shapes (rectangles, triangles, ellipses, circles)
- Snow spray particles + belly-slide trail behind penguin on ground; trail pauses inside trees
- Tree collision: continuous snow burst (white particles from tree + under penguin) while overlapping, tree shakes ±3px around origin, speed penalty scaled by hit centeredness
- Obstacles persist after being hit (marked with `hit` flag to prevent re-triggering); only fish are removed on collection
- Event particle bursts on collisions and landings; camera bump on landing
- UI pinned to screen with `setScrollFactor(0)` on each element individually (not via container, which breaks Phaser touch hit testing): HUD bar, buttons, menus

## Depth layering

| Depth | Element |
|-------|---------|
| -1–0 | Ski trail marks |
| 3 | Snow spray, ice sparkle, snowdrift puff |
| 4 | Penguin shadow |
| 5 | Penguin (ground), burst emitters at 6 |
| 7 | Trees |
| 8 | Penguin (airborne) |
| 10–11 | HUD bar, text |
| 20 | Touch buttons |
| 50–51 | Menu overlays |

## Speed physics

Force-based model: speed changes each frame based on forces, clamped to difficulty cap.

```
gravity      = 120            (constant downhill pull)
friction     = speed * coeff  (normal 0.15, ice 0.03, snowdrift +0.25)
wingDrag     = 0 / 10 / 60   (tuck / neutral / spread)

accel = gravity - friction - wingDrag
speed += accel * dt
speed = clamp(speed, 0, cap)
```

## Difficulty levels

Three player-selected levels on the start screen:

| Level | Start speed | Cap |
|-------|------------|-----|
| Easy | 150 | 350 |
| Medium | 200 | 500 |
| Hard | 280 | 600 |

Speed is no longer a function of distance — it emerges from the force model. Players control speed via wing tuck/spread. Ice patches reduce friction (fast acceleration). Snowdrifts add extra friction drag.

Trees are the most common obstacle (40% at easy, 25% at expert). Tree collision uses acceleration-based slowdown: grazing = -30 speed, dead center = -300 speed (near full stop). Resets combo.

Obstacle spawn difficulty (distance zones 0-3) is separate and unchanged by level selection.

## Scoring

- **Distance:** slow trickle from forward movement
- **Fish:** +10 pts on collection
- **Trick (Flip):** 300 pts × combo on clean landing
- **Spin:** 100 pts per half rotation on clean landing
- **Ice:** 25 pts × combo, increments combo (chains with tricks)
- **Flyover:** 50 pts × combo for flying over rocks, trees, or crevasses while airborne
- **Combo:** increments on clean trick landings and ice patches; resets on crash or tree hit

## Music

Procedural layered music powered by **Strudel** (`@strudel/web`). Samples loaded from `github:tidalcycles/dirt-samples`.

- 16-level progressive arrangement driven by distance (meters), not score — instruments enter one at a time
- Supersaw bass, saw leads, drum samples (bd, hh, sd) build up as distance increases (solo at 1500m)
- Key: B minor. Tempo per difficulty: Easy 110, Medium 124, Hard 140 BPM (fixed throughout game)
- Pattern definitions live in `src/core/music.ts` — edit that file to change the music
- Music system (`src/engine/systems/Music.ts`) is a singleton shared across scenes
- Music toggle on boot screen, preference persisted in localStorage
- Strudel init deferred to first user gesture (pointer or keyboard) to satisfy browser AudioContext policy

## Development

```bash
npm install                # Install dependencies
npm run dev                # Dev server (Vite, port 8080)
npm run build              # Production build (tsc + vite)
npm run preview            # Preview production build
```

## Deployment

Hosted at `game.appenguin.com`.

## Documentation

- `ice_drift_pwa_capacitor_game_spec_appenguin_2.md` - Original game spec (drift runner concept)
- `docs/planning/2026-01-30-initial-implementation.md` - MVP planning and progress
- `docs/blog/2026-01-30-building-ice-drift.md` - Dev blog: project kickoff + PWA/touch controls
- `docs/phaser-reference.md` - Local Phaser 3 API reference (game objects, scenes, input, particles, etc.)

## Git standards

- Commit messages should be concise and descriptive
- Never add AI attribution or co-authorship markers to commits
- Never commit directly to main once CI is set up
