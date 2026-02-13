import Phaser from "phaser";
import { type Trick, TRICKS, canQueueTrick } from "../../core/tricks";
import { SPEED_PROFILES } from "../../core/difficulty";
import { saveScore } from "../../core/storage";
import { LEVEL_THRESHOLDS } from "../../core/music";
import {
  PIXELS_PER_METER, PENGUIN_Y, HITBOX_SHRINK, STARTING_LIVES, INVINCIBILITY_MS,
  GRAVITY, FRICTION_NORMAL, FRICTION_ICE, FRICTION_SNOWDRIFT_EXTRA,
  WING_DRAG_TUCK, WING_DRAG_NEUTRAL, WING_DRAG_SPREAD, SCORE_RATE,
  ICE_TURN_ACCEL, ICE_TURN_SPEED, ICE_DRAG, ICE_CENTER, COUNTER_STEER_BOOST,
  AIR_ARC_HEIGHT, AIR_BASE_DURATION, AIR_SPEED_FACTOR, AIR_ICY_MULTIPLIER,
  AIR_STORM_MULTIPLIER, AIR_DRIFT_FACTOR, MOGUL_AIR_DURATION, TRICK_ROTATION_TIME,
  WIND_AIRBORNE_MULTIPLIER,
  LANDING_CLEAN_THRESHOLD, LANDING_SLOPPY_THRESHOLD,
  FISH_POINTS, ICE_POINTS, FLYOVER_POINTS, MULTI_TRICK_BONUS, SPIN_HALF_POINTS,
  ICE_SPEED_BOOST,
  TREE_GRAZE_DECEL, TREE_CENTER_DECEL, TREE_HIT_WIDTH,
  SLIPPERY_DURATION, SNOWDRIFT_DURATION, CRASH_LOCK_MS, GAME_OVER_DELAY_MS,
} from "../../core/constants";
import { Input } from "../systems/Input";
import { Spawner, type SlopeObject } from "../systems/Spawner";
import { Effects } from "../systems/Effects";
import { SFX } from "../systems/SFX";
import { Haptics } from "../systems/Haptics";
import { Menu } from "../systems/Menu";
import { HUD } from "../systems/HUD";
import { music } from "../systems/Music";
import { generateTextures } from "../Textures";

/**
 * Main gameplay scene: Ski or Die-style downhill.
 *
 * The penguin is near the top of the screen, sliding downhill.
 * Obstacles spawn ahead (bottom) and scroll upward past the penguin.
 * Ramps launch the penguin into the air for tricks.
 */
export class RunScene extends Phaser.Scene {
  // Penguin
  private penguin!: Phaser.GameObjects.Sprite;
  private penguinShadow!: Phaser.GameObjects.Ellipse;
  private isDead = false;
  private penguinAirHeight = 0;
  private isAirborne = false;
  private airTime = 0;
  private airDuration = 0;
  private trickQueue: Trick[] = [];
  private currentTrickRotation = 0;
  private targetTrickRotation = 0;
  private spinRotation = 0;
  // Status effects
  private slipperyTimer = 0;
  private snowdriftTimer = 0;
  private icyLaunch = false;

  // Storm
  private stormStarted = false;
  private stormStartMeters = 0;

  // Heading (angle-based steering with momentum)
  private heading = 0; // current angle (radians, 0 = straight down)
  private headingVelocity = 0; // angular velocity (rad/s)
  private readonly maxAngle = (Math.PI / 180) * 45; // ±45° max steering
  private readonly turnAccel = 5.0; // angular acceleration (rad/s²)
  private readonly maxTurnSpeed = 2.5; // max angular velocity (rad/s)
  private readonly headingDrag = 4.0; // angular velocity decay when no input
  private readonly headingCenter = 2.5; // heading return-to-center rate (when no input)
  private readonly lateralFactor = 1.2; // lateral speed = sin(heading) * scrollSpeed * factor

  // Difficulty level (0=Easy, 1=Medium, 2=Hard)
  private level = 1;

