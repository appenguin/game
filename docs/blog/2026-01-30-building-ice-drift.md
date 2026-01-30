# Building Ice Drift: a penguin game from scratch

*January 30, 2026*

We're building a game. You slide downhill on ice, hold to drift, release to straighten. Collect fish (finally, someone gets what matters), dodge rocks, chain combos. Simple to learn, hard to master, impossible to stop.

The game is called **Ice Drift**, and it will live at [icedrift.appenguin.com](https://icedrift.appenguin.com).

## Why build a game?

Three reasons, in order of honesty:

**1. It's fun.** Our day-to-day work is scanners, dashboards, business logic. Important stuff. But sometimes you want to make a penguin slide into a rock at high speed and watch the screen shake. This is our fun edge -- vibe coding with no deadlines, no sprint boards, just building something because it makes us happy.

**2. Cool tech.** Phaser 3, Vite, TypeScript, Capacitor, PWA APIs -- building a game touches all of them in ways that a CRUD app never would. Games demand real-time rendering, tight input loops, asset pipelines, offline support. It's the best excuse to go deep on tools we've been wanting to play with.

**3. Appenguin showcase.** Ice Drift also doubles as a demo for [appenguin](https://appenguin.com), our service that turns websites into Android apps. What better proof that a web app can feel native than a game that runs smoothly on mobile, works offline, and wraps cleanly into an APK? If someone plays it without knowing any of this, they'd just think it's a fun game. That's the point.

## The plan

We're keeping it loose. Five phases:

1. **Playable prototype** -- core loop with placeholder art (colored shapes). Penguin slides, drifts, collects fish, hits rocks, game over. No menus, no persistence. Just the feel. Done.

2. **PWA + mobile + tilt** -- pulled this forward. Service worker, manifest, offline play, gyroscope steering. Install it to your home screen and tilt to steer. Done.

3. **Game feel polish** -- drift trails, screen shake, near-miss slow-mo, snowfall particles, basic sound effects. This is where it goes from "tech demo" to "game."

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

- **Tilt steering.** This was the fun part. `DeviceOrientationEvent.gamma` gives you the left/right tilt angle of the phone. We clamp it to a comfortable range (-30 to +30 degrees), normalize to -1..+1, and feed it into the same steering code that handles keyboard and touch. The result is analog steering -- slight tilt for gentle turns, big tilt for sharp ones. It feels natural.

  On iOS, you need to request permission for device orientation (thanks, Apple). We hook into the first tap to call `DeviceOrientationEvent.requestPermission()`. On Android and desktop, it just works.

  Input priority is keyboard > tilt > touch. If you're on a phone, tilt takes over automatically. A dead zone of about 2.4 degrees prevents jitter when the phone is nearly flat.

Why do this early? Because an installable, offline-capable game with tilt controls is already a better demo for appenguin than a desktop-only web page. And honestly, tilting your phone to steer a penguin downhill is just fun.

## What's next

Refactoring the 720-line RunScene into focused modules, then adding game feel: particles, ski trails, near-miss slow-mo, snowfall. After that, menus, persistence, real art, and the Capacitor wrap for Android.

We'll document the entire build as we go. Every decision, every dead end, every time we spend an hour tweaking how it feels to almost hit a rock.

-- a penguin @ appenguin.com
