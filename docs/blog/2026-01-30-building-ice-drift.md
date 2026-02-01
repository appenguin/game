# Building Ice Drift: a penguin game from scratch

*January 30, 2026*

We're building a game. A penguin slides downhill on ice, dodging rocks and trees, hitting ramps to launch into the air and pull off tricks. Collect fish, chain combos, survive as long as you can. Simple to learn, hard to master, impossible to stop.

The game is called **Ice Drift**, and it will live at [icedrift.appenguin.com](https://icedrift.appenguin.com).

## Why build a game?

Three reasons, in order of honesty:

**1. It's fun.** Our day-to-day work is scanners, dashboards, business logic. Important stuff. But sometimes you want to make a penguin slide into a rock at high speed and watch the screen shake. This is our fun edge -- vibe coding with no deadlines, no sprint boards, just building something because it makes us happy.

**2. Cool tech.** Phaser 3, Vite, TypeScript, Capacitor, PWA APIs -- building a game touches all of them in ways that a CRUD app never would. Games demand real-time rendering, tight input loops, asset pipelines, offline support. It's the best excuse to go deep on tools we've been wanting to play with.

**3. Appenguin showcase.** Ice Drift also doubles as a demo for [appenguin](https://appenguin.com), our service that turns websites into Android apps. What better proof that a web app can feel native than a game that runs smoothly on mobile, works offline, and wraps cleanly into an APK? If someone plays it without knowing any of this, they'd just think it's a fun game. That's the point.

## The plan

We're keeping it loose. Five phases:

1. **Playable prototype** -- core loop with placeholder art (colored shapes). Penguin slides downhill, steers, hits ramps, does tricks, collects fish, hits rocks, game over. No menus, no persistence. Just the feel. Done.

2. **PWA + mobile** -- pulled this forward. Service worker, manifest, offline play, touch controls with on-screen trick buttons. Install it to your home screen and play in portrait. Done.

3. **Game feel polish** -- ski trails, event particle bursts, camera effects, screen shake. This is where it goes from "tech demo" to "game." Done.

4. **Menus and persistence** -- Doom-style menus with keyboard + touch. Difficulty selection, pause, game over. Done. High score persistence still to come.

5. **Physics and controls rework** -- force-based speed model (gravity vs friction vs wing drag), wing spread/tuck for speed control, simplified tricks. Done.

6. **Sprite art** -- animated penguin sprite sheet, snow-covered tree sprites (4 variants), collision particle effects. In progress. Rocks, ice, and other obstacles still placeholder shapes.

7. **Procedural music** -- Strudel-powered 16-layer progressive soundtrack. Done.

8. **Capacitor wrap** -- bundle into an Android app with haptic feedback. The appenguin pipeline in action.

## Tech stack

- **Phaser 3** for the game engine
- **TypeScript** because we're not animals
- **Vite** for fast builds
- **Strudel** (`@strudel/web`) for procedural music
- **Capacitor** for the mobile wrap (later)

No backend. No accounts. No analytics. Everything runs locally. Just a penguin and the ice.

## Architecture choices

The codebase separates into three layers:

- **Core** -- pure game logic. Scoring, collision rules, track generation, RNG. No rendering, no platform APIs. Testable in isolation.

- **Engine** -- Phaser scenes and entities. This is where sprites move and particles fly. Depends on core for rules.

- **Platform** -- adapters for web vs Capacitor. Storage, haptics, share. Same interface, different implementations.

This means the game logic doesn't care whether it's running in a browser tab or inside an Android app. Swap the platform adapter and everything works.

## Already installable

We pulled PWA support forward. The game is installable to your home screen and works offline right now, before any art polish. Here's what that took:

- **vite-plugin-pwa** generates the manifest and service worker from vite config. No separate manifest.json or service-worker.ts to maintain. The service worker precaches all assets on first load -- after that, the game runs without any network.

- **Mobile meta tags** in index.html: theme-color, apple-mobile-web-app-capable, viewport-fit=cover, no user scaling. The game fills the screen edge to edge on mobile.

- **Touch controls.** Four buttons in a row at the bottom: **< ▼TUCK ★TRICK >**. The arrow buttons steer (rotating the penguin's heading with momentum, Ski or Die-style). TUCK is a hold button -- hold it to tuck wings (speed up on ground, tuck sprite in air). TRICK is a tap button for performing a flip while airborne. Tapping above the button row also steers -- left half steers left, right half steers right. Multi-touch means you can steer with one thumb and control speed/tricks with the other.

  We originally had tilt/gyroscope steering, then half-screen touch zones, then FLIP/TUCK trick buttons. The current layout reflects the physics rework -- wing control replaced directional tricks, so the buttons changed to match.

  Portrait orientation is locked via the PWA manifest and the Screen Orientation API.

Why do this early? Because an installable, offline-capable game with solid touch controls is already a better demo for appenguin than a desktop-only web page.

## Camera, difficulty, and HUD

A few more things landed before we move to game feel polish:

**Centered camera.** The penguin now stays fixed at screen center while the world scrolls around it via Phaser's `camera.scrollX`. This means no more clamping at screen edges -- the penguin can carve freely in any direction. Obstacles spawn in world-space relative to the penguin, and off-screen objects get culled. All UI is pinned to the screen with `setScrollFactor(0)`.

**Difficulty selection.** BootScene now shows three buttons -- Easy, Medium, Hard -- each with a different speed profile (start speed, acceleration, cap). Easy tops out at 350, Hard can hit 600. The distance-based obstacle zones (which control spawn density and types) are independent of this choice.

**Top bar HUD.** A semi-transparent dark bar at the top shows score, distance, speed, and difficulty level at a glance.

## First real sprite

The placeholder blue rectangle is gone. The penguin now has a proper sprite sheet -- two frames (tucked and wings-open), processed from generated images by a Python build script. Frame switching is instantaneous based on player input: tucked on ground by default, wings spread when braking. Icy state tints the sprite cyan.

We also cleaned up the air controls. Left and right arrows add continuous visual spin while airborne (hold to keep spinning, purely cosmetic). Tricks moved to Space/Enter. The penguin's heading rotation carries through the jump, with tricks and spin layering on top.

The background is now a procedurally generated snow texture -- a 128×128 TileSprite with subtle speckled variations in brightness that tiles seamlessly and scrolls with the world. Much better than the old flat color.

## Procedural music with Strudel

Games need music. We didn't want a static loop -- we wanted the music to grow with the player. Enter [Strudel](https://strudel.cc/), a live coding music system that runs entirely in the browser.

The music has 16 levels of arrangement that build as you travel further. At the start you hear silence. A few meters in, a driving sawtooth bass line kicks in. Then the kick drum. Hi-hats. Snare. Ghost snares. Leads shift between notes, the bass line evolves through progressions, and by 1500 meters the full solo melody is playing. Key: B minor, dark and driving.

The key design choice: **instruments enter one at a time.** Each level is a complete mix, not an additive layer -- so transitions sound clean. Level changes are quantised to 4-bar boundaries so the music never stutters mid-phrase. The early game builds quickly (full drum kit by 75m), then the leads and bass variations spread out over the longer run.

All pattern definitions live in one file (`src/core/music.ts`). Each level is a clearly commented `case` in a switch statement using Strudel's pattern language. Want to change the key from B minor to D minor? Edit one string. Want the snare to hit on different beats? Change the pattern. The musical content is completely separated from the playback engine.

The system is a singleton that persists across scenes, so the intro music on the boot screen flows seamlessly into gameplay. A toggle on the start screen lets you turn it off (persisted to localStorage for next time). Tempo scales with difficulty: Easy 110, Medium 124, Hard 140 BPM.

Technical detail: Strudel is installed via npm and bundled by Vite. Drum sounds (kick, hi-hat, snare) come from the dirt-samples library. Sawtooth oscillators handle bass and leads -- no sample files needed. AudioContext is created synchronously in a native DOM gesture handler and injected into superdough before Strudel initializes, bypassing a browser limitation where Strudel's built-in audio init only listens for mouse clicks. On init, the full arrangement plays silently to preload all samples.

## Game feel: particles and screen effects

Phase 3 is done. Every collision and landing now has visual feedback through particle bursts:

- **Snow burst** when you land from a jump (same blue-tinted particles as the spray)
- **Penguin bounce** when you crash a landing
- **Yellow sparkle** when collecting fish
- **Gray burst** on death (rock or crevasse)
- **White puff** when hitting a snowdrift
- **Cyan sparkle trail** while sliding on ice

Every landing triggers a **camera bump** -- a quick downward nudge that yoyos back. It's subtle but makes landings feel physical. Crash landings also bounce the penguin sprite.

All seven particle textures are generated procedurally in `preload()` -- no image files. Each emitter sits dormant (`emitting: false`) until a collision fires `emitParticle()` manually. This avoids a Phaser bug where `setFrequency` and `particleAngle` assignment silently kill emitters.

We tried and cut two features: **near-miss slow-mo** (distance-based rock detection triggered too erratically -- either too sensitive or too rare) and **snowfall background** (tested both screen-fixed particles and world-space circles scrolling at camera speed, neither looked convincing against the scrolling world). Sometimes cutting is the right call.

## Tuning the feel

A few things felt wrong after playtesting:

**Ice patches** originally disabled steering completely. That felt like a bug, not a game mechanic. Now ice reduces turn acceleration to 8% and max turn speed to 15% -- you *can* steer, but barely. The low drag means you keep sliding at whatever angle you entered. Much more "slippery", less "broken controller."

**Landings** were binary: clean or crash. Now there's a middle tier. Clean landing (rotation close to target) gets full points with combo. Sloppy landing (almost there) scores nothing but doesn't break your combo. Full crash resets combo entirely. This gives the player something to feel -- "I almost had it" instead of "I failed for no reason."

**Trick speed** used a lerp that asymptotically approached the target, making timing feel mushy. Replaced it with constant-speed rotation: each trick takes exactly 0.8 seconds. You know the timing, you can plan around it.

**Spin scoring** was 50 points per half-rotation, barely worth the risk. Doubled it to 100. Now spinning is a real scoring strategy, not just for show.

## Doom menus

Every menu in the game now works the same way: arrow keys move a cursor, Enter selects, ESC goes back. The boot screen, pause menu, and game over screen all share the same pattern. It's the Doom approach -- simple, consistent, works with keyboard and touch. The cursor wraps around, highlighted items get a ▶ prefix.

ESC pauses the game mid-run and shows Resume / New Game / Quit. ESC again resumes. After death, the game over menu offers Retry and Quit.

## Animated sprite sheet

The blue rectangle penguin is gone for good. We now have a proper sprite sheet: two frames, tucked and wings-open, generated from source images by a Python build script (`scripts/build-sprites.py`). The script handles background removal, scaling, cropping, and composing a horizontal strip that Phaser loads as a spritesheet.

Frame 0 is tucked (ground default, air tuck). Frame 1 is wings spread (braking on ground, air default, death). The frame switches based on player input -- hold Down/S to tuck, Up/W to spread.

## Force-based physics

The original speed model was a simple distance curve: `speed = start + distance * accel`, clamped to a cap. It worked but felt like riding an escalator. You couldn't slow down. Speed just went up.

We replaced it with a force model. Each frame: `accel = gravity - friction - wingDrag`. Gravity is a constant 120 pulling the penguin downhill. Friction is proportional to speed (coefficient 0.15 normally, 0.03 on ice, +0.25 in snowdrifts). Wing drag is the player's lever: tuck wings (Down/S) for zero drag and maximum acceleration, neutral for a light 10 drag, spread wings (Up/W) for heavy 60 drag that brakes hard.

Speed now rises and falls dynamically. You can actually slow down before a dense obstacle section, then tuck to blast through an open stretch. Ice patches become terrifying -- with friction near zero, speed climbs fast and steering barely works. Snowdrifts now add friction drag instead of a flat 50% speed multiplier, which feels more physical.

Tricks were simplified too. Instead of Backflip (Up) and Front Tuck (Down), there's now a single Flip triggered by Space/Enter or the TRICK touch button. One trick per jump, 300 points. Up/Down are freed up for wing control at all times. Touch layout changed from `[< FLIP TUCK >]` to `[< TUCK TRICK >]`.

## Snow-covered trees

First real obstacle art. We generated four snow-covered tree variants and packed them into a sprite sheet via the same build pipeline. The source image is a 2x2 grid (`penguin_images/trees.png`); the build script splits it into quadrants, removes backgrounds, scales to 48px, and composes a horizontal strip (`public/tree-sheet.png`, 4 frames @ 44x48).

Trees spawn at 2.2x scale and render above the penguin (depth 7 vs penguin's 5). Each tree gets a random variant. They're the most common obstacle now -- 40% of spawns at easy difficulty, 25% at expert.

The collision system got a major rework for trees:

**Persistence.** Obstacles no longer vanish on hit. They stay on screen, marked with a `hit` flag so the speed penalty doesn't re-trigger. Only fish disappear (they're collected). This makes the slope feel more real -- you crash through a tree and it's still there behind you.

**Centeredness scaling.** Tree slowdown uses acceleration, not a flat multiplier. A grazing hit subtracts 30 from speed. A dead center hit subtracts 300 -- nearly a full stop. The formula measures how far the penguin's center is from the tree's center relative to their combined widths.

**Continuous snow burst.** While the penguin overlaps a tree, white particles spray from the tree position *and* from under the penguin every frame. The ski trail pauses during overlap so it doesn't render on top of the tree. This was our depth-ordering solution -- rather than fighting Phaser's display list (newly created trail marks always ended up above older tree sprites regardless of depth settings), we just stop drawing the trail while inside a tree.

**Tree shake.** On each frame of overlap, the tree sprite is destroyed and recreated with a ±3px random offset from its stored origin. This serves two purposes: it places the sprite fresh at the top of the display list (fixing the depth issue for non-trail elements), and it gives the tree a satisfying shudder as the penguin plows through it. The origin point scrolls with the world so the shake stays centered.

## What's next

Rocks and ice are still colored rectangles. More sprites coming. Then: persistence (high scores, settings), sound effects, and the Capacitor wrap for Android.

We'll document the entire build as we go. Every decision, every dead end, every time we spend an hour tweaking how it feels to almost hit a rock.

-- a penguin @ appenguin.com