  // Speed & scoring
  private scrollSpeed = 200;
  private distanceTraveled = 0;
  private score = 0;
  private scoreFrac = 0;
  private trickScore = 0;
  private combo = 0;
  private lives = STARTING_LIVES;
  private invincible = false;
  private flinging = false;
  private gameOver = false;
  private paused = false;

  // Background
  private snowBg!: Phaser.GameObjects.TileSprite;

  // Systems
  private inputHandler!: Input;
  private spawner!: Spawner;
  private effects!: Effects;
  private sfx!: SFX;
  private haptics!: Haptics;
  private menu!: Menu;
  private hud!: HUD;
  private music = music;

  constructor() {
    super("Run");
  }

  preload(): void {
    this.load.spritesheet("penguin", "penguin-sheet.png", {
      frameWidth: 46,
      frameHeight: 46,
    });
    this.load.spritesheet("tree", "tree-sheet.png", {
      frameWidth: 44,
      frameHeight: 48,
    });
    this.load.spritesheet("rock", "rock-sheet.png", {
      frameWidth: 38,
      frameHeight: 30,
    });

    generateTextures(this);
  }

  create(): void {
    const { width, height } = this.scale;

    // Read difficulty level and SFX/haptics preferences from scene data
    const data = this.scene.settings.data as { level?: number; sfxMuted?: boolean; hapticsMuted?: boolean } | undefined;
    this.level = data?.level ?? 1;
    this.music.setDifficulty(this.level);
    this.music.play(1);

    // Reset state
    this.gameOver = false;
    this.isDead = false;
    this.score = 0;
    this.scoreFrac = 0;
    this.distanceTraveled = 0;
    this.combo = 0;
    this.trickScore = 0;
    this.isAirborne = false;
    const profile = SPEED_PROFILES[this.level] ?? SPEED_PROFILES[1];
    this.scrollSpeed = profile.start;
    this.heading = 0;
    this.headingVelocity = 0;
    this.slipperyTimer = 0;
    this.snowdriftTimer = 0;
    this.stormStarted = false;
    this.lives = STARTING_LIVES;
    this.invincible = false;
    this.flinging = false;
    this.paused = false;
    this.cameras.main.setBackgroundColor("#f8fbff");

    // Snow background tile
    this.snowBg = this.add.tileSprite(0, 0, width, height, "snow-bg")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-10);

    // Penguin shadow
    this.penguinShadow = this.add.ellipse(
      width / 2, height * PENGUIN_Y, 36, 12, 0x000000, 0.2,
    );
    this.penguinShadow.setDepth(4);

    // Penguin
    this.penguin = this.add.sprite(width / 2, height * PENGUIN_Y, "penguin", 0);
    this.penguin.setDepth(5);

    // Systems
    this.menu = new Menu(this);
    this.hud = new HUD(this, this.level, this.lives, () => this.togglePause());
    this.inputHandler = new Input(this);
    this.spawner = new Spawner(this);
    this.effects = new Effects(this, this.penguin);
    const audioCtx = (this.sound as Phaser.Sound.WebAudioSoundManager).context;
    this.sfx = new SFX(audioCtx);
    this.sfx.setMuted(data?.sfxMuted ?? false);
    this.haptics = new Haptics();
    this.haptics.setMuted(data?.hapticsMuted ?? false);
    this.inputHandler.setPauseHandler(() => this.togglePause());

    // Expose functions for Android back button and background/visibility change
    window.__gameTogglePause = () => this.togglePause();
    window.__gamePause = () => {
      if (!this.paused && !this.gameOver) {
        this.paused = true;
        this.music.pause();
        this.showPauseMenu();
      }
    };

