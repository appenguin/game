# PenguinSki: initial implementation

## Progress

### Completed

- [x] Project scaffolding: AGENTS.md, README, GitHub Pages workflow, CNAME, .gitignore
- [x] Vite + TypeScript + Phaser 3 project setup
- [x] Build verified: tsc passes, vite build produces dist/
- [x] Researched game libs (Phaser vs KAPLAY vs LittleJS vs PixiJS). Staying with Phaser 3 for polish
- [x] Pivoted game concept: from drift runner to Ski or Die-style downhill with ramps and tricks
- [x] Phase 1a: Basic downhill prototype working
  - Penguin near top of screen, obstacles scroll upward (downhill perspective)
  - Left/right steering (keyboard + touch)
  - Rocks (game over), trees (slow + lose combo), ramps (launch), fish (points)
  - Airborne trick system: directional inputs perform tricks, variety bonus
  - Clean landing scores points * combo multiplier, crash landing resets combo
  - Score display, trick name flash, combo counter
  - Speed increases over distance
  - Game over screen with restart (R key or tap)
- [x] Phase 1b: More slope elements and difficulty tuning
  - Ice patches (reduced steering), crevasses (game over), moguls (mini-launch), snowdrifts (slow)
  - Fish clusters (3-5 in diagonal line)
  - 4 difficulty zones by distance (easy/medium/hard/expert)
  - Spawn spacing enforcement, weighted spawn tables per zone
  - Speed cap at 500, slow/icy status effects with UI indicators
- [x] PWA + mobile controls (pulled forward from Phase 6)
  - `vite-plugin-pwa` with inline manifest, auto-updating service worker, workbox precaching
  - Placeholder PWA icons (192x192, 512x512) in `public/assets/icons/`
  - Mobile meta tags: theme-color, apple-mobile-web-app-capable, viewport-fit=cover, no user scaling
  - Phaser config: `fullscreenTarget`, `activePointers: 2`
  - Portrait orientation locked via PWA manifest + Screen Orientation API
  - Input priority: keyboard > touch
- [x] Controls overhaul: touch halves + trick buttons
  - Removed tilt/gyroscope steering (DeviceOrientationEvent)
  - Touch steering: left/right halves of screen (was thirds with dead center)
  - On-screen FLIP and TUCK buttons for Backflip and Front Tuck tricks while airborne
  - Left/Right adds continuous spin while airborne (visual, not scored)
  - Multi-touch: pointer-ID tracking so one finger steers while another taps trick buttons

- [x] Steering overhaul: angle-based steering with momentum
  - Left/right input rotates penguin heading angle (was instant lateral strafe)
  - Heading has angular velocity with acceleration + drag (momentum/inertia)
  - Heading returns to center when no input (gravity pulls straight downhill)
  - Lateral movement from `sin(heading) * scrollSpeed`; penguin sprite rotates to show heading
  - Counter-steering (pressing opposite direction) gets 2x acceleration for snappy corrections
  - Max angle ±40°; ice patches reduce turn rate and increase drift
  - While airborne, heading is frozen; penguin drifts passively from launch angle
  - Touch steering uses screen center (penguin always centered); tap right of center = steer right
  - On-screen LEFT/RIGHT steer buttons for mobile, 4-button bottom row: `[<] [FLIP] [TUCK] [>]`
- [x] Phase 2: Refactor RunScene into modules
  - Extracted `core/tricks.ts`: Trick interface, TRICKS constant, `calcTrickScore()`, `canQueueTrick()`
  - Extracted `core/difficulty.ts`: difficulty zones, speed curve, spawn weight tables, `pickObstacleType()`
  - Extracted `engine/systems/Input.ts`: keyboard + touch + trick buttons, input priority resolution
  - Extracted `engine/systems/Spawner.ts`: SlopeObject, all spawn helpers, collision checking, object lifecycle
  - RunScene slimmed from 814 to ~430 lines: thin orchestrator importing from modules
  - Build passes, gameplay behavior identical
- [x] Centered camera: penguin always at screen center, world scrolls via `camera.scrollX`
  - Obstacles spawn in world-space relative to penguin position
  - Horizontal culling for off-screen objects
  - All UI uses `setScrollFactor(0)` to stay pinned to screen
  - Touch steering uses screen center (penguin is always centered)
- [x] Difficulty selection screen (BootScene)
  - Three levels: Easy, Medium, Hard with colored buttons
  - Per-level speed profiles in `core/difficulty.ts` (start speed, acceleration, cap)
  - Level passed to RunScene via scene data, preserved on restart
- [x] Top bar HUD
  - Semi-transparent dark bar at top of screen (36px, 0.45 alpha)
  - Shows labeled score, distance (m until 1 km, then km), speed (km/h), and difficulty level name
  - All elements pinned to screen with `setScrollFactor(0)`

- [x] Music system (Strudel)
  - `@strudel/web` integrated via npm, bundled by Vite
  - Multi-level progressive arrangement driven by distance (meters), instruments enter one at a time
  - Sawtooth bass, saw leads, drum samples (bd, hh, sd) from dirt-samples
  - Each level is a full mix (not additive layers); level changes quantised to 4-bar boundaries
  - Pattern definitions in `src/core/music.ts` (pure, no Phaser), easy to edit
  - Music system singleton in `src/engine/systems/Music.ts`, shared across scenes
  - Full arrangement plays silently on init to preload all samples
  - Music toggle on boot screen, preference persisted in localStorage
  - Music stops on game over, resets on restart
  - AudioContext created in gesture handler, injected via superdough `setAudioContext()`
  - Phaser audio enabled; shared AudioContext between Phaser, Strudel, and SFX
  - Key: B minor. Tempo per difficulty: Easy 110, Medium 124, Hard 140 BPM (fixed)

- [x] Snow spray and belly-slide trail (Phase 3 partial)
  - `engine/systems/Effects.ts`: snow particle emitter + trail system
  - Snow particles: blue-tinted, speed-scaled (more at higher speed), disabled when airborne/stopped
  - Trail: single fading rectangles in world-space, scroll upward with obstacles
  - Snow particle texture generated in RunScene.preload()
  - Note: Phaser `setFrequency` and `particleAngle` assignment break emitters; using manual `emitParticle` instead

- [x] Event particle bursts and screen effects (Phase 3 continued)
  - 7 particle textures generated in RunScene.preload() (loop-based, single Graphics instance)
  - 6 new burst emitters in Effects.ts — all `emitting: false`, manual `emitParticle`
  - Snow burst on landing (clean and crash), using same snow-particle texture as spray
  - Yellow sparkle on fish collected, gray burst on rock/crevasse death
  - White puff on snowdrift contact, cyan sparkle trail while on ice patch
  - Camera bump (scrollY tween, 80ms yoyo) on every landing
  - Penguin bounce (y tween, 100ms yoyo) on crash landing
  - Ice sparkle stops when slipperyTimer expires
  - Cut: near-miss slow-mo (tested, removed — triggered too easily/unreliably)
  - Cut: snowfall background (tested particles and world-space circles, neither looked right)
  - Cut: speed lines, combo border glow (deferred to later)

