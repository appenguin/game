# PenguinSki

A penguin downhill ski game. Dodge obstacles, hit ramps, perform tricks mid-air, collect fish, survive as long as you can.

[Play now at game.appenguin.com](https://game.appenguin.com)

## Features

- **Trick system** -- hit ramps to go airborne, flip and spin for points, land cleanly to keep your combo
- **Combo scoring** -- chain tricks, ice patches, and flyovers to multiply your score
- **3 difficulty levels** -- Easy, Medium, Hard with different speed caps and acceleration
- **3 lives** -- rocks fling you off-screen; respawn with brief invincibility
- **Procedural music** -- 15-layer progressive arrangement powered by Strudel, builds as you travel further
- **Snowstorm** -- at 1500m, wind gusts push you and reduce visibility
- **PWA** -- install to home screen for offline play
- **Android APK** -- bundled Capacitor build, all assets included

## Controls

| Action | Keyboard | Touch |
|--------|----------|-------|
| Steer | Arrow keys / A, D | LEFT / RIGHT buttons or tap screen halves |
| Brake (spread wings) | Up / W | -- |
| Speed up (tuck wings) | Down / S | TUCK button (hold) |
| Trick (airborne) | Space / Enter | TRICK button |
| Spin (airborne) | Left / Right | LEFT / RIGHT buttons |
| Pause | ESC | Tap HUD bar |
| Resume / navigate menus | Arrow keys + Enter | Touch menu items |
| Retry (game over) | R | Touch |
| Quit to menu | Q | Touch |

**Mobile layout:** `[<] [TUCK] [TRICK] [>]` -- single row at bottom of screen.

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev       # dev server on port 8080
```

## Building

**Web:**

```bash
npm run build     # production build to dist/
npm run preview   # preview the build locally
```

**Android APK** (requires Node 22+ for Capacitor CLI, Android SDK):

```bash
npm run build:android     # debug APK: web build + cap sync + gradle
./android/build-release   # signed release APK (same pipeline)
./android/install         # install to connected device via adb
```

Debug output: `android/android/app/build/outputs/apk/debug/app-debug.apk` (~6.1MB)
Release output: `android/android/app/build/outputs/apk/release/app-release.apk` (~5.1MB)

## Tech stack

- [Phaser 3](https://phaser.io/) -- game framework
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) -- bundler + dev server
- [Strudel](https://strudel.cc/) -- procedural music (`@strudel/web`)
- [Capacitor](https://capacitorjs.com/) -- Android APK wrapper

No backend. All data stored in localStorage. [Umami](https://umami.is/) analytics (graceful no-op when offline).

## Project structure

```
src/
  main.ts                 Entry point, orientation lock, pause hooks
  core/                   Pure game logic (no Phaser dependency)
    tricks.ts             Trick types, scoring helpers
    difficulty.ts         Difficulty zones, spawn weights, speed profiles
    music.ts              Music pattern definitions, level thresholds
    storage.ts            High score persistence
  engine/
    game.ts               Phaser config
    scenes/
      BootScene.ts        Difficulty select, music toggle, high scores
      RunScene.ts         Gameplay, pause/game-over menus
    systems/
      Input.ts            Keyboard + touch input
      Spawner.ts          Obstacle spawning, collision
      Music.ts            Strudel lifecycle, layer progression
      SFX.ts              Procedural sound effects (Web Audio API)
      Effects.ts          Particles, trails, visual effects
public/                   Static assets (sprites, icons, manifest)
android/                  Capacitor Android wrapper
  build                   Debug APK build script
  build-release           Signed release APK build script
  install                 ADB install script
index.html                Entry point + splash screen
```

## What's next

The game and music are still in progress. Some areas we're working on:

- **Game balance** -- scoring, obstacle density, storm difficulty
- **Art** -- new sprite art for the penguin, obstacles, or background elements (we can help with converting it to sprite sheets)
- **Levels** -- new terrain, obstacle layouts, difficulty progression
- **New obstacles or slope elements**
- **Haptic feedback** for Android (Capacitor)
- **Share button** for scores
- **Bug fixes** and performance improvements

Contributions are welcome -- open a PR or file an issue.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).

You can view, modify, and redistribute the source code, but any modified version you distribute or serve over a network must also be AGPL-3.0 and source-available. This project uses [Strudel](https://strudel.cc/) for procedural music, which is AGPL-licensed.

Game art assets in `penguin_images/` and `public/` are copyright Appenguin and not covered by the AGPL.