    // Cheat: +/- teleport ±100m (advances music + storm)
    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
      if (this.gameOver) return;
      if (e.key === "+" || e.key === "=") {
        this.distanceTraveled += 100 * PIXELS_PER_METER;
        this.score = 0;
        this.cameras.main.flash(300, 255, 255, 255, false, undefined, this);
        this.hud.showStatusText("CHEAT +100m", "#a855f7");
      } else if (e.key === "-" || e.key === "_") {
        this.distanceTraveled = Math.max(0, this.distanceTraveled - 100 * PIXELS_PER_METER);
        this.score = 0;
        this.cameras.main.flash(300, 255, 255, 255, false, undefined, this);
        this.hud.showStatusText("CHEAT -100m", "#a855f7");
      }
    });
  }

  update(_time: number, delta: number): void {
    if (this.paused) return;
    if (this.gameOver) {
      const dt = delta / 1000;
      this.effects.update(dt, this.penguin.x, this.penguin.y, this.heading, 0, false);
      return;
    }

    const dt = delta / 1000;

    this.updatePhysics(dt);
    this.updateSteering(dt);
    this.updateSpriteFrame();
    this.updateEffectsAndStorm(dt);
    this.updateCamera(dt);

    const windX = this.effects.getWindLateral();
    this.spawner.update(dt, this.scrollSpeed, this.distanceTraveled, this.penguin.x, windX);

    if (this.isAirborne) this.checkFlyovers();
    if (!this.isAirborne) {
      this.checkCollisions();
      if (this.gameOver) return;
    }
    this.updateAirborne(dt);

    const meters = Math.floor(this.distanceTraveled / PIXELS_PER_METER);
    this.hud.update(this.score, meters, this.scrollSpeed, this.combo, this.slipperyTimer, this.snowdriftTimer);
    this.inputHandler.setAirborne(this.isAirborne);
    this.music.updateDistance(meters);
  }

  // --- Physics ---

  private updatePhysics(dt: number): void {
    const profile = SPEED_PROFILES[this.level] ?? SPEED_PROFILES[1];
    const icy = this.slipperyTimer > 0;
    const drifting = this.snowdriftTimer > 0;
    const baseFriction = icy ? FRICTION_ICE : FRICTION_NORMAL;
    const frictionCoeff = drifting ? baseFriction + FRICTION_SNOWDRIFT_EXTRA : baseFriction;
    const friction = this.scrollSpeed * frictionCoeff;
    const spread = this.inputHandler.getSpreadHeld() && !this.isAirborne;
    const tucked = this.inputHandler.getTuckHeld();
    const wingDrag = spread ? WING_DRAG_SPREAD : (tucked ? WING_DRAG_TUCK : WING_DRAG_NEUTRAL);
    const accel = GRAVITY - friction - wingDrag;
    this.scrollSpeed = Phaser.Math.Clamp(
      this.scrollSpeed + accel * dt, 0, profile.cap,
    );

    const forwardSpeed = this.scrollSpeed * Math.cos(this.heading);
    this.distanceTraveled += forwardSpeed * dt;
    this.scoreFrac += forwardSpeed * dt * SCORE_RATE;
    const earned = Math.floor(this.scoreFrac);
    if (earned > 0) {
      this.score += earned;
      this.scoreFrac -= earned;
    }

    // Tick down status effects
    if (this.slipperyTimer > 0) {
      this.slipperyTimer -= dt;
      if (this.slipperyTimer <= 0) this.effects.stopIceSparkle();
    }
    if (this.snowdriftTimer > 0) this.snowdriftTimer -= dt;
  }

  // --- Steering ---

  private updateSteering(dt: number): void {
    const icy = this.slipperyTimer > 0;
    const fullSpeed = this.scrollSpeed;

    // Skip steering/rotation during fling (let tween control penguin)
    if (this.flinging) {
      return;
    }

    if (!this.isAirborne) {
      const steerDir = this.inputHandler.getSteerDir();

      if (steerDir !== 0) {
        // Counter-steering (pressing opposite to current heading) gets a boost
        const counterSteer = (steerDir > 0 && this.heading < -0.05) ||
          (steerDir < 0 && this.heading > 0.05);
        const baseAccel = counterSteer ? this.turnAccel * COUNTER_STEER_BOOST : this.turnAccel;
        const effectiveAccel = icy ? baseAccel * ICE_TURN_ACCEL : baseAccel;
        this.headingVelocity += steerDir * effectiveAccel * dt;
        const maxTurn = icy ? this.maxTurnSpeed * ICE_TURN_SPEED : this.maxTurnSpeed;
        this.headingVelocity = Phaser.Math.Clamp(
          this.headingVelocity, -maxTurn, maxTurn,
        );
      } else {
        // Ice: very low drag — heading velocity persists (drifty)
        const drag = icy ? this.headingDrag * ICE_DRAG : this.headingDrag;
        this.headingVelocity *= 1 - drag * dt;
        if (Math.abs(this.headingVelocity) < 0.05) this.headingVelocity = 0;
      }

      this.heading += this.headingVelocity * dt;

      // Return heading toward straight downhill when not steering
      // Ice: very slow centering — penguin keeps sliding at an angle
      if (steerDir === 0) {
        const center = icy ? this.headingCenter * ICE_CENTER : this.headingCenter;
        this.heading *= 1 - center * dt;
        if (Math.abs(this.heading) < 0.01) this.heading = 0;
      }

      this.heading = Phaser.Math.Clamp(this.heading, -this.maxAngle, this.maxAngle);

      this.penguin.x += Math.sin(this.heading) * fullSpeed * this.lateralFactor * dt;
      this.penguin.setRotation(-this.heading);
      this.penguinShadow.x = this.penguin.x;

      if (icy) {
        this.penguin.setTint(0x67e8f9);
      } else {
        this.penguin.clearTint();
      }
    } else {
      this.handleAirTricks(dt);
    }
  }

  private updateSpriteFrame(): void {
    if (this.isDead) return;
    const tucked = this.inputHandler.getTuckHeld();
    const spread = this.inputHandler.getSpreadHeld() && !this.isAirborne;
    // Ground: 0=neutral/tuck, 1=spread (brake)
    // Air: 1=default (spread), 0=tuck held
    if (this.isAirborne) {
      this.penguin.setFrame(tucked ? 0 : 1);
    } else {
      this.penguin.setFrame(spread ? 1 : 0);
    }
  }

  // --- Effects & Storm ---

  private updateEffectsAndStorm(dt: number): void {
    // Check if penguin overlaps any obstacle (for trail suppression)
    const inObstacle = !this.isAirborne && this.spawner.getObjects().some(
      (obj) => this.spawner.checkCollision(
        this.penguin.x, this.penguin.y,
        this.penguin.displayWidth * HITBOX_SHRINK, this.penguin.displayHeight * HITBOX_SHRINK, obj,
      ),
    );

    this.effects.update(dt, this.penguin.x, this.penguin.y, this.heading, this.scrollSpeed, this.isAirborne, inObstacle);

    // Storm (tied to solo: level 14)
    const meters = Math.floor(this.distanceTraveled / PIXELS_PER_METER);
    const soloLevel = LEVEL_THRESHOLDS.length - 2;
    const postSoloLevel = LEVEL_THRESHOLDS.length - 1;
    if (!this.stormStarted && this.music.level >= soloLevel && this.music.level < postSoloLevel) {
      this.stormStarted = true;
      this.stormStartMeters = meters;
      this.effects.startStorm();
    }
    if (this.stormStarted) {
      if (this.music.level >= postSoloLevel) {
        this.stormStarted = false;
        this.effects.stopStorm();
      } else {
        const intensity = Math.min(1, (meters - this.stormStartMeters) / 100);
        this.effects.setStormIntensity(intensity);
      }
    }

    // Wind pushes penguin
    const windX = this.effects.getWindLateral();
    if (windX !== 0) {
      const windMul = this.isAirborne ? WIND_AIRBORNE_MULTIPLIER : 1;
      this.penguin.x += windX * windMul * dt;
      this.penguinShadow.x = this.penguin.x;
    }
  }

  // --- Camera ---

  private updateCamera(dt: number): void {
    const { width } = this.scale;
    if (!this.flinging) {
      this.cameras.main.scrollX = this.penguin.x - width / 2;
    }
    this.snowBg.tilePositionX = this.cameras.main.scrollX;
    this.snowBg.tilePositionY += this.scrollSpeed * dt;
  }

  // --- Airborne ---

  private checkFlyovers(): void {
    const px = this.penguin.x;
    const py = this.penguin.y;
    const pw = this.penguin.displayWidth * HITBOX_SHRINK;
    const ph = this.penguin.displayHeight * HITBOX_SHRINK;
    for (const obj of this.spawner.getObjects()) {
      if (obj.hit) continue;
      if (obj.type !== "rock" && obj.type !== "tree") continue;
      if (!this.spawner.checkCollision(px, py, pw, ph, obj)) continue;
      const pts = FLYOVER_POINTS * Math.max(1, this.combo);
      this.score += pts;
      this.hud.showStatusText(`FLYOVER +${pts}`, "#a78bfa");
      this.spawner.markHit(obj);
    }
  }

  private updateAirborne(dt: number): void {
    if (!this.isAirborne) return;
    const { height } = this.scale;

    this.airTime += dt;
    const progress = this.airTime / this.airDuration;
    const arc = 1 - (2 * progress - 1) ** 2;
    this.penguinAirHeight = arc * AIR_ARC_HEIGHT;
    this.penguin.y = height * PENGUIN_Y - this.penguinAirHeight;
    this.penguin.setScale(1 + arc * 0.3);
    this.penguinShadow.setScale(1 - arc * 0.3);
    this.penguinShadow.setAlpha(0.2 * (1 - arc * 0.5));

    const rotRemaining = this.targetTrickRotation - this.currentTrickRotation;
    if (Math.abs(rotRemaining) > 0.01) {
      const rotSpeed = (Math.PI * 2) / TRICK_ROTATION_TIME;
      const step = Math.sign(rotRemaining) * rotSpeed * dt;
      if (Math.abs(step) >= Math.abs(rotRemaining)) {
        this.currentTrickRotation = this.targetTrickRotation;
      } else {
        this.currentTrickRotation += step;
      }
    }
    this.penguin.setRotation(-this.heading + this.currentTrickRotation + this.spinRotation);

    if (this.airTime >= this.airDuration) {
      this.land();
    }
  }

  private handleAirTricks(dt: number): void {
    // Trick: Space/Enter or TRICK button (once per jump)
    const trickKey = this.inputHandler.getTrickKey();
    if (trickKey && TRICKS[trickKey]) {
      const trick = TRICKS[trickKey];
      const timeLeft = this.airDuration - this.airTime;
      if (canQueueTrick(this.trickQueue, trick, timeLeft)) {
        this.trickQueue.push(trick);
        this.targetTrickRotation += trick.rotation;
        this.trickScore += trick.points;

        if (this.trickQueue.length > 1) {
          this.trickScore += MULTI_TRICK_BONUS * (this.trickQueue.length - 1);
        }

        this.hud.showTrickText(trick.name);
        this.sfx.trickPerformed();
        this.haptics.trickPerformed();
      }
    }

    // Spin: left/right arrows add continuous rotation
    const spinDir = this.inputHandler.getSpinDir();
    if (spinDir !== 0) {
      this.spinRotation += spinDir * Math.PI * 2 * dt;
    }

    // Passive air drift from heading at launch (reduced rate)
    this.penguin.x += Math.sin(this.heading) * this.scrollSpeed * this.lateralFactor * AIR_DRIFT_FACTOR * dt;
    this.penguinShadow.x = this.penguin.x;
  }

  private land(): void {
    this.isAirborne = false;
    this.penguin.setDepth(5);
    const { height: sceneH } = this.scale;
    this.penguin.y = sceneH * PENGUIN_Y;
    this.penguin.setScale(1);
    this.penguin.setRotation(-this.heading);
    this.penguinShadow.setScale(1);
    this.penguinShadow.setAlpha(0.2);
    this.penguinAirHeight = 0;

    const rotDiff = Math.abs(this.currentTrickRotation - this.targetTrickRotation);

    // Award spin points (50 per half rotation)
    const spinHalves = Math.floor(Math.abs(this.spinRotation) / Math.PI);
    const spinPoints = spinHalves * SPIN_HALF_POINTS;
    this.trickScore += spinPoints;

    if (this.trickQueue.length > 0 || spinPoints > 0) {
      if (rotDiff < LANDING_CLEAN_THRESHOLD) {
        // Clean landing — icy jump doubles trick score
        const comboMultiplier = Math.max(1, this.combo);
        const icyMultiplier = this.icyLaunch ? 2 : 1;
        const points = this.trickScore * comboMultiplier * icyMultiplier;
        this.score += points;
        this.combo++;
        this.effects.burstTrickLanding(this.penguin.x, this.penguin.y);
        this.sfx.cleanLanding();
        this.haptics.cleanLanding();
        if (this.icyLaunch) {
          this.hud.showStatusText(`ICY COMBO +${points}`, "#06b6d4");
        } else {
          this.hud.showStatusText(`+${points}`, "#10b981");
        }
      } else if (rotDiff < LANDING_SLOPPY_THRESHOLD) {
        // Sloppy landing — no points, but don't reset combo
        this.sfx.sloppyLanding();
        this.haptics.sloppyLanding();
        this.hud.showStatusText("SLOPPY!", "#f59e0b");
      } else {
        // Crash — too far off
        this.combo = 0;
        this.effects.burstCrashLanding(this.penguin.x, this.penguin.y);
        this.sfx.crashLanding();
        this.haptics.crashLanding();
        this.penguinBounce();
        this.hud.showStatusText("CRASH!", "#ef4444");
        // Lock tucked frame briefly during crash
        this.isDead = true;
        this.penguin.setFrame(0);
        this.time.delayedCall(CRASH_LOCK_MS, () => {
          if (!this.gameOver) {
            this.isDead = false;
          }
        });
      }
    }

    this.cameraBump();

    this.trickQueue = [];
    this.trickScore = 0;
    this.currentTrickRotation = 0;
    this.targetTrickRotation = 0;
    this.spinRotation = 0;
    this.icyLaunch = false;
  }

  private launch(duration?: number): void {
    this.isAirborne = true;
    this.penguin.setDepth(8);
    this.airTime = 0;
    this.icyLaunch = !duration && this.slipperyTimer > 0;
    const baseDuration = duration ?? AIR_BASE_DURATION + (this.scrollSpeed - 200) * AIR_SPEED_FACTOR;
    let dur = this.icyLaunch ? baseDuration * AIR_ICY_MULTIPLIER : baseDuration;
    if (this.stormStarted) dur *= AIR_STORM_MULTIPLIER;
    this.airDuration = dur;
    this.trickQueue = [];
    this.trickScore = 0;
    this.currentTrickRotation = 0;
    this.targetTrickRotation = 0;
    this.spinRotation = 0;
    if (this.icyLaunch) {
      this.hud.showStatusText("ICY JUMP!", "#06b6d4");
    } else if (!duration) {
      this.hud.showStatusText("AIR!", "#3b82f6");
    }
  }

  // --- Collisions ---

  private checkCollisions(): void {
    const px = this.penguin.x;
    const py = this.penguin.y;
    const pw = this.penguin.displayWidth * HITBOX_SHRINK;
    const ph = this.penguin.displayHeight * HITBOX_SHRINK;
    for (const obj of this.spawner.getObjects()) {
      if (!this.spawner.checkCollision(px, py, pw, ph, obj)) continue;
      if (obj.hit) {
        // Continuous effects while penguin overlaps hit objects
        if (obj.type === "tree") {
          this.effects.burstTreeHit(obj.sprite.x, obj.sprite.y, px, py);
          this.spawner.redrawTree(obj);
        } else if (obj.type === "ice") {
          this.slipperyTimer = SLIPPERY_DURATION;
        }
        continue;
      }
      this.handleCollision(obj);
      if (this.gameOver) return;
    }
  }

  private handleCollision(obj: SlopeObject): void {
    switch (obj.type) {
      case "rock":
        if (this.invincible) break;
        this.lives--;
        this.hud.setLives(this.lives);
        this.effects.burstDeath(this.penguin.x, this.penguin.y);
        this.sfx.rockHit();
        this.haptics.rockHit();
        if (this.lives <= 0) {
          this.endGame();
        } else {
          this.flingPenguin(obj);
        }
        break;

      case "tree": {
        // Center hit = huge decel, grazing = small nudge
        const dx = Math.abs(this.penguin.x - obj.sprite.x);
        const maxDx = (obj.width + this.penguin.displayWidth) * TREE_HIT_WIDTH;
        const centeredness = 1 - Phaser.Math.Clamp(dx / maxDx, 0, 1);
        const decel = TREE_GRAZE_DECEL + centeredness * TREE_CENTER_DECEL;
        this.scrollSpeed = Math.max(0, this.scrollSpeed - decel);
        this.combo = 0;
        this.effects.burstTreeHit(obj.sprite.x, obj.sprite.y, this.penguin.x, this.penguin.y);
        this.cameras.main.shake(150, 0.005);
        this.sfx.treeHit(centeredness);
        this.haptics.treeHit(centeredness);
        this.hud.showStatusText("HIT!", "#ef4444");
        // Redraw tree so it renders above trail marks, with a shake
        this.spawner.redrawTree(obj);
        this.spawner.markHit(obj);
        break;
      }

      case "snowdrift":
        this.snowdriftTimer = SNOWDRIFT_DURATION;
        this.effects.burstSnowdrift(obj.sprite.x, obj.sprite.y);
        this.sfx.snowdriftHit();
        this.haptics.snowdriftHit();
        this.hud.showStatusText("SNOW!", "#94a3b8");
        this.spawner.markHit(obj);
        break;

      case "ice": {
        this.slipperyTimer = SLIPPERY_DURATION;
        const cap = (SPEED_PROFILES[this.level] ?? SPEED_PROFILES[1]).cap;
        this.scrollSpeed = Math.min(this.scrollSpeed + ICE_SPEED_BOOST, cap);
        const icePoints = ICE_POINTS * Math.max(1, this.combo);
        this.score += icePoints;
        this.combo++;
        this.effects.startIceSparkle();
        this.sfx.iceEntry();
        this.haptics.iceEntry();
        this.hud.showStatusText(`ICE +${icePoints}`, "#0ea5e9");
        this.spawner.markHit(obj);
        break;
      }

      case "mogul":
        this.launch(MOGUL_AIR_DURATION);
        this.sfx.mogulLaunch();
        this.haptics.mogulLaunch();
        this.spawner.markHit(obj);
        break;

      case "ramp":
        this.launch();
        this.sfx.rampLaunch();
        this.haptics.rampLaunch();
        this.spawner.markHit(obj);
        break;

      case "fish":
        this.score += FISH_POINTS;
        this.effects.burstFishCollected(obj.sprite.x, obj.sprite.y);
        this.sfx.fishCollect();
        this.haptics.fishCollect();
        this.spawner.removeObject(obj);
        break;
    }
  }

  // --- Fling & Respawn ---

  private flingPenguin(obj: SlopeObject): void {
    this.invincible = true;
    this.flinging = true;
    this.isDead = true;
    this.combo = 0;
    this.penguin.setFrame(1);
    this.cameras.main.shake(300, 0.015);
    this.sfx.fling();
    this.haptics.fling();

    // Fling direction: away from rock
    const dx = this.penguin.x - obj.sprite.x;
    const dy = this.penguin.y - obj.sprite.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const flingX = this.penguin.x + (dx / dist) * 500;
    const flingY = this.penguin.y + (dy / dist) * 350;
    const spinDir = dx >= 0 ? 1 : -1;

    this.tweens.add({
      targets: this.penguin,
      x: flingX,
      y: flingY,
      rotation: this.penguin.rotation + spinDir * Math.PI * 16,
      scaleX: 0.3,
      scaleY: 0.3,
      alpha: 0,
      duration: 1000,
      ease: "Cubic.easeOut",
      onComplete: () => this.respawnPenguin(),
    });

    // Hide shadow during fling
    this.penguinShadow.setAlpha(0);
  }

  private respawnPenguin(): void {
    this.flinging = false;
    const { width, height } = this.scale;
    const profile = SPEED_PROFILES[this.level] ?? SPEED_PROFILES[1];

    // Reset penguin to screen center
    this.penguin.x = this.cameras.main.scrollX + width / 2;
    this.penguin.y = height * PENGUIN_Y;
    this.penguin.setScale(1);
    this.penguin.setAlpha(1);
    this.penguin.setRotation(0);
    this.penguin.setDepth(5);
    this.penguin.setFrame(0);
    this.penguinShadow.x = this.penguin.x;
    this.penguinShadow.setAlpha(0.2);
    this.isDead = false;

    // Reset steering
    this.heading = 0;
    this.headingVelocity = 0;

    // Slow down to start speed
    this.scrollSpeed = Math.min(this.scrollSpeed, profile.start);

    // Reset airborne state if flung while airborne
    if (this.isAirborne) {
      this.isAirborne = false;
      this.airTime = 0;
      this.airDuration = 0;
    }

    // Invincibility flash for 2 seconds
    let flashCount = 0;
    const flashTimer = this.time.addEvent({
      delay: 100,
      repeat: 19,
      callback: () => {
        flashCount++;
        this.penguin.setAlpha(flashCount % 2 === 0 ? 1 : 0.3);
      },
    });
    this.time.delayedCall(INVINCIBILITY_MS, () => {
      flashTimer.destroy();
      this.penguin.setAlpha(1);
      this.invincible = false;
    });
  }

  // --- Game Over & Restart ---

  private endGame(): void {
    this.gameOver = true;
    this.isDead = true;
    this.penguin.setFrame(1);
    this.music.onGameOver();
    this.cameras.main.shake(400, 0.02);
    this.sfx.gameOver();
    this.haptics.gameOver();

    // Spin and tumble slightly in the opposite direction
    const spinDir = this.heading >= 0 ? -1 : 1;
    this.tweens.add({
      targets: this.penguin,
      x: this.penguin.x + spinDir * 40,
      rotation: this.penguin.rotation + spinDir * Math.PI * 16,
      duration: 800,
      ease: "Cubic.easeOut",
    });

    const dist = Math.floor(this.distanceTraveled / PIXELS_PER_METER);
    const distStr = dist >= 1000 ? (dist / 1000).toFixed(1) + " km" : dist + " m";
    const isNewBest = saveScore(this.level, this.score, dist);
    const bestLine = isNewBest ? "NEW BEST!\n" : "";
    const stats = `${bestLine}Score: ${this.score}  |  ${distStr}`;

    // Track game over event
    if (typeof umami !== "undefined") {
      umami.track("game-over", {
        level: this.level,
        score: this.score,
        distance: dist,
        newBest: isNewBest,
      });
    }

    // Short delay so death animation plays before menu appears
    this.time.delayedCall(GAME_OVER_DELAY_MS, () => {
      this.menu.show(`GAME OVER\n\n${stats}`, [
        { label: "RETRY", action: () => this.restartGame() },
        { label: "QUIT", action: () => this.quitToMenu() },
      ]);
    });
  }

  private restartGame(): void {
    this.menu.hide();
    this.music.onRestart();
    this.effects.destroy();
    this.sfx.destroy();
    this.spawner.destroyAll();
    this.inputHandler.reset();
    this.scene.restart({
      level: this.level,
      sfxMuted: this.sfx.muted,
      hapticsMuted: this.haptics.muted,
    });
  }

  private quitToMenu(): void {
    this.menu.hide();
    this.music.onRestart();
    this.effects.destroy();
    this.sfx.destroy();
    this.spawner.destroyAll();
    this.inputHandler.reset();
    this.scene.start("Boot");
  }

  // --- Pause ---

  private togglePause(): void {
    if (this.gameOver) {
      this.menu.triggerBack();
      return;
    }
    if (this.paused) {
      this.menu.hide();
      this.paused = false;
      this.music.resume();
    } else {
      this.paused = true;
      this.music.pause();
      this.showPauseMenu();
    }
  }

  private showPauseMenu(): void {
    this.menu.show("PAUSED", [
      { label: "RESUME", action: () => this.togglePause() },
      { label: "QUIT", action: () => this.quitToMenu() },
    ], () => this.togglePause());
  }

  // --- Visual helpers ---

  private cameraBump(): void {
    const cam = this.cameras.main;
    const baseY = cam.scrollY;
    this.tweens.add({
      targets: cam,
      scrollY: baseY + 6,
      duration: 80,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  private penguinBounce(): void {
    const baseY = this.penguin.y;
    this.tweens.add({
      targets: this.penguin,
      y: baseY + 12,
      duration: 100,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }
}