- [x] Game feel polish (Phase 3 continued)
  - Ice steering: reduced to 8% turn acceleration and 15% max turn speed (sluggish, not locked)
  - Three-tier landing system: clean / sloppy (no points) / crash (combo reset)
  - Trick rotation: constant-speed (0.8s per trick) instead of lerp
  - Spin scoring: 100 points per half rotation (doubled from 50)
  - Landing particles: snow texture (consistent with spray), not gold/red

- [x] Doom-style menu system (Phase 4 partial)
  - Unified menu with arrow key (Up/Down/W/S) navigation + Enter/Space to select
  - Cursor highlight with ▶ prefix, wraps top/bottom
  - ESC pauses game, shows pause menu (Resume, New Game, Quit)
  - Game over screen uses same menu (Retry, Quit) after death animation
  - Boot scene: keyboard-navigable difficulty selection + music toggle, defaults to Medium
  - All menus support touch/click with enlarged hit areas (16px padding) and pointer hover
  - Menu elements use individual `setScrollFactor(0)` (not via container) so touch works with camera scroll

- [x] Penguin sprite sheet (Phase 5 partial)
  - Replaced static `penguin.png` with 2-frame sprite sheet (`penguin-sheet.png`, 46x46 per frame)
  - Frame 0: wings tucked (default slide, trick held, crash landing)
  - Frame 1: wings open (airborne, death)
  - Source images in `penguin_images/`, build script at `scripts/build-sprites.py`
  - Penguin type changed from `Image` to `Sprite` in RunScene
  - Tricks no longer rotate the penguin; only L/R spin rotates
  - Tricks are hold-to-perform: shows tucked sprite while trick key held

- [x] Force-based physics and wing drag speed control
  - Replaced distance-based speed curve (`getBaseSpeed()`) with force integration
  - `accel = gravity(120) - friction(speed * coeff) - wingDrag(0/10/60)`
  - Up/W = spread wings (brake, 60 drag), Down/S = tuck wings (speed up, 0 drag), neutral = 10 drag
  - Ice: friction coeff 0.03 (fast acceleration), snowdrifts: +0.25 friction (replaces 50% multiplier)
  - Starting speed from difficulty profile, clamped to level cap
  - Tricks consolidated: single "Flip" (300 pts) triggered by Space/Enter or TRICK touch button
  - Touch buttons changed from `[< FLIP TUCK >]` to `[< ▼TUCK ★TRICK >]`
  - TUCK is held (ground + air), TRICK is one-shot (air only)
  - Sprite frames: ground neutral=0, ground spread=1, air default=1, air tuck=0

- [x] Snow-covered tree sprites (Phase 5 continued)
  - 4 tree variants from `penguin_images/trees.png` (2x2 grid), built to `public/tree-sheet.png` (4 frames @ 44x48)
  - Build script extended with `build_tree_sheet()`: splits grid, removes bg, scales, composes horizontal strip
  - `SlopeObject.sprite` type widened to `Shape | Sprite` union
  - Trees spawn at 2.2x scale, random frame, depth 7 (above penguin at 5)
  - Tree spawn rates doubled: 40% easy, 35% medium, 30% hard, 25% expert
  - Collision rework: acceleration-based slowdown scaled by hit centeredness (grazing -30, center -300)
  - Obstacles persist after hit (`hit` flag prevents re-triggering); only fish removed on collection
  - Continuous snow burst while penguin overlaps tree (white particles from tree + under penguin each frame)
  - Tree shakes ±3px around stored origin while overlapping (sprite destroyed/recreated to fix display list depth)
  - Ski trail pauses inside trees (`inTree` flag passed to Effects.update)
  - `SlopeObject` extended with `hit`, `originX`, `originY` fields

- [x] Music/boot fixes
  - Silenced intro music layer (was a slow pad, now silence until first layer kicks in)
  - Silenced death pattern (was a sawtooth buzz, now silence)
  - Fixed boot menu music toggle showing empty string on initial render

- [x] High score persistence (Phase 4 partial)
  - `core/storage.ts`: saveScore() / getBest() per difficulty, localStorage under `"icedrift:scores"`
  - RunScene: saves score on game over, shows "NEW BEST!" if it's a new record
  - BootScene: displays "BEST: {score} · {distance}" for selected difficulty, updates on cursor move

