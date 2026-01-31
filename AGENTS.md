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
    difficulty.ts     Difficulty zones, spawn weights, speed curve (pure, no Phaser)
    music.ts          Music pattern definitions, level thresholds (pure, no Phaser)
  engine/
    game.ts           Phaser config
    scenes/
      BootScene.ts    Difficulty selection menu, music toggle, launches Run
      RunScene.ts     Gameplay orchestrator, pause/game-over menus
    systems/
      Input.ts        Keyboard + touch + steer/trick buttons + ESC pause
      Spawner.ts      Obstacle spawning + management
      Music.ts        Strudel lifecycle, score-driven layer progression
      Effects.ts      Snow spray, ski trail, event particle bursts, ice sparkle
  strudel.d.ts        TypeScript declarations for @strudel/web
  platform/           (planned) Platform adapters (web vs Capacitor)
public/               Static assets (icons, manifest, sprites)
  penguin-sheet.png   Penguin sprite sheet (2 frames @ 46x46: tucked, open wings)
penguin_images/       Source penguin images (processed by build script)
scripts/
  build-sprites.py    Generates public/penguin-sheet.png from penguin_images/
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
- **Air tricks:** Up/W = Backflip, Down/S = Front Tuck. Hold to perform (shows tucked sprite). Spin with Left/Right while airborne. Tricks don't rotate the penguin; only L/R spin does.
- **Landing:** Clean = full points with combo; sloppy = no points; crash = no points + combo reset.
- **Menus:** Arrow keys + Enter/Space navigate all menus (Doom-style). ESC pauses/resumes. Touch also works.
- **Mobile layout:** `[<] [FLIP] [TUCK] [>]` single row at bottom.

## Camera and rendering

- Penguin sprite sheet (2 frames: tucked/open wings) at screen center; world scrolls via `camera.scrollX`
- Obstacles spawn in world-space, scroll upward past the penguin
- Snow spray particles + belly-slide trail behind penguin on ground
- Event particle bursts on collisions and landings; camera bump on landing
- UI pinned to screen with `setScrollFactor(0)`: HUD bar, buttons, menus

## Difficulty levels

Three player-selected levels on the start screen:

| Level | Start speed | Acceleration | Cap |
|-------|------------|--------------|-----|
| Easy | 150 | 0.02/dist | 350 |
| Medium | 200 | 0.04/dist | 500 |
| Hard | 280 | 0.07/dist | 600 |

Obstacle spawn difficulty (distance zones 0-3) is separate and unchanged by level selection.

## Music

Procedural layered music powered by **Strudel** (`@strudel/web`). Samples loaded from `github:tidalcycles/dirt-samples`.

- 16 layers that stack as score increases (full arrangement at 1500 score)
- Synth oscillators (sawtooth, triangle, square) for pads, bass, arps, melodies
- Drum samples (bd, hh, sd, oh) introduced gradually, interleaved with synths
- Key: E minor. Base tempo: 110 BPM (+1 per level)
- Pattern definitions live in `src/core/music.ts` — edit that file to change the music
- Music system (`src/engine/systems/Music.ts`) is a singleton shared across scenes
- Music toggle on boot screen, preference persisted in localStorage
- AudioContext unlocks on first user interaction (tap)

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
- `docs/phaser-reference.md` - Local Phaser 3 API reference (game objects, scenes, input, particles, etc.)

## Git standards

- Commit messages should be concise and descriptive
- Never add AI attribution or co-authorship markers to commits
- Never commit directly to main once CI is set up
