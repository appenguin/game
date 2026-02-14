# PenguinSki

Penguin downhill ski game. PWA + Capacitor. No backend.

> **Note:** `CLAUDE.md` is a symlink to this file (`AGENTS.md`). Edit `AGENTS.md` directly.

## What this is

A penguin slides downhill on ice. Steer left/right to dodge obstacles (rocks, trees). Hit ramps to launch into the air. Perform tricks mid-air (flips, spins) for bonus points. Land cleanly or crash. Collect fish. Survive as long as possible.

Top-down scrolling, arcade feel, trick scoring.

## Tech stack

- **Phaser 3** game framework
- **TypeScript**
- **Vite** for bundling
- **Strudel** (`@strudel/web`) for procedural music
- **Capacitor** for Android APK wrapping

No backend. All data stored locally (localStorage / Capacitor Storage).

## Project structure

```
src/
  main.ts             Entry point, orientation lock, auto-pause, Android back button
  core/
    tricks.ts         Trick types, constants, scoring helpers (pure, no Phaser)
    difficulty.ts     Difficulty zones, spawn weights, speed profiles (pure, no Phaser)
    music.ts          Music pattern definitions, level thresholds (pure, no Phaser)
    storage.ts        High score persistence (localStorage, per-difficulty)
  engine/
    game.ts           Phaser config
    scenes/
      BootScene.ts    Difficulty selection menu, sound/music toggles, high score display, hides splash screen, launches Run
      RunScene.ts     Gameplay orchestrator, pause/game-over menus, saves high scores
    systems/
      Input.ts        Keyboard + touch + steer/trick buttons + ESC pause
      Spawner.ts      Obstacle spawning, scrolling, collision, hit tracking
      Music.ts        Strudel lifecycle, score-driven layer progression
      SFX.ts          Procedural sound effects (Web Audio API synthesis, no audio files)
      Haptics.ts      Vibration feedback (Web Vibration API, Android only)
      Effects.ts      Snow spray, ski trail, event particle bursts, ice sparkle, tree snow
  strudel.d.ts        TypeScript declarations for @strudel/web
  platform/           (planned) Platform adapters (web vs Capacitor)
public/               Static assets (icons, manifest, sprites)
  penguin-sheet.png   Penguin sprite sheet (2 frames @ 46x46: tucked, open wings)
  tree-sheet.png      Tree sprite sheet (4 frames @ 44x48: snow-covered variants)
  rock-sheet.png      Rock sprite sheet (4 frames @ 38x30: snow-covered variants)
penguin_images/       Source images (processed by build script)
  trees.png           Source tree image (2x2 grid of 4 snow-covered trees)
  rocks.png           Source rock image (2x2 grid of 4 snow-covered rocks)
scripts/
  build-sprites.py    Generates penguin-sheet.png + tree-sheet.png from penguin_images/
index.html            HTML entry point + splash screen
vite.config.ts        Vite + PWA config
android/              Android APK wrapper (Capacitor)
  www/                Bundled game assets (copied from dist/)
  android/            Android project (Gradle, Java)
  capacitor.config.json   App config (ID, name, bundled mode)
  generate-icons.py   Icon generation script
  build               Full build pipeline (web build → copy → cap sync → gradle)
  install             Install APK to connected device via adb
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
- **Air trick:** Two tricks, each once per jump unless repeated. Flip: X/Space/Enter or FLIP touch button (300 pts, full rotation). Tuck: Z or TUCK touch button while airborne (200 pts, squeeze animation). Multiple flips/tucks allowed if air time permits (each press = one trick, 0.4s air time required). Spin with Left/Right while airborne.
- **Landing:** Clean = full points with combo; sloppy = no points; crash = no points + combo reset.
- **Menus:** Arrow keys + Enter/Space navigate all menus (Doom-style). ESC pauses/resumes. R = retry, Q = quit. Touch also works. Tap HUD bar to pause on mobile. Pause menu: Resume / Quit. Game over menu: Retry / Quit.
- **Cheat:** +/= teleport forward 100m, -/_ teleport back 100m. Zeroes score, camera flash, advances music + storm.
- **Mobile layout:** `[<] [▼ TUCK] [★ FLIP] [>]` single row at bottom.

## Camera and rendering

- Procedural snow texture background (128×128 TileSprite, scrolls with world at depth -10)
- Penguin sprite sheet (2 frames: tucked/open wings) at screen center; world scrolls via `camera.scrollX`
- Trees are sprite-based (4 variants from `tree-sheet.png`, randomly selected, 2.2x scale, depth 7 — above penguin at depth 5)
- Rocks are sprite-based (4 variants from `rock-sheet.png`, randomly selected, 3.5x scale, depth 7)
- Ramps are procedural graphics (trapezoid with shadow, slope lines, lip highlight — generated texture at runtime, 1.6x scale, depth 6)
- Ice ponds are irregular polygons (8-12 random vertices around an elliptical path, unique shape each spawn)
- Other obstacles use procedural shapes (ellipses, circles)
- Snow spray particles + belly-slide trail behind penguin on ground; trail pauses inside trees
- Tree collision: continuous snow burst (white particles from tree + under penguin) while overlapping, tree shakes ±3px around origin, speed penalty scaled by hit centeredness
- **Health bar** (thin full-width line under HUD, color-coded green/yellow/red): rocks deal speed-scaled damage (25 base + 0.05/speed, caps ~55% at 600 speed) with lateral knockback and significant deceleration. Trees chip health (5-20 HP scaled by hit centeredness). Crash landings cost 10 HP. Fish heal +5 HP. Health auto-regenerates (2 HP/s) after 5s without damage. 0.5s damage cooldown prevents multi-hits. Death triggers dramatic camera shake + red flash + tumble animation. Game over at 0 HP
- Obstacles pre-spawned across the visible area on scene load so the slope isn't empty; game and music start immediately
- Obstacles persist after being hit (marked with `hit` flag to prevent re-triggering); only fish are removed on collection
- Event particle bursts on collisions and landings; camera bump on landing
- Snowstorm at 2000-3000m (tied to solo): 500 screen-fixed snowflake circles (`setScrollFactor(0)`) with organic wind gusts (160 px/s max); wind pushes penguin and obstacles laterally (5× push when airborne); white overlay reduces visibility; +30% air time during storm; ramps up over 100m, ends when solo ends
- UI pinned to screen with `setScrollFactor(0)` on each element individually (not via container, which breaks Phaser touch hit testing): HUD bar, buttons, menus

## Depth layering

| Depth | Element |
|-------|---------|
| -10 | Snow background TileSprite |
| -1–0 | Ski trail marks |
| 3 | Snow spray, ice sparkle, snowdrift puff |
| 4 | Penguin shadow |
| 5 | Penguin (ground), burst emitters at 6 |
| 7 | Trees |
| 8 | Penguin (airborne) |
| 9 | Storm snowflakes, storm overlay |
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

Trees are the most common obstacle (22% at easy, 25% at expert). Tree collision uses acceleration-based slowdown: grazing = -30 speed, dead center = -300 speed (near full stop). Resets combo. Trees also chip health (5-20 HP based on centeredness).

Obstacle spawn difficulty (distance zones 0-3 at 300/800/1500m) is separate and unchanged by level selection. Early game is gentle (70% fish, 3% rocks); expert difficulty is dense (22% fish, 30% rocks). Spawn intervals also tighten with distance (0.6s easy to 0.22s expert).

## Scoring

- **Distance:** slow trickle from forward movement
- **Fish:** +20 pts on collection
- **Flip:** 300 pts × combo on clean landing (full rotation animation)
- **Tuck:** 200 pts × combo on clean landing (squeeze animation)
- **Spin:** 100 pts per half rotation on clean landing
- **Ice:** 25 pts × combo, increments combo (chains with tricks)
- **Icy Jump:** hit ramp while slippery → +50% air time, 2× trick score on clean landing ("ICY COMBO")
- **Flyover:** 50 pts × combo for flying over rocks or trees while airborne
- **Combo:** increments on clean trick landings and ice patches; resets on crash or tree hit

## Audio

### Music

Procedural layered music powered by **Strudel** (`@strudel/web`). TR-909 drum samples bundled locally in `public/samples/` for offline/Android playback.

- 16-level progressive arrangement (0-15) driven by distance (meters), not score — instruments enter one at a time
- Starts with Bmin9 triangle chord pad, builds through sawtooth bass, drums (bd, hh, sd), ghost snares (TR-909), saw leads with `arrange()` cycling, bass progressions, to full solo at 2000m. Solo runs 2000-3000m with storm, then drops back to groove (bass4 + drums) post-solo
- Key: B minor. Tempo: BASE_BPM 140, per-difficulty: Easy 110, Medium 124, Hard 140 BPM (fixed throughout game)
- Level changes quantised to 4-bar boundaries for musical coherence
- On init, the full arrangement plays silently (`gain(0)`) for 500ms to preload all samples
- Pattern definitions live in `src/core/music.ts` — edit that file to change the music
- Music system (`src/engine/systems/Music.ts`) is a singleton shared across scenes
- Sound toggle and music toggle on boot screen, preferences persisted independently in localStorage (`penguinski:sfx`, `penguinski:music`)

### Sound effects

Procedural SFX synthesised at runtime using the Web Audio API — no audio files. All synthesis lives in `src/engine/systems/SFX.ts`.

- Each sound is a short-lived chain of Web Audio nodes (oscillators, noise buffers, filters, gain envelopes) that auto-cleanup after playback
- Shared white noise AudioBuffer (2s) created once in constructor, reused by all noise-based sounds
- Master gain node for global SFX volume; muted independently via Sound toggle on boot screen
- Sound events: fish collect (ding), clean/sloppy/crash landing, rock hit, tree hit (intensity scales with centeredness), ramp launch (whoosh), mogul launch (boing), ice entry (shimmer), snowdrift hit (poof), trick performed, game over

### AudioContext architecture

- Single AudioContext shared between Phaser, Strudel, and SFX — created in BootScene gesture handler
- AudioContext created synchronously inside native DOM gesture handler (`pointerdown`/`keydown`), then injected into superdough via `setAudioContext()` before `initStrudel()` runs. This bypasses Strudel's built-in `initAudioOnFirstClick()` which only listens for `mousedown`
- Injected into Phaser's `WebAudioSoundManager.setAudioContext()` and into the SFX system constructor
- Avoids mobile browser issues with multiple contexts

### Haptic feedback

Vibration feedback using the Capacitor Haptics plugin (`@capacitor/haptics`). All haptics live in `src/engine/systems/Haptics.ts`.

- Works on Android and iOS native apps via Capacitor, gracefully no-ops on web
- Haptics toggle on boot screen, preference persisted in localStorage (`penguinski:haptics`)
- Uses native haptic patterns: ImpactStyle (Light/Medium/Heavy) and NotificationType (Success/Warning/Error)
- Events: rock hit (heavy), tree hit (light/medium/heavy by centeredness), fish collect (light), ramp launch (medium), mogul (light), ice/snowdrift (light), landings (success/warning/error), trick (light), game over (vibrate)

## Development

```bash
npm install                # Install dependencies
npm run dev                # Dev server (Vite, port 8080)
npm run build              # Production build (tsc + vite)
npm run build:android      # Debug APK build (web + copy + cap sync + gradle)
./android/build-release    # Signed release APK (same pipeline, assembleRelease)
npm run preview            # Preview production build
```

## Analytics

[Umami](https://umami.is/) analytics via external script in `index.html`. Tracks `game-over` events (level, score, distance, newBest) in `RunScene.ts`. The tracking call is guarded by `typeof umami !== "undefined"`, so when offline the external script silently fails to load and tracking is a no-op.

## Deployment

**Web:** GitHub Pages at `game.appenguin.com`
- Deploy: `npm run build` then push, or GitHub Actions auto-deploys on push to `main`

**Android APK:** Built from `android/` directory using Capacitor + Gradle
- Bundled mode (offline, all assets included in APK)
- Debug: `npm run build:android` (or `./android/build`)
- Release: `./android/build-release` (signed, smaller)
- Debug output: `android/android/app/build/outputs/apk/debug/app-debug.apk` (~6.1MB)
- Release output: `android/android/app/build/outputs/apk/release/app-release.apk` (~5.1MB)
- Install: `./android/install` (requires adb)
- Requires Node >=22 for Capacitor CLI
- Android back button calls `window.__gameTogglePause()` directly (no synthetic keyboard events)
- Auto-pause on background via `window.__gamePause()` (pause-only, never unpauses)

### Release signing

- Keystore: `android/penguinski-release.jks` (gitignored, back up separately)
- Signing config in `android/android/gradle.properties` (RELEASE_STORE_FILE, RELEASE_KEY_ALIAS, passwords)
- `build.gradle` conditionally reads signing config when properties are present
- Keystore validity: 10,000 days (~27 years)

## Git standards

- Commit messages should be concise and descriptive
- Never add AI attribution or co-authorship markers to commits
- Never commit directly to main once CI is set up
