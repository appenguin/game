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

3. **Game feel polish** -- ski trails, screen shake, near-miss slow-mo, snowfall particles, basic sound effects. This is where it goes from "tech demo" to "game."

4. **Menus and persistence** -- main menu, results screen, settings, best score saved locally. Full game loop.

5. **Art and audio** -- replace placeholder shapes with sprites. Sound effects and music.

6. **Capacitor wrap** -- bundle into an Android app with haptic feedback. The appenguin pipeline in action.

## Tech stack

- **Phaser 3** for the game engine
- **TypeScript** because we're not animals
- **Vite** for fast builds
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

- **Touch controls.** Four buttons in a row at the bottom: **< FLIP TUCK >**. The arrow buttons steer (rotating the penguin's heading with momentum, Ski or Die-style), and FLIP/TUCK perform tricks while airborne. Tapping above the button row also steers -- left half steers left, right half steers right. Multi-touch means you can steer with one thumb and tap tricks with the other.

  We originally had tilt/gyroscope steering, then half-screen touch zones. The current layout with explicit steer buttons matches the angle-based steering model -- you hold a direction to carve into a turn, and release to drift back straight.

  Portrait orientation is locked via the PWA manifest and the Screen Orientation API.

Why do this early? Because an installable, offline-capable game with solid touch controls is already a better demo for appenguin than a desktop-only web page.

## Camera, difficulty, and HUD

A few more things landed before we move to game feel polish:

**Centered camera.** The penguin now stays fixed at screen center while the world scrolls around it via Phaser's `camera.scrollX`. This means no more clamping at screen edges -- the penguin can carve freely in any direction. Obstacles spawn in world-space relative to the penguin, and off-screen objects get culled. All UI is pinned to the screen with `setScrollFactor(0)`.

**Difficulty selection.** BootScene now shows three buttons -- Easy, Medium, Hard -- each with a different speed profile (start speed, acceleration, cap). Easy tops out at 350, Hard can hit 600. The distance-based obstacle zones (which control spawn density and types) are independent of this choice.

**Top bar HUD.** A semi-transparent dark bar at the top shows score, distance, speed, and difficulty level at a glance.

## What's next

The codebase has been refactored into focused modules: pure game logic in `core/` (tricks, difficulty), Phaser systems in `engine/systems/` (input handling, obstacle spawning). RunScene is now a ~490-line orchestrator. Next up is game feel: particles, ski trails, near-miss slow-mo, snowfall. After that, menus, persistence, real art, and the Capacitor wrap for Android.

We'll document the entire build as we go. Every decision, every dead end, every time we spend an hour tweaking how it feels to almost hit a rock.

-- a penguin @ appenguin.com
