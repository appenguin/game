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
  main.ts         Entry point
  core/           Pure game logic (scoring, collision, RNG, tricks)
  engine/
    game.ts       Phaser config
    scenes/       Phaser scenes (Boot, Run, Menu, Results)
    entities/     Game objects (Penguin, Obstacle, Fish, Ramp)
    systems/      Camera, Input, Particles
  platform/       Platform adapters (web localStorage, Capacitor haptics/storage)
public/           Static assets (sprites, audio, manifest)
index.html        HTML entry point
vite.config.ts
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
- Touch and tilt-first controls, keyboard as secondary. Input priority: keyboard > tilt > touch
- Must run at stable FPS on mid-tier Android
- No remote code loading (App Store requirement)
- Bundle all assets inside the app for Capacitor builds

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
- `docs/planning/2026-01-30-initial-implementation.md` - MVP planning and progress (includes PWA + tilt controls)
- `docs/blog/2026-01-30-building-ice-drift.md` - Dev blog: project kickoff + PWA/tilt update

## Git standards

- Commit messages should be concise and descriptive
- Never add AI attribution or co-authorship markers to commits
- Never commit directly to main once CI is set up