- [x] Snowstorm at 1500m (Phase 3 continued)
  - 500 screen-fixed snowflake circles managed manually in Effects.ts (Phaser particle emitters don't support `setScrollFactor(0)`)
  - Wind model: two layered sine waves for organic gusts, max 160 px/s lateral push
  - Half the snowflakes are fast (1.8-2.2× speed, smaller, fainter), half are slow — creates depth
  - Wind pushes penguin laterally (5× when airborne) and drifts obstacles sideways via Spawner
  - +30% air time on all jumps during storm (stacks with icy launch's +50%)
  - White overlay fades in to 15% alpha for reduced visibility
  - Storm intensity ramps 0→1 over 100m after the 1500m threshold
  - Coincides with the music reaching full solo (level 15)

- [x] Lives system and rock fling (Phase 3 continued)
  - 3 lives displayed as 🐧 emojis in HUD bar
  - Rock hit: fling penguin off-screen (tween: 16π spin, shrink, fade over 1s), respawn at center
  - 2s invincibility flash after respawn; camera freezes during fling
  - Last life → normal game over with death spin
  - Rocks scaled up from 2.8x to 3.5x, hitbox 60×48

### Current step

- [ ] Phase 7: Capacitor enhancements (haptics, share, status bar)

### Completed

- [x] Phase 5: Art and audio (sprites + SFX done)

---

## Game concept

Inspired by **Ski or Die** (EA, 1990), especially:
- **Downhill Blitz**: top-down scrolling, dodge obstacles, hit jumps, choose routes
- **Acro Aerials**: launch off ramps, perform tricks mid-air, judges score your performance

Our version: a penguin slides downhill on ice. Steer left/right to avoid obstacles. Hit ramps to go airborne. Perform tricks in the air for bonus points. Land cleanly or crash. Collect fish. Speed increases over time.

### Core mechanics

| Mechanic | How it works |
|----------|-------------|
| Steering | Left/right rotates penguin heading with momentum; lateral movement follows angle; downhill speed reduced by `cos(heading)` — slalom costs forward momentum |
| Speed control | Up/W spreads wings (brake), Down/S tucks wings (speed up). Force model: gravity - friction - wingDrag each frame |
| Auto-scroll | Obstacles scroll upward (penguin at top = downhill perspective), speed driven by force-based physics |
| Obstacles | Rocks (game over), trees (speed loss scaled by hit center, persist on screen), ice patches (reduced steering + low friction), moguls (small bump/air), snowdrifts (extra friction drag) |
| Ramps | Hit a ramp to launch into the air. Airtime depends on speed |
| Tricks | While airborne, tap directions to perform tricks (flip, spin). Each trick has a point value |
| Landing | Clean = keep trick points. Crash = lose trick points + penalty |
| Fish | Collectibles on the slope, worth base points. Sometimes in clusters. |
| Combo | Consecutive clean trick landings increase multiplier |
| Icy Jump | Hit ramp while slippery → +50% air time, 2× trick score on clean landing |
| Scoring | Slow distance trickle + fish + (tricks + spin) * combo multiplier * icy multiplier |

### Trick system

Single trick triggered while airborne:

| Input | Trick | Points |
|-------|-------|--------|
| Space / Enter / TRICK button | Flip | 300 |
| Left/Right | Spin | 100 per half rotation |

Up/Down keys now control wing tuck/spread (speed), not tricks. Left/Right add continuous spin while airborne (scored on landing). Tricks do not rotate the penguin; only L/R spin rotates.

- One trick per jump (Flip)
- Crash landing = zero trick points for that jump, combo reset
- Heading rotation is preserved in air; spin layers on top

---

## Phase 2: Refactor (completed)

RunScene.ts was 814 lines. Extracted game logic into focused modules to keep it maintainable and make each system testable.

### File breakdown (actual)

```
src/
  core/
    tricks.ts          Trick interface, single TRICKS constant, calcTrickScore(), canQueueTrick()
    difficulty.ts      Difficulty zones, spawn weights, speed profiles, pickObstacleType()
    music.ts           Music pattern definitions, level thresholds, getMusicLevel()
    storage.ts         High score persistence (saveScore, getBest), localStorage per difficulty
  engine/
    scenes/
      BootScene.ts     Difficulty selection, music toggle, launches RunScene with level
      RunScene.ts      Orchestrator (~620 lines): penguin state, camera, scoring, HUD, music, effects wiring, high score save, delegates to systems
    systems/
      Spawner.ts       SlopeObject interface (Shape|Sprite, hit/origin tracking), spawn helpers, collision, redrawTree
      Input.ts         Keyboard + touch + steer/tuck/trick buttons, getTuckHeld(), getSpreadHeld()
      Music.ts         Strudel lifecycle, score-driven layer progression, singleton
  strudel.d.ts         TypeScript declarations for @strudel/web
```

### What moved where

| From RunScene | To | Why |
|---------------|-----|-----|
| `Trick` interface, `TRICKS` constant, trick queueing logic | `core/tricks.ts` | Pure data + logic, no Phaser dependency |
| `getDifficulty()`, speed curve, spawn weight tables, interval lookups | `core/difficulty.ts` | Pure logic, testable |
| `SlopeObject` interface, all spawn helpers, `isSpawnClear()`, `checkCollision()` | `systems/Spawner.ts` | Object lifecycle in one place |
| Keyboard setup, touch handlers, trick button UI, input priority resolution | `systems/Input.ts` | Reusable across scenes |
| Penguin state, scoring, UI, collision handling, scene lifecycle | RunScene (stays) | Thin orchestrator wiring systems together |

### What stayed in RunScene

- Penguin sprite + shadow + airborne animation
- Score, combo, trickScore, distanceTraveled, scrollSpeed state
- Status effects (slipperyTimer, slowTimer)
- All UI text elements
- `handleAirTricks()`, `land()`, `launch()`, `handleCollision()`, `endGame()`
- `showTrickText()`, `showStatusText()` UI tween helpers

### Verification

- `npm run build` passes (tsc + vite)
- Gameplay identical: steering, tricks, collisions, scoring, game over, restart
- Touch controls work: left/right steering, FLIP/TUCK buttons, multi-touch
- Keyboard controls work: arrows/WASD for steering + tricks, R for restart
- No circular imports between modules

---

## Phase 3: Game feel (implemented)

Visual polish that makes the game feel satisfying. Placeholder shapes start to feel like a real game even before sprite art.

### Particles (implemented)

| Event | Effect | Status |
|-------|--------|--------|
| Penguin moving on ground | Snow spray particles behind penguin, angled by steer direction | Done |
| Clean trick landing | Gold particle burst at penguin feet | Done |
| Crash landing | Red particle burst + penguin bounces | Done |
| Fish collected | Small yellow sparkle at fish position | Done |
| Rock/crevasse death | Large gray burst | Done |
| Ice patch entered | Cyan sparkle trail while on ice | Done |
| Snowdrift entered | White puff at contact point | Done |

All particle textures generated in RunScene.preload() (no external assets). All emitters use `emitting: false` + manual `emitParticle()` to avoid Phaser bugs with `setFrequency`/`particleAngle`.

### Screen effects (partial)

| Event | Effect | Status |
|-------|--------|--------|
| Rock/crevasse death | Strong camera shake | Done (existed) |
| Tree hit | Quick shake | Done (existed) |
| Landing | Camera bump (scrollY tween, 80ms yoyo) | Done |
| Crash landing | Penguin bounce (y tween, 100ms yoyo) | Done |
| Near-miss | Slow-mo + flash | Cut (triggered unreliably) |
| High speed (> 400) | Speed lines | Deferred |
| Combo x3+ | Screen border glow | Deferred |

### Snowfall background — cut

Tried two approaches (Phaser particle emitter with screen-fixed scrollFactor, and world-space circle objects scrolling at camera speed). Neither produced convincing snowfall. Cut for now.

### Trail (implemented)

- Penguin leaves fading belly-slide trail on the slope
- Single-width rectangles in world-space, scroll with obstacles, fade over 2.5s
- When airborne, trail stops
- Max 200 segments for performance

### Verification

- All event particles fire correctly
- Camera bump on every landing, penguin bounce on crash
- Ice sparkle activates on ice patch, stops when timer expires
- Ski trail renders behind penguin on ground
- No FPS drop on desktop

---

## Phase 4: Menus and persistence

A complete game loop: start screen, gameplay, results, back to start. High score saved locally.

### New scenes

**MenuScene** (`src/engine/scenes/MenuScene.ts`)
- Game title "PENGUINSKI" in large text
- "TAP TO START" / "PRESS ENTER" prompt, pulsing animation
- High score display below title
- Snowfall particles (reuse from RunScene)
- Simple penguin animation (idle bobbing)
- Settings button (gear icon or "SETTINGS" text)

**ResultsScene** (`src/engine/scenes/ResultsScene.ts`)
- Score breakdown:
  - Distance traveled
  - Fish collected (count * 10)
  - Trick points earned
  - Best combo multiplier achieved
  - Total score
- "NEW HIGH SCORE!" flash if applicable
- "TAP TO CONTINUE" returns to menu
- "PLAY AGAIN" shortcut (tap twice quickly or press R)

**SettingsScene** (`src/engine/scenes/SettingsScene.ts`) (or overlay on MenuScene)
- SFX on/off
- Music on/off
- Vibration on/off (for Capacitor later)
- Back button

### Persistence (localStorage)

```typescript
interface GameData {
  highScore: number;
  highDistance: number;
  totalRuns: number;
  settings: {
    sfx: boolean;
    music: boolean;
    vibration: boolean;
  };
}
```

- Save on game over
- Load on boot
- Use `platform/web/storage.ts` so Capacitor can swap to its own storage later

### Scene flow

```
BootScene -> MenuScene -> RunScene -> ResultsScene -> MenuScene
                ^                                        |
                |________________________________________|
```

### Run data tracking

RunScene needs to track additional stats during gameplay to show on results:
- Fish count (not just score)
- Total trick points
- Best combo reached
- Cause of death ("hit a rock" / "fell in crevasse")

### Verification

- Full loop: menu -> play -> die -> results -> menu -> play again
- High score persists across browser refreshes
- Settings persist and are respected
- All stats shown on results screen match gameplay

---

## Phase 5: Art and audio

Replace colored shapes with sprites and add sound. Transforms the look and feel.

### Sprites

| Object | Sprite description | Size |
|--------|--------------------|------|
| Penguin (ground) | Top-down belly-slide penguin with beanie, wings tucked (frame 0 of `penguin-sheet.png`) | 46x46 | Done |
| Penguin (air) | Wings open pose (frame 1), rotates with L/R spin only | 46x46 | Done |
| Rock | Snow-covered rocks, 4 variants (frames 0-3 of `rock-sheet.png`, 2.8x scale) | 38x30 @ 2.8x | Done |
| Tree | Snow-covered trees, 4 variants (frames 0-3 of `tree-sheet.png`, 2.2x scale) | 44x48 @ 2.2x | Done |
| Ramp | Procedural snow wedge (trapezoid with shadow, slope lines, lip highlight, generated at runtime, 1.6x scale) | 60x32 @ 1.6x | Done |
| Fish | Procedural gold fish (ellipse body, triangle tail, eye) | 16x16 @ 1.4x | Done |
| Ice patch | Irregular polygon (8-12 vertices), translucent cyan | 70-130 x 25-45 | Done (procedural) |
| ~~Crevasse~~ | ~~Removed~~ | — |
| Mogul | Procedural shape (kept as-is) | 28x16 | Done (procedural) |
| Snowdrift | Procedural shape (kept as-is) | 44x18 | Done (procedural) |

Moguls, snowdrifts, ice patches, and fish use procedural shapes — good enough for now.

### Sound effects (done)

All SFX synthesised at runtime via Web Audio API — no audio files. System lives in `src/engine/systems/SFX.ts`.

| Event | Synthesis | Status |
|-------|-----------|--------|
| Fish collect | Sine E6 + B6 twinkle (ding) | Done |
| Clean landing | Ascending B5→E6 chime | Done |
| Crash landing | Sine A2 thud + lowpass noise | Done |
| Sloppy landing | Sine D4, gentle | Done |
| Rock hit | Deep sine E2 + noise 600 Hz | Done |
| Tree hit | Sine A3 + bandpass noise, intensity scales with centeredness | Done |
| Ramp launch | Bandpass noise sweep 400→2000 Hz (whoosh) | Done |
| Mogul launch | Sine 600→200 Hz pitch bend (boing) | Done |
| Ice patch entry | 3 detuned sines B5/D#6/F#6 (shimmer) | Done |
| Snowdrift hit | Lowpass noise 300 Hz (poof) | Done |
| Trick performed | Bandpass noise 1000 Hz (whoosh) | Done |
| Fling/knockback | Deep sine E2 + noise 800 Hz | Done |
| Game over | Deep sine B1 + sub F#1 + noise | Done |
| Penguin ground slide | — | Not yet (looping) |
| Steer carve | — | Not yet (looping) |
| Near-miss | — | Not yet |
| Combo milestone | — | Not yet |

### Music (done)

Implemented with Strudel (`@strudel/web`) — procedural layered music that evolves with distance. 15 levels (0-14) of progressive arrangement in B minor. Starts with a Bmin9 triangle chord pad, builds through sawtooth bass, drums (bd, hh, sd), TR-909 ghost snares, saw leads with `arrange()` cycling (lead1a→1b→1c), bass progressions, to full solo at 1500m. BASE_BPM 140, per-difficulty: Easy 110, Medium 124, Hard 140. See `src/core/music.ts` for pattern definitions.

### AudioContext architecture

Single AudioContext shared between Phaser, Strudel, and SFX. Created in BootScene on first user gesture, injected into all three systems. SFX routes through its own master gain node connected to ctx.destination.

### Verification

- Penguin, trees, rocks have sprite sheets; remaining obstacles use procedural shapes (good enough for now)
- All 13 one-shot sound events fire at correct trigger points
- Music toggle on boot screen controls both music and SFX
- No audio files — all SFX procedurally synthesised
- Sprite rendering doesn't impact FPS

---

## Phase 6: PWA (completed -- pulled forward)

PWA and mobile optimization were implemented early alongside Phase 1.

### What was done

- `vite-plugin-pwa` configured in `vite.config.ts` with inline manifest (no separate `manifest.json`)
- Service worker auto-registers with `registerType: "autoUpdate"`, workbox precaches all assets
- Placeholder icons at `public/assets/icons/icon-192.png` and `icon-512.png` (solid ice blue, replaced in Phase 5)
- Mobile meta tags in `index.html`: theme-color, apple-mobile-web-app-capable, viewport-fit=cover, disabled user scaling
- Phaser game config updated: `fullscreenTarget: "game-container"`, `activePointers: 2`
- `vite-plugin-pwa/client` types added to `tsconfig.json`
- Portrait orientation locked via PWA manifest (`orientation: "portrait"`) + Screen Orientation API
- Touch controls: LEFT/RIGHT steer buttons + FLIP/TUCK trick buttons in a single bottom row, half-screen steering as fallback
- Input priority: keyboard > touch

> **Note:** Tilt/gyroscope steering was implemented initially but later removed in favor of
> simpler touch controls with on-screen trick buttons.

### Remaining for later

- Replace placeholder icons with real penguin art (Phase 5)
- Fullscreen button in menu (Phase 4)

---

## Phase 7: Capacitor wrap

Bundle into a native Android app. The appenguin showcase.

### Setup

- Initialize Capacitor in the project: `npx cap init`
- Add Android platform: `npx cap add android`
- Configure `capacitor.config.ts`: app name, app ID, webDir pointing to `dist/`
- CLI-only Android SDK (no Android Studio required, matching cqc-android approach)

### Platform adapters

`src/platform/capacitor/`
- **Storage**: Capacitor Preferences API instead of localStorage
- **Haptics**: vibrate on rock collision, light tap on fish collect, medium on trick land
- **Share**: share score to social media (results screen button)
- **StatusBar**: hide status bar for fullscreen
- **SplashScreen**: show during boot, auto-hide when game ready

### Build

- `npm run build` to produce dist/
- `npx cap sync` to copy web assets to native project
- `npx cap build android` for APK/AAB
- Release signing with keystore (same approach as cqc-android)

### App icon and splash

- App icon: penguin on ice blue background, round/square adaptive icon
- Splash screen: centered penguin logo on ice blue gradient
- Generate all sizes with `@capacitor/assets`

### Testing

- Build APK, install on real Android device
- Verify haptics fire on correct events
- Verify offline play works (no network at all)
- Verify back button behavior (exit app, not navigate back)
- Test on mid-tier device for FPS

### Verification

- APK builds without errors
- App installs and runs on Android device
- Haptics respond to game events
- No network dependency
- App icon and splash screen render correctly
- Playable at stable FPS on mid-tier Android

---

## Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Game framework | Phaser 3 | Mature, good mobile perf, rich feature set for polish |
| Bundler | Vite | Fast dev, good TS support |
| Art style (MVP) | Sprite sheets for penguin + trees, colored shapes for other obstacles | Penguin: 2-frame sheet (46x46). Trees: 4-variant sheet (44x48, 2.2x scale). Others still placeholder shapes |
| Game style | Ski or Die downhill + tricks | More depth than pure drift runner, iconic reference |
| Scrolling | Top-down, penguin at screen center, camera follows | Infinite horizontal freedom, classic downhill feel |
| Trick system | Space/Enter for Flip trick, left/right for spin | Single trick per jump; Up/Down freed for wing speed control |
| Difficulty | Distance-based zones | Gradual learning curve, gets hard after 1500m |
| Refactor before features | Yes, done | 814-line RunScene split into 4 modules: core/tricks, core/difficulty, systems/Input, systems/Spawner. RunScene now ~430 lines |
| PWA early | Yes | Installability and offline support are cheap to add now with vite-plugin-pwa; touch controls need testing on real devices early |
| Steering model | Angle-based with momentum + cos speed cost | Carving turns with momentum; slalom costs forward speed via cos(heading) |
| Touch controls | 4-button row: `[<] [▼TUCK] [★TRICK] [>]` + half-screen fallback | Steer buttons + TUCK (hold, ground+air) + TRICK (tap, air only) |
| Speed model | Force-based: gravity vs friction vs wing drag | Replaces distance curve; speed rises/falls dynamically; player has speed agency |
| Tree collision | Acceleration-based, centeredness-scaled, persistent | Trees don't disappear; center hit = near stop; continuous snow burst while overlapping |
| Camera | Centered on penguin, world scrolls | Infinite horizontal movement, no screen-edge clamping |
| Difficulty levels | Easy/Medium/Hard speed profiles | Player choice at start; obstacle zones still distance-based |
| HUD | Semi-transparent top bar | Labeled score, distance (m/km), speed (km/h), level -- always visible, non-intrusive |
| Orientation | Portrait locked | Screen Orientation API + PWA manifest |
| Music engine | Strudel (@strudel/web) | Procedural layered music, no static audio files needed, patterns easy to edit |
| Music progression | 15 distance-based levels (0-14) | Chord pad → bass → drums one-by-one → ghost → leads via arrange() → bass progressions → solo at 1500m |
| Music architecture | core/music.ts + engine/systems/Music.ts | Pattern definitions separated from playback engine; edit music.ts to change the music |
| Icy Jump combo | Ice → ramp = +50% air, 2× trick score | Rewards chaining ice patches with ramps; only ramps (not moguls) trigger it |
| Ice pond shape | Irregular polygon (8-12 vertices) | Random wobble around elliptical path; unique shape per spawn; same AABB hitbox |
| Mobile pause | Tap HUD bar to toggle pause | No dedicated button needed; bar is already interactive real estate |
| High score storage | localStorage, per-difficulty, minimal schema | Just score + distance per level; no total runs, fish count, or settings bloat; easy to extend later |
| Storm particles | Manual circle GameObjects, not Phaser emitters | Phaser particle emitters don't respect `setScrollFactor(0)` — particles still render in world space; manual objects with `setScrollFactor(0)` work correctly |
| Storm wind | Two layered sine waves (0.7 + 1.9 freq) | Organic gusts without randomness or noise; smooth, predictable, tuneable |
| Rock collision | Fling + respawn, 3 lives | Rocks no longer instant-kill; penguin flung off-screen, respawns with invincibility; final death only on last life |
| Fling camera | Freeze during fling | Camera stops tracking penguin during tween so fling reads visually; resumes on respawn |

---

## Dev log

### 2026-01-30: Project kickoff

Set up project skeleton. Researched game libs, decided to stay with Phaser 3 for its polish features (particles, camera, audio, scene management). Pivoted game concept from "hold to drift" runner to Ski or Die-style downhill with ramps and trick scoring.

Built phase 1a: playable downhill prototype. Penguin at top of screen, obstacles scroll upward (SkiFree-style perspective). Steering, rocks, trees, ramps, fish, airborne trick system with variety bonus, combo multiplier, game over + restart. All placeholder art (colored shapes).

Built phase 1b: added ice patches, crevasses, moguls, snowdrifts, fish clusters. 4 difficulty zones by distance with weighted spawn tables. Spawn spacing enforcement. Speed cap at 500. Status effects (icy steering, slow speed) with UI indicators.

Planned phases 2-7: refactor (extract modules from 720-line RunScene), game feel (particles, trails, near-miss, snowfall), menus + persistence (full game loop with high scores), art + audio (sprites, SFX, music), PWA (offline, installable), Capacitor (Android app with haptics).

Pulled PWA forward: added vite-plugin-pwa with inline manifest, service worker, mobile meta tags. The game is installable to home screen and playable offline before any art polish.

Controls overhaul: removed tilt/gyroscope steering in favor of simpler touch controls. Touch steering now uses left/right halves of the screen instead of thirds. Added on-screen FLIP and TUCK buttons at the bottom for performing Backflip and Front Tuck tricks while airborne. Multi-touch pointer-ID tracking lets one finger steer while another taps tricks. Portrait orientation locked via Screen Orientation API + PWA manifest. Input priority simplified to keyboard > touch.

### 2026-01-30: Angle-based steering

Replaced lateral strafe steering with Ski or Die-style angle steering. Left/right input now rotates the penguin's heading angle with momentum (angular velocity, acceleration, drag). Heading naturally returns to center when released (simulates gravity pulling straight downhill). Lateral movement comes from `sin(heading) * scrollSpeed`. Penguin sprite visually rotates to show heading. Max angle capped at ±40°. Counter-steering (pressing opposite to current heading) gets 2x acceleration for snappy corrections. Ice patches reduce turn acceleration to 35% and halve drag, making steering sluggish and drifty. While airborne, heading is frozen and the penguin drifts passively from launch angle.

Added on-screen LEFT/RIGHT steer buttons for mobile. All 4 buttons now sit in a single bottom row: `[<] [FLIP] [TUCK] [>]` with taller hit targets (64px). Touch steering above the button zone is relative to the penguin's x position (tap right of penguin = steer right, works with swipe via pointermove tracking).

### 2026-01-30: Phase 2 refactor

Broke the 814-line RunScene into focused modules. Created `core/tricks.ts` (Trick type, constants, scoring helpers) and `core/difficulty.ts` (difficulty zones, speed curve, spawn weight tables) as pure logic with no Phaser dependency. Created `engine/systems/Input.ts` (keyboard, touch, trick buttons, input priority resolution) and `engine/systems/Spawner.ts` (SlopeObject, all spawn helpers, collision checking, object lifecycle) as Phaser-dependent systems. RunScene slimmed to ~430 lines as a thin orchestrator: owns penguin state, scoring, UI, and wires the systems together. Build passes, gameplay behavior identical.

### 2026-01-30: Penguin sprite, air controls, visual polish

Replaced the placeholder blue rectangle with a real penguin sprite (`public/penguin.png`): a top-down belly-sliding penguin wearing a red beanie, 48x64px with transparent background. RunScene now preloads the image and uses `Phaser.GameObjects.Image` instead of `Rectangle`. Icy state uses `setTint()` instead of `setFillStyle()`, crash uses red tint.

Reworked air controls: Left/Right Spin tricks removed from the trick queue system. Left/right arrows now add continuous visual spin while airborne (not scored). Up/down arrows remain as queued tricks (Backflip/Front Tuck). Heading rotation is preserved throughout the jump — tricks and spin layer on top of it. Added `getSpinDir()` to Input system.

Increased lateral movement factor from 0.8 to 1.6 so sideways movement is more pronounced relative to the visual tilt. Moved penguin shadow to same Y as penguin (was offset below). Background is now a procedurally generated snow texture (128×128 TileSprite with subtle speckled variations, scrolls with the world at depth -10).

### 2026-01-30: Centered camera + difficulty selection + HUD

Switched from clamping the penguin to screen edges to a camera-follows-penguin model. The penguin stays fixed at screen center; the world scrolls horizontally via Phaser's `camera.scrollX = penguin.x - width/2`. Obstacles now spawn in world-space coordinates relative to the penguin's position, and off-screen objects are culled horizontally. All UI (buttons, HUD, game over text) uses `setScrollFactor(0)` to stay pinned to the screen. Touch steering simplified since the penguin is always at screen center.

Added a difficulty selection screen to BootScene: three buttons (Easy, Medium, Hard) with color-coded backgrounds. Each level maps to a speed profile in `core/difficulty.ts` controlling start speed, acceleration rate, and speed cap. The selected level is passed to RunScene via scene data and preserved on restart. Obstacle spawn difficulty (distance-based zones 0-3) remains independent of the player-selected level.

Added a top bar HUD: a semi-transparent dark bar (36px tall, 0.45 alpha) at the top of the screen showing score, distance in meters, current speed, and the difficulty level name. All HUD elements are screen-pinned with `setScrollFactor(0)`. RunScene is now ~490 lines.

### 2026-01-30: Procedural music with Strudel

Added progressive procedural music using Strudel (`@strudel/web`). Multi-level arrangement driven by distance (meters), reaching full solo at 1500m. Each level is a complete mix — instruments enter one at a time (bass → kick → hh → snare → ghost → leads → bass progressions → solo melody). Sawtooth oscillators for bass and leads, drum samples (bd, hh, sd) from dirt-samples. Level changes quantised to 4-bar boundaries for musical coherence.

Architecture follows the existing core/engine split: `core/music.ts` holds all pattern definitions, level thresholds, and the `getPatternForLevel()` switch statement — edit this one file to change the music. `engine/systems/Music.ts` is a singleton that manages Strudel initialization, distance-to-level mapping, and game event hooks (game over, restart). The singleton persists across scenes so the intro music on the boot screen flows seamlessly into gameplay.

AudioContext is created synchronously inside a native DOM gesture handler (`pointerdown`/`keydown`) and injected into superdough via `setAudioContext()` before `initStrudel()` runs — this bypasses Strudel's built-in `initAudioOnFirstClick()` which only listens for `mousedown`. Phaser audio shares the same AudioContext (injected via `setAudioContext()`). On init, the full arrangement plays silently to preload all samples. Key: B minor. Tempo per difficulty: Easy 110, Medium 124, Hard 140 BPM (fixed throughout game).

### 2026-01-31: Event particles and screen effects (Phase 3)

Added event particle bursts for all collision and landing events. Seven particle textures generated procedurally in RunScene.preload() using a single Graphics instance and a loop. Six new burst emitters in Effects.ts (gold, red, yellow, gray, cyan, white) — all use `emitting: false` with manual `emitParticle()` calls to avoid Phaser emitter bugs.

Gold burst on clean trick landing, red burst + penguin bounce on crash landing. Yellow sparkle when collecting fish. Gray burst on rock/crevasse death. White puff on snowdrift contact. Cyan sparkle trail while sliding on ice (toggles on/off with slipperyTimer). Camera bump (scrollY tween, 80ms yoyo) fires on every landing.

Tried and cut: near-miss slow-mo (distance-based detection triggered unreliably — too sensitive or too rare depending on threshold, and the slow-mo felt disruptive). Tried and cut: snowfall background (tested Phaser particle emitter with screen-fixed scrollFactor, then world-space circle objects scrolling at camera speed — neither produced convincing falling snow against the scrolling world). Speed lines and combo border glow deferred to later.

### 2026-01-31: Game feel tuning + Doom-style menus

**Ice steering rework:** Ice patches no longer disable steering entirely. Instead, turn acceleration is reduced to 8% and max turn speed to 15%, with low drag and slow centering. The penguin feels sluggish and drifty on ice rather than frozen.

**Landing system:** Three tiers instead of binary pass/fail. Clean landing (< 0.5 rad off) gets full points with combo multiplier. Sloppy landing (0.5–1.2 rad) scores nothing but doesn't reset combo. Crash (> 1.2 rad) scores nothing and resets combo.

**Trick timing:** Replaced lerp-based trick rotation with constant-speed rotation. Each trick (backflip/tuck) takes exactly 0.8s. If it hasn't finished by landing, you crash. Spin points doubled to 100 per half rotation.

**Landing particles:** Switched from gold/red particles to snow-particle texture (same as spray), so landings look consistent with the ground effects.

**Doom-style menu system:** All menus (boot screen, pause, game over) now use unified keyboard-navigable menus. Arrow keys or W/S move a ▶ cursor, Enter/Space selects, ESC toggles pause or acts as back. Menus wrap around. Touch/click/hover also supported. Boot screen defaults to Medium difficulty, music toggle is part of the menu. Game over menu appears after a 600ms death animation delay.

### 2026-01-31: Penguin sprite sheet

Replaced the static `penguin.png` with a 2-frame sprite sheet (`penguin-sheet.png`, 46x46 per frame). Frame 0 is the tucked pose (wings against body) used while sliding on the ground and while holding a trick key. Frame 1 is the open wings pose used while airborne and on death. Source images live in `penguin_images/` and are processed by `scripts/build-sprites.py` which handles background removal, consistent scaling, and strip assembly.

Penguin type changed from `Phaser.GameObjects.Image` to `Phaser.GameObjects.Sprite`. Effects constructor widened to `{ x: number; y: number }` since it only reads position at init.

**Trick system rework:** Tricks (Backflip, Front Tuck) no longer rotate the penguin — rotation set to 0. Only L/R spin rotates. Tricks are hold-to-perform: holding the trick key shows the tucked sprite frame, releasing returns to open wings. Spin is always allowed (not blocked by tricks).

### 2026-01-31: Steering physics — slalom speed cost

Added `cos(heading)` factor to downhill speed. When the penguin carves at an angle, forward speed (distance, score, obstacle scroll) is reduced — at max ±45° steering, forward speed drops to ~71%. Lateral movement uses the full speed so steering responsiveness isn't affected. This makes slalom a meaningful tradeoff: safer obstacle avoidance at the cost of forward momentum.

Tuned steering constants: turn accel 5.0, max turn speed 2.5, drag 4.0, centering 2.5, lateral factor 1.2. Snappy turn initiation with strong bleed-off — turns start quickly but don't sustain without continued input.

### 2026-01-31: Mobile menu touch fix

Fixed pause/game-over menus not responding to touch on mobile. The issue was that menu items inside a Phaser `Container` with `setScrollFactor(0)` don't get correct hit testing when the camera has scrolled — Phaser checks world coordinates but the container renders at screen coordinates. Fix: set `setScrollFactor(0)` on each element individually instead of on the container. Also enlarged all menu touch targets with 16px hit area padding in both BootScene and RunScene.

### 2026-02-01: Force-based physics and wing drag speed control

Replaced the distance-based speed curve (`getBaseSpeed()`) with a force integration model. Each frame: `accel = gravity(120) - friction(speed * coeff) - wingDrag`. Wing drag is controlled by player input: tuck (Down/S) = 0 drag (fastest), neutral = 10 drag, spread (Up/W) = 60 drag (heavy braking). Speed can now decrease when braking — previously it only went up. Ice patches use friction coeff 0.03 (near-zero friction = rapid acceleration). Snowdrifts add +0.25 friction instead of a flat 50% speed multiplier, which feels more physical.

Tricks consolidated from two (Backflip 300pts, Front Tuck 250pts) to one (Flip 300pts) triggered by Space/Enter or the TRICK touch button. Up/Down freed for wing control at all times. Touch buttons changed from `[< FLIP TUCK >]` to `[< ▼TUCK ★TRICK >]`. TUCK is a held button (works ground + air), TRICK is a one-shot tap (air only).

Sprite frames reworked: ground neutral = frame 0 (tucked), ground spread/brake = frame 1 (open wings), air default = frame 1, air tuck = frame 0. Removed `baseScrollSpeed` and `slowTimer` fields from RunScene.

Exported `SPEED_PROFILES` from `core/difficulty.ts` so RunScene can access start speed and cap directly.

### 2026-02-01: Snow-covered tree sprites and collision rework

First real obstacle art. Four snow-covered tree variants generated from `penguin_images/trees.png` (2x2 grid). Extended `build-sprites.py` with `build_tree_sheet()` that splits the grid into quadrants, removes light backgrounds, scales to 48px target height, and composes a horizontal strip at `public/tree-sheet.png` (4 frames @ 44x48). Each tree spawns with a random variant at 2.2x scale.

**SlopeObject type widening:** Changed `sprite` field from `Phaser.GameObjects.Shape` to `Shape | Sprite` union. Both types share `x`, `y`, `setDepth()`, `destroy()`, `setAlpha()` — all call sites compatible without changes.

**Collision rework — persistence:** Obstacles no longer vanish when hit. Added `hit` flag to `SlopeObject`; collision loop skips flagged objects. Only fish use `removeObject()` (they're collected). Everything else stays on screen via `markHit()`.

**Collision rework — tree slowdown:** Replaced flat `speed *= 0.7` with acceleration-based decel scaled by hit centeredness. Measures horizontal distance from penguin center to tree center, normalized against combined widths. Grazing hit = -30 speed (barely noticeable), dead center = -300 (near full stop from most speeds). Subtle camera shake on initial hit (150ms, 0.005 intensity).

**Continuous effects while overlapping:** The collision loop now checks hit trees for ongoing overlap. While the penguin is inside a tree: white snow particles burst each frame from both the tree position and under the penguin (30 total: 20 from tree + 10 from penguin). The tree sprite is destroyed and recreated each frame with ±3px random offset from its stored `originX`/`originY`, producing a visible shake. The redraw also fixes depth ordering — newly created tree sprites render above older trail marks.

**Ski trail pauses inside trees:** Added `inTree` flag computed before effects update. When true, trail creation is skipped (same path as airborne check). This avoids the depth-ordering problem where continuously-created trail rectangles rendered above trees despite lower depth values. The origin position scrolls with the world (`originY -= scrollDy` in the spawner update loop) so the shake stays centered as the tree moves up the screen.

**Spawn rates:** Tree percentages roughly doubled across all difficulty zones: 40% easy (was 20%), 35% medium (was 18%), 30% hard (was 15%), 25% expert (was 12%). Trees are now the most common obstacle.

### 2026-02-01: Music and boot screen fixes

Silenced the intro music layer (level 0) and the death pattern. The intro pad sounded harsh and the death buzzer was grating. Both now return `silence` from Strudel. First audible layer kicks in when score triggers level 1.

Fixed the boot screen music toggle label: was showing an empty string on initial render because the text was set to `""` and only updated on toggle. Now initializes with `"MUSIC: ON"` or `"MUSIC: OFF"` based on the muted state.

### 2026-02-02: HUD bar pause, ice pond shapes, icy jump combo

**HUD bar as pause button:** The top HUD bar is now interactive on mobile — tapping it toggles pause. Removed the need for a dedicated pause button. The rectangle gets `.setInteractive()` and a `pointerdown` handler calling `togglePause()`.

**Ice pond shapes:** Replaced flat rectangle ice patches with irregular polygons. Each pond generates 8-12 random vertices around an elliptical path with wobble (70-130% of radius per vertex), creating unique natural-looking frozen puddle shapes. Sizes increased and varied (70-130px wide, 25-45px tall). Uses `Phaser.GameObjects.Polygon` (extends `Shape`, fits existing type). Collision hitbox stays AABB-based.

**Icy Jump combo:** Hitting a ramp while slippery (slipperyTimer > 0) triggers an "ICY JUMP!" — 50% bonus air time and a 2× multiplier on trick score at clean landing. Shows "ICY COMBO +{points}" in cyan on landing. Only full ramps trigger it (not mogul bounces). The combo chain: ice → ramp → tricks → clean landing = big bonus. Makes ice patches worth seeking out before ramps. Added `icyLaunch` boolean flag to RunScene, set in `launch()`, applied in `land()`, reset after landing.

### 2026-02-02: Rock sprites and procedural ramp

**Rock sprites:** Replaced gray placeholder rectangles with snow-covered rock sprites. Four variants from `penguin_images/rocks.png` (2x2 grid), processed by the same build pipeline as trees. Added `build_rock_sheet()` to `build-sprites.py`. Rocks spawn at 2.8x scale, depth 7, random variant per spawn, hitbox 50x40.

**Procedural ramp:** Replaced the blue triangle ramp with a procedurally generated snow wedge texture. Drawn at runtime using Phaser Graphics in `preload()`: trapezoid body (wide at top, tapering to launch lip at bottom), subtle shadow, slope surface lines, bright lip highlight, and outline. Generated as `"ramp-tex"` (60x32), rendered at 1.6x scale, depth 6. Tried using a source image (`penguin_images/ramp.png`) first but the dark-background-removal didn't produce clean enough results — procedural looks better and matches the game's visual style.

**SlopeObject type:** Widened sprite field to `Shape | Sprite | Image` to support `add.image()` for ramps.

**Fish sprites:** Replaced yellow circles with procedural fish texture — gold ellipse body, triangle tail, belly highlight, dark eye. Generated at runtime in `preload()`, rendered at 1.4x scale.

**Crevasses removed:** Removed crevasses entirely. Rocks are now the only lethal obstacle. Crevasse spawn weight redistributed to rocks across all difficulty zones. Removed `spawnCrevasse()`, crevasse collision handling, `endGameCrevasse()` fall animation, and `"crevasse"` from `SlopeObjectType`.

### 2026-02-02: High score persistence

Added per-difficulty high score persistence using localStorage. Three files involved:

**`core/storage.ts`** (new): Pure functions with no Phaser dependency. `saveScore(level, score, distance)` writes to localStorage under `"icedrift:scores"` only if the score beats the existing record, returns `true` if it's a new best. `getBest(level)` retrieves the best run for a difficulty, or null. Data is a simple JSON object keyed by difficulty level (0/1/2), each with `score` and `distance` (meters).

**RunScene:** On game over, calls `saveScore()` with the current level, score, and distance. If it returns true, the game over screen shows "NEW BEST!" above the score line. Otherwise the game over screen looks the same as before.

**BootScene:** Displays "BEST: {score} · {distance}" below the music toggle for the currently selected difficulty. The text updates when the cursor moves between Easy/Medium/Hard. Shows nothing if no high score exists for that level yet.

### 2026-02-02: Snowstorm at 1500m

Added a blizzard that kicks in at 1500m, coinciding with the music solo (level 15). Dense windswept snow flies across the screen, wind pushes the penguin and obstacles sideways, and a white overlay reduces visibility. The storm ramps up gradually over 100m after the threshold.

**Why not Phaser particle emitters?** We tried three approaches: (1) emitter with `setScrollFactor(0)` — particles still rendered in world space, invisible as the camera scrolled. (2) World-space emitter repositioned each frame relative to the camera — particles appeared but didn't feel screen-fixed, they drifted with the world. (3) Manual `GameObjects.Arc` circles with `setScrollFactor(0)` — this worked. Each snowflake is a simple circle managed in an array, moved each frame, and wrapped around screen edges. Phaser's `setScrollFactor` works on individual GameObjects but not on particles emitted by an emitter.

**Wind model:** Two sine waves at different frequencies (0.7 and 1.9 rad/s) produce organic gusts without randomness. Wind direction shifts smoothly left↔right. Max lateral push is 160 px/s at full intensity (5× when airborne — the penguin gets thrown sideways mid-jump), multiplied by 5× for the snowflake visual speed. Wind affects three things: penguin lateral position, obstacle drift in the spawner, and snowflake movement direction. Jumps during the storm last 30% longer (stacks with icy launch).

**Snowflake population:** 500 max, spawned in batches of 12. Half are "fast" (1.8-2.2× speed, smaller, fainter) and half are "slow" (normal speed, larger, more opaque). This creates a sense of depth — foreground snow streaks past while background snow drifts. Each flake's horizontal velocity gradually steers toward the current wind direction (`vx += (target - vx) * 2 * dt`), so direction changes feel smooth.

**Visibility overlay:** A full-screen white rectangle at depth 9 with `setScrollFactor(0)`. Alpha ramps from 0 to 0.15 with storm intensity. Subtle but enough to make the world look hazier.

**Storm trigger in RunScene:** Distance in meters is computed once per frame (also reused for UI and music). When it crosses 1500m, `effects.startStorm()` is called. Each frame after that, intensity is `min(1, (meters - 1500) / 100)`. Wind lateral force is read from Effects and applied to both penguin position and the spawner's obstacle scroll loop.

**Cheat codes:** +/= teleports forward 100m, -/_ teleports back 100m. Zeroes score to prevent cheated high scores. White camera flash + purple "CHEAT ±100m" status text. Music and storm advance naturally since they read distance each frame.

### 2026-02-03: Lives system and rock fling

Rocks no longer instant-kill. The penguin now has 3 lives, displayed as 🐧 emojis in the HUD bar.

**Fling animation:** On rock hit, the penguin is flung away from the rock — direction computed from the vector between penguin and rock centers. The tween flies the penguin 500px in that direction, spins 16π (8 full rotations), shrinks to 0.3× scale, and fades to zero alpha over 1 second. The camera freezes during the fling so the animation reads properly against the static background. Without the freeze, the camera tracked the penguin as it flew sideways, which looked wrong.

**Respawn:** After the fling tween completes, the penguin reappears at screen center with heading and rotation reset. Speed drops to the difficulty's start speed. A 2-second invincibility period starts with the penguin flashing (alternating 0.3/1.0 alpha every 100ms). Rock collisions are ignored during invincibility; tree collisions still apply.

**Steering lockout during fling:** The update loop's steering code sets `penguin.setRotation()` every frame, which was overriding the fling tween's rotation. Fixed by skipping the entire steering block when `invincible && isDead` (the fling phase). Once respawned, `isDead` is cleared and steering resumes.

**Bigger rocks:** Rock scale bumped from 2.8× to 3.5×, hitbox from 50×40 to 60×48. Rocks are now more visible and imposing.

**Final death:** When the last life is lost, the existing `endGame()` fires — same death spin, camera shake, game over menu, and score save as before.

### 2026-02-03: Music rework — chord intro, arrange(), preload fix

Reworked the music arrangement from 16 levels to 15 (0-14). Major changes:

**Chord pad intro:** New `chord` instrument — Bmin9 triangle wave (`b2,d3,f#3,a3,b3`, half speed, reverbed). Plays alone at level 1, then with bass at level 2, then bass takes over solo at level 3. Gives the opening a warmer, more atmospheric feel.

**Lead cycling with `arrange()`:** Instead of 3 separate music levels for lead1a/b/c, Strudel's `arrange()` function cycles them automatically: 4 cycles of lead1a (b4), 2 of lead1b (d5), 2 of lead1c (c#5). One level, three variations.

**Instrument tweaks:** Bass LPF narrowed (1000-3000 from 1000-5000), ghost snares now explicitly use `.bank("tr909")`, lead1a delay 0.2→0.3, lead3 melody reworked with ascending endings and delay effect, gain adjustments.

**Thresholds spread out:** Each instrument gets 70-140m of breathing room. Full progression: silence → chord → chord+bass → bass → +kick → +hh → +snare → bass2 → +ghost → +lead → bass change → bass3 → bass4 → +lead2 → solo at 1500m.

**BASE_BPM:** Changed from 130 to 140.

**Preload timing fix in Music.ts:** The sample preload plays the full arrangement silently for 500ms then calls `hush()`, but that was killing the real music that started via a deferred `play()` call. Fixed by storing the preload timer ID and clearing it when a deferred play is waiting, then hushing the silent preload immediately before starting the real pattern.
