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
- **Capacitor** for mobile wrapping (later)

No backend. All data stored locally (localStorage / Capacitor Storage).

## Project structure

```
src/
  main.ts             Entry point + orientation lock
  core/
    tricks.ts         Trick types, constants, scoring helpers (pure, no Phaser)
    difficulty.ts     Difficulty zones, spawn weights, speed curve (pure, no Phaser)
  engine/
    game.ts           Phaser config
    scenes/
      BootScene.ts    Minimal boot, launches Run
      RunScene.ts     Gameplay orchestrator (~430 lines)
    systems/
      Input.ts        Keyboard + touch + steer/trick buttons
      Spawner.ts      Obstacle spawning + management
  platform/           (planned) Platform adapters (web vs Capacitor)
public/               Static assets (icons, manifest)
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

**Ground steering (angle-based with momentum):**
- Keyboard: Arrow keys or A/D rotate the penguin's heading angle
- Touch: LEFT/RIGHT arrow buttons or tap/swipe relative to penguin position
- Heading has momentum: builds up while held, drifts back to center on release
- Penguin sprite rotates to show heading; lateral movement follows the angle
- Ice patches reduce turn rate and increase drift (sluggish + slippery)

**Air tricks:**
- Keyboard: Up/W = Backflip, Down/S = Front Tuck, Left/A = Left Spin, Right/D = Right Spin
- Touch: FLIP button (bottom-right) = Backflip, TUCK button (bottom-right) = Front Tuck
- Holding LEFT/RIGHT while airborne triggers Left/Right Spin
- Heading is frozen in air; penguin drifts passively from launch angle

**Mobile button layout (single row at bottom):**
```
[<] [FLIP] [TUCK] [>]
```

Input priority: keyboard > touch buttons > touch half-screen.

## Development

```bash
npm install                # Install dependencies
npm run dev                # Dev server (Vite, port 8080)
npm run build              # Production build (tsc + vite)
npm run preview            # Preview production build
```

## Deployment

Hosted on GitHub Pages at `icedrift.appenguin.com`.

Push to `main` triggers automatic deployment via GitHub Actions.

## Documentation

- `ice_drift_pwa_capacitor_game_spec_appenguin_2.md` - Original game spec (drift runner concept)
- `docs/planning/2026-01-30-initial-implementation.md` - MVP planning and progress
- `docs/blog/2026-01-30-building-ice-drift.md` - Dev blog: project kickoff + PWA/touch controls

## Git standards

- Commit messages should be concise and descriptive
- Never add AI attribution or co-authorship markers to commits
- Never commit directly to main once CI is set up
