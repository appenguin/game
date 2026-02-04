import Phaser from "phaser";
import { type Trick, TRICKS, canQueueTrick } from "../../core/tricks";
import { SPEED_PROFILES } from "../../core/difficulty";
import { saveScore } from "../../core/storage";
import { LEVEL_THRESHOLDS } from "../../core/music";
import { Input } from "../systems/Input";
import { Spawner, type SlopeObject } from "../systems/Spawner";
import { Effects } from "../systems/Effects";
import { music } from "../systems/Music";

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
  private lives = 3;
  private invincible = false;
  private flinging = false;
  private gameOver = false;
  private paused = false;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;

  // UI
  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private distText!: Phaser.GameObjects.Text;
  private trickText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private effectText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;

  // Background
  private snowBg!: Phaser.GameObjects.TileSprite;

  // Systems
  private inputHandler!: Input;
  private spawner!: Spawner;
  private effects!: Effects;
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

    // Generate particle textures
    const particles: [string, number, number, number][] = [
      ["snow-particle", 0x9ec5e8, 4, 8],
      ["gold-particle", 0xfbbf24, 3, 6],
      ["red-particle", 0xef4444, 3, 6],
      ["yellow-particle", 0xfde047, 2, 4],
      ["gray-particle", 0x6b7280, 4, 8],
      ["cyan-particle", 0x67e8f9, 2, 4],
      ["white-particle", 0xe2e8f0, 2.5, 5],
    ];
    const g = this.add.graphics();
    for (const [key, color, radius, size] of particles) {
      if (!this.textures.exists(key)) {
        g.clear();
        g.fillStyle(color);
        g.fillCircle(radius, radius, radius);
        g.generateTexture(key, size, size);
      }
    }
    g.destroy();

    // Snow background texture (tileable)
    if (!this.textures.exists("snow-bg")) {
      const bg = this.add.graphics();
      const size = 128;
      bg.fillStyle(0xf6f9ff);
      bg.fillRect(0, 0, size, size);
      const snow = (v: number) => (v << 16) | (v << 8) | v;
      // Soft broad variation
      for (let i = 0; i < 40; i++) {
        const sx = Math.random() * size;
        const sy = Math.random() * size;
        const sr = 2 + Math.random() * 5;
        bg.fillStyle(snow(244 + Math.floor(Math.random() * 12)), 0.1 + Math.random() * 0.1);
        bg.fillCircle(sx, sy, sr);
      }
      // Fine grain
      for (let i = 0; i < 250; i++) {
        const sx = Math.random() * size;
        const sy = Math.random() * size;
        const sr = 0.3 + Math.random() * 0.8;
        bg.fillStyle(snow(240 + Math.floor(Math.random() * 16)), 0.2 + Math.random() * 0.3);
        bg.fillCircle(sx, sy, sr);
      }
      // Sparkle pinpoints
      for (let i = 0; i < 100; i++) {
        const sx = Math.random() * size;
        const sy = Math.random() * size;
        const sr = 0.2 + Math.random() * 0.4;
        bg.fillStyle(0xffffff, 0.3 + Math.random() * 0.5);
        bg.fillCircle(sx, sy, sr);
      }
      // Shadow pinpoints
      for (let i = 0; i < 60; i++) {
        const sx = Math.random() * size;
        const sy = Math.random() * size;
        const sr = 0.3 + Math.random() * 0.6;
        bg.fillStyle(snow(230 + Math.floor(Math.random() * 16)), 0.15 + Math.random() * 0.15);
        bg.fillCircle(sx, sy, sr);
      }
      bg.generateTexture("snow-bg", size, size);
      bg.destroy();
    }

    // Ramp texture (procedural snow wedge)
    if (!this.textures.exists("ramp-tex")) {
      const rg = this.add.graphics();
      const rw = 60, rh = 32;
      // Shadow underneath
      rg.fillStyle(0x8faabe, 0.3);
      rg.beginPath();
      rg.moveTo(-2, 3);
      rg.lineTo(rw + 2, 3);
      rg.lineTo(rw - 8, rh + 2);
      rg.lineTo(8, rh + 2);
      rg.closePath();
      rg.fillPath();
      // Ramp body — trapezoid (wider at top/lip, narrower at base)
      rg.fillStyle(0xdce8f4);
      rg.beginPath();
      rg.moveTo(0, 0);
      rg.lineTo(rw, 0);
      rg.lineTo(rw - 10, rh);
      rg.lineTo(10, rh);
      rg.closePath();
      rg.fillPath();
      // Slope surface lines
      rg.lineStyle(0.5, 0xb0c8dc, 0.4);
      for (let i = 6; i < rh - 2; i += 5) {
        const t = i / rh;
        const inset = t * 10;
        rg.beginPath();
        rg.moveTo(inset + 2, i);
        rg.lineTo(rw - inset - 2, i);
        rg.strokePath();
      }
      // Lip highlight (bottom edge / launch lip)
      rg.fillStyle(0xf4f8ff);
      rg.fillRect(12, rh - 3, rw - 24, 3);
      // Outline
      rg.lineStyle(1.5, 0x8faabe);
      rg.beginPath();
      rg.moveTo(0, 0);
      rg.lineTo(rw, 0);
      rg.lineTo(rw - 10, rh);
      rg.lineTo(10, rh);
      rg.closePath();
      rg.strokePath();
      rg.generateTexture("ramp-tex", rw + 3, rh + 3);
      rg.destroy();
    }

    // Fish texture (procedural gold fish)
    if (!this.textures.exists("fish-tex")) {
      const fg = this.add.graphics();
      const fw = 18, fh = 12;
      const cx = fw / 2, cy = fh / 2;
      // Tail
      fg.fillStyle(0xe8920b);
      fg.beginPath();
      fg.moveTo(1, cy - 4);
      fg.lineTo(5, cy);
      fg.lineTo(1, cy + 4);
      fg.closePath();
      fg.fillPath();
      // Body (ellipse)
      fg.fillStyle(0xf59e0b);
      fg.fillEllipse(cx + 1, cy, 12, 9);
      // Belly highlight
      fg.fillStyle(0xfde68a, 0.5);
      fg.fillEllipse(cx + 2, cy - 1, 7, 4);
      // Eye
      fg.fillStyle(0x1a1a2e);
      fg.fillCircle(cx + 4, cy - 1, 1.2);
      fg.generateTexture("fish-tex", fw, fh);
      fg.destroy();
    }
  }

  create(): void {
    const { width, height } = this.scale;

    // Read difficulty level from scene data
    const data = this.scene.settings.data as { level?: number } | undefined;
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
    this.lives = 3;
    this.invincible = false;
    this.flinging = false;
    this.paused = false;
    this.pauseOverlay = null;
    this.cameras.main.setBackgroundColor("#f8fbff");

    // Snow background tile
    this.snowBg = this.add.tileSprite(0, 0, width, height, "snow-bg")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-10);

    // Penguin shadow
    this.penguinShadow = this.add.ellipse(
      width / 2, height * 0.25, 36, 12, 0x000000, 0.2,
    );
    this.penguinShadow.setDepth(4);

    // Penguin
    this.penguin = this.add.sprite(width / 2, height * 0.25, "penguin", 0);
    this.penguin.setDepth(5);


    // UI — top bar
    const barH = 36;
    const levelNames = ["EASY", "MED", "HARD"];
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: "13px",
      color: "#ffffff",
      fontFamily: "system-ui, sans-serif",
      fontStyle: "bold",
    };

    const hudBar = this.add
      .rectangle(width / 2, barH / 2, width, barH, 0x1a1a2e, 0.45)
      .setDepth(10)
      .setScrollFactor(0)
      .setInteractive();
    hudBar.on("pointerdown", () => this.togglePause());

    this.scoreText = this.add
      .text(12, barH / 2, "Score: 0", textStyle)
      .setOrigin(0, 0.5)
      .setDepth(11)
      .setScrollFactor(0);

    this.distText = this.add
      .text(width * 0.33, barH / 2, "0.0 km", textStyle)
      .setOrigin(0, 0.5)
      .setDepth(11)
      .setScrollFactor(0);

    this.speedText = this.add
      .text(width * 0.62, barH / 2, "0 km/h", textStyle)
      .setOrigin(0, 0.5)
      .setDepth(11)
      .setScrollFactor(0);

    this.livesText = this.add
      .text(width - 60, barH / 2, "\uD83D\uDC27".repeat(this.lives), textStyle)
      .setOrigin(1, 0.5)
      .setDepth(11)
      .setScrollFactor(0);

    this.add
      .text(width - 12, barH / 2, levelNames[this.level] ?? "MED", textStyle)
      .setOrigin(1, 0.5)
      .setDepth(11)
      .setScrollFactor(0);

    this.comboText = this.add
      .text(width / 2, barH + 8, "", {
        fontSize: "16px",
        color: "#7c3aed",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setDepth(10)
      .setScrollFactor(0);

    this.trickText = this.add
      .text(width / 2, height * 0.5, "", {
        fontSize: "28px",
        color: "#f59e0b",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0)
      .setScrollFactor(0);

    this.statusText = this.add
      .text(width / 2, height * 0.6, "", {
        fontSize: "24px",
        color: "#ef4444",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0)
      .setScrollFactor(0);

    this.effectText = this.add
      .text(width / 2, height * 0.15, "", {
        fontSize: "16px",
        color: "#0ea5e9",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0)
      .setScrollFactor(0);

    // Systems
    this.inputHandler = new Input(this);
    this.spawner = new Spawner(this);
    this.effects = new Effects(this, this.penguin);
    this.inputHandler.setPauseHandler(() => this.togglePause());

    // Cheat: +/- teleport ±100m (advances music + storm)
    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
      if (this.gameOver) return;
      if (e.key === "+" || e.key === "=") {
        this.distanceTraveled += 100 * 18;
        this.score = 0;
        this.cameras.main.flash(300, 255, 255, 255, false, undefined, this);
        this.showStatusText("CHEAT +100m", "#a855f7");
      } else if (e.key === "-" || e.key === "_") {
        this.distanceTraveled = Math.max(0, this.distanceTraveled - 100 * 18);
        this.score = 0;
        this.cameras.main.flash(300, 255, 255, 255, false, undefined, this);
        this.showStatusText("CHEAT -100m", "#a855f7");
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
    const { width, height } = this.scale;

    // Force-based speed: gravity vs friction vs wing drag
    const profile = SPEED_PROFILES[this.level] ?? SPEED_PROFILES[1];
    const gravity = 120;
    const icy = this.slipperyTimer > 0;
    const drifting = this.snowdriftTimer > 0;
    const baseFriction = icy ? 0.03 : 0.15;
    const frictionCoeff = drifting ? baseFriction + 0.25 : baseFriction;
    const friction = this.scrollSpeed * frictionCoeff;
    const spread = this.inputHandler.getSpreadHeld() && !this.isAirborne;
    const tucked = this.inputHandler.getTuckHeld();
    const wingDrag = spread ? 60 : (tucked ? 0 : 10);
    const accel = gravity - friction - wingDrag;
    this.scrollSpeed = Phaser.Math.Clamp(
      this.scrollSpeed + accel * dt, 0, profile.cap,
    );

    const fullSpeed = this.scrollSpeed;
    const forwardSpeed = this.scrollSpeed * Math.cos(this.heading);
    this.distanceTraveled += forwardSpeed * dt;
    this.scoreFrac += forwardSpeed * dt * 0.02;
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
    // --- Steering (angle-based with momentum) ---
    // Skip steering/rotation during fling (let tween control penguin)
    if (this.flinging) {
      // Do nothing — tween is animating the penguin
    } else if (!this.isAirborne) {
      const steerDir = this.inputHandler.getSteerDir();

      if (steerDir !== 0) {
        // Counter-steering (pressing opposite to current heading) gets a boost
        const counterSteer = (steerDir > 0 && this.heading < -0.05) ||
          (steerDir < 0 && this.heading > 0.05);
        const baseAccel = counterSteer ? this.turnAccel * 2.0 : this.turnAccel;
        // Ice: 8% turn acceleration — barely any steering
        const effectiveAccel = icy ? baseAccel * 0.08 : baseAccel;
        this.headingVelocity += steerDir * effectiveAccel * dt;
        const maxTurn = icy ? this.maxTurnSpeed * 0.15 : this.maxTurnSpeed;
        this.headingVelocity = Phaser.Math.Clamp(
          this.headingVelocity, -maxTurn, maxTurn,
        );
      } else {
        // Ice: very low drag — heading velocity persists (drifty)
        const drag = icy ? this.headingDrag * 0.2 : this.headingDrag;
        this.headingVelocity *= 1 - drag * dt;
        if (Math.abs(this.headingVelocity) < 0.05) this.headingVelocity = 0;
      }

      this.heading += this.headingVelocity * dt;

      // Return heading toward straight downhill when not steering
      // Ice: very slow centering — penguin keeps sliding at an angle
      if (steerDir === 0) {
        const center = icy ? this.headingCenter * 0.2 : this.headingCenter;
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

    // --- Sprite frame selection ---
    // Ground: 0=neutral/tuck, 1=spread (brake)
    // Air: 1=default (spread), 0=tuck held
    // Death: 1
    if (!this.isDead) {
      if (this.isAirborne) {
        this.penguin.setFrame(tucked ? 0 : 1);
      } else {
        this.penguin.setFrame(spread ? 1 : 0);
      }
    }

    // --- Check if penguin overlaps any obstacle (skip trail) ---
    const inObstacle = !this.isAirborne && this.spawner.getObjects().some(
      (obj) => this.spawner.checkCollision(
        this.penguin.x, this.penguin.y,
        this.penguin.displayWidth * 0.7, this.penguin.displayHeight * 0.7, obj,
      ),
    );

    // --- Effects (snow spray + ski trail) ---
    this.effects.update(dt, this.penguin.x, this.penguin.y, this.heading, this.scrollSpeed, this.isAirborne, inObstacle);

    // --- Storm ---
    const meters = Math.floor(this.distanceTraveled / 18);
    const soloLevel = LEVEL_THRESHOLDS.length - 1;
    if (!this.stormStarted && this.music.level >= soloLevel) {
      this.stormStarted = true;
      this.stormStartMeters = meters;
      this.effects.startStorm();
    }
    if (this.stormStarted) {
      const intensity = Math.min(1, (meters - this.stormStartMeters) / 100);
      this.effects.setStormIntensity(intensity);
    }
    const windX = this.effects.getWindLateral();
    if (windX !== 0) {
      const windMul = this.isAirborne ? 5 : 1;
      this.penguin.x += windX * windMul * dt;
      this.penguinShadow.x = this.penguin.x;
    }

    // --- Camera follows penguin horizontally (freeze during fling) ---
    if (!this.flinging) {
      this.cameras.main.scrollX = this.penguin.x - width / 2;
    }

    // --- Scroll snow background with world ---
    this.snowBg.tilePositionX = this.cameras.main.scrollX;
    this.snowBg.tilePositionY += this.scrollSpeed * dt;

    // --- Spawn & scroll slope objects ---
    this.spawner.update(dt, this.scrollSpeed, this.distanceTraveled, this.penguin.x, windX);

    // --- Airborne flyover bonus ---
    if (this.isAirborne) {
      const px = this.penguin.x;
      const py = this.penguin.y;
      const pw = this.penguin.displayWidth * 0.7;
      const ph = this.penguin.displayHeight * 0.7;
      for (const obj of this.spawner.getObjects()) {
        if (obj.hit) continue;
        if (obj.type !== "rock" && obj.type !== "tree") continue;
        if (!this.spawner.checkCollision(px, py, pw, ph, obj)) continue;
        const pts = 50 * Math.max(1, this.combo);
        this.score += pts;
        this.showStatusText(`FLYOVER +${pts}`, "#a78bfa");
        this.spawner.markHit(obj);
      }
    }

    // --- Collisions ---
    if (!this.isAirborne) {
      const px = this.penguin.x;
      const py = this.penguin.y;
      const pw = this.penguin.displayWidth * 0.7;
      const ph = this.penguin.displayHeight * 0.7;
      for (const obj of this.spawner.getObjects()) {
        if (!this.spawner.checkCollision(px, py, pw, ph, obj)) continue;
        if (obj.hit) {
          // Continuous effects while penguin overlaps hit objects
          if (obj.type === "tree") {
            this.effects.burstTreeHit(obj.sprite.x, obj.sprite.y, px, py);
            this.spawner.redrawTree(obj);
          } else if (obj.type === "ice") {
            this.slipperyTimer = 2.5;
          }
          continue;
        }
        this.handleCollision(obj);
        if (this.gameOver) return;
      }
    }

    // --- Update airborne state ---
    if (this.isAirborne) {
      this.airTime += dt;
      const progress = this.airTime / this.airDuration;
      const arc = 1 - (2 * progress - 1) ** 2;
      this.penguinAirHeight = arc * 80;
      this.penguin.y = height * 0.25 - this.penguinAirHeight;
      this.penguin.setScale(1 + arc * 0.3);
      this.penguinShadow.setScale(1 - arc * 0.3);
      this.penguinShadow.setAlpha(0.2 * (1 - arc * 0.5));

      const rotRemaining = this.targetTrickRotation - this.currentTrickRotation;
      if (Math.abs(rotRemaining) > 0.01) {
        // Constant speed: full 2π rotation takes 0.8s
        const rotSpeed = (Math.PI * 2) / 0.8;
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

    // --- UI ---
    this.scoreText.setText(`Score: ${this.score}`);
    const distStr = meters >= 1000
      ? `${(meters / 1000).toFixed(1)} km`
      : `${meters} m`;
    this.distText.setText(distStr);
    this.speedText.setText(`${Math.floor(this.scrollSpeed * 0.2)} km/h`);
    this.comboText.setText(this.combo > 1 ? `x${this.combo} combo` : "");

    if (this.slipperyTimer > 0) {
      this.effectText.setText("ICY!");
      this.effectText.setColor("#0ea5e9");
      this.effectText.setAlpha(0.8);
    } else if (this.snowdriftTimer > 0) {
      this.effectText.setText("DRAG!");
      this.effectText.setColor("#94a3b8");
      this.effectText.setAlpha(0.8);
    } else {
      this.effectText.setAlpha(0);
    }

    this.inputHandler.setAirborne(this.isAirborne);
    this.music.updateDistance(meters);
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
          this.trickScore += 50 * (this.trickQueue.length - 1);
        }

        this.showTrickText(trick.name);
      }
    }

    // Spin: left/right arrows add continuous rotation
    const spinDir = this.inputHandler.getSpinDir();
    if (spinDir !== 0) {
      this.spinRotation += spinDir * Math.PI * 2 * dt;
    }

    // Passive air drift from heading at launch (reduced rate)
    this.penguin.x += Math.sin(this.heading) * this.scrollSpeed * this.lateralFactor * 0.5 * dt;
    this.penguinShadow.x = this.penguin.x;
  }

  private land(): void {
    this.isAirborne = false;
    this.penguin.setDepth(5);
    this.penguin.y = this.scale.height * 0.25;
    this.penguin.setScale(1);
    this.penguin.setRotation(-this.heading);
    this.penguinShadow.setScale(1);
    this.penguinShadow.setAlpha(0.2);
    this.penguinAirHeight = 0;

    const rotDiff = Math.abs(this.currentTrickRotation - this.targetTrickRotation);

    // Award spin points (50 per half rotation)
    const spinHalves = Math.floor(Math.abs(this.spinRotation) / Math.PI);
    const spinPoints = spinHalves * 100;
    this.trickScore += spinPoints;

    if (this.trickQueue.length > 0 || spinPoints > 0) {
      if (rotDiff < 0.5) {
        // Clean landing — icy jump doubles trick score
        const comboMultiplier = Math.max(1, this.combo);
        const icyMultiplier = this.icyLaunch ? 2 : 1;
        const points = this.trickScore * comboMultiplier * icyMultiplier;
        this.score += points;
        this.combo++;
        this.effects.burstTrickLanding(this.penguin.x, this.penguin.y);
        if (this.icyLaunch) {
          this.showStatusText(`ICY COMBO +${points}`, "#06b6d4");
        } else {
          this.showStatusText(`+${points}`, "#10b981");
        }
      } else if (rotDiff < 1.2) {
        // Sloppy landing — no points, but don't reset combo
        this.showStatusText("SLOPPY!", "#f59e0b");
      } else {
        // Crash — too far off
        this.combo = 0;
        this.effects.burstCrashLanding(this.penguin.x, this.penguin.y);
        this.penguinBounce();
        this.showStatusText("CRASH!", "#ef4444");
        // Lock tucked frame briefly during crash
        this.isDead = true;
        this.penguin.setFrame(0);
        this.time.delayedCall(500, () => {
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
    const baseDuration = duration ?? 1.2 + (this.scrollSpeed - 200) * 0.002;
    let dur = this.icyLaunch ? baseDuration * 1.5 : baseDuration;
    if (this.stormStarted) dur *= 1.3;
    this.airDuration = dur;
    this.trickQueue = [];
    this.trickScore = 0;
    this.currentTrickRotation = 0;
    this.targetTrickRotation = 0;
    this.spinRotation = 0;
    if (this.icyLaunch) {
      this.showStatusText("ICY JUMP!", "#06b6d4");
    } else if (!duration) {
      this.showStatusText("AIR!", "#3b82f6");
    }
  }

  private handleCollision(obj: SlopeObject): void {
    switch (obj.type) {
      case "rock":
        if (this.invincible) break;
        this.lives--;
        this.livesText.setText("\uD83D\uDC27".repeat(Math.max(0, this.lives)));
        this.effects.burstDeath(this.penguin.x, this.penguin.y);
        if (this.lives <= 0) {
          this.endGame();
        } else {
          this.flingPenguin(obj);
        }
        break;

      case "tree": {
        // Center hit = huge decel, grazing = small nudge
        const dx = Math.abs(this.penguin.x - obj.sprite.x);
        const maxDx = (obj.width + this.penguin.displayWidth) * 0.35;
        const centeredness = 1 - Phaser.Math.Clamp(dx / maxDx, 0, 1);
        // grazing: -30, dead center: -300
        const decel = 30 + centeredness * 270;
        this.scrollSpeed = Math.max(0, this.scrollSpeed - decel);
        this.combo = 0;
        this.effects.burstTreeHit(obj.sprite.x, obj.sprite.y, this.penguin.x, this.penguin.y);
        this.cameras.main.shake(150, 0.005);
        this.showStatusText("HIT!", "#ef4444");
        // Redraw tree so it renders above trail marks, with a shake
        this.spawner.redrawTree(obj);
        this.spawner.markHit(obj);
        break;
      }

      case "snowdrift":
        this.snowdriftTimer = 1.2;
        this.effects.burstSnowdrift(obj.sprite.x, obj.sprite.y);
        this.showStatusText("SNOW!", "#94a3b8");
        this.spawner.markHit(obj);
        break;

      case "ice": {
        this.slipperyTimer = 2.5;
        const cap = (SPEED_PROFILES[this.level] ?? SPEED_PROFILES[1]).cap;
        this.scrollSpeed = Math.min(this.scrollSpeed + 40, cap);
        const icePoints = 25 * Math.max(1, this.combo);
        this.score += icePoints;
        this.combo++;
        this.effects.startIceSparkle();
        this.showStatusText(`ICE +${icePoints}`, "#0ea5e9");
        this.spawner.markHit(obj);
        break;
      }

      case "mogul":
        this.launch(0.5);
        this.spawner.markHit(obj);
        break;

      case "ramp":
        this.launch();
        this.spawner.markHit(obj);
        break;

      case "fish":
        this.score += 10;
        this.effects.burstFishCollected(obj.sprite.x, obj.sprite.y);
        this.spawner.removeObject(obj);
        break;
    }
  }

  private flingPenguin(obj: SlopeObject): void {
    this.invincible = true;
    this.flinging = true;
    this.isDead = true;
    this.combo = 0;
    this.penguin.setFrame(1);
    this.cameras.main.shake(300, 0.015);

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
    this.penguin.y = height * 0.25;
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
    this.time.delayedCall(2000, () => {
      flashTimer.destroy();
      this.penguin.setAlpha(1);
      this.invincible = false;
    });
  }

  private endGame(): void {
    this.gameOver = true;
    this.isDead = true;
    this.penguin.setFrame(1);
    this.music.onGameOver();
    this.cameras.main.shake(400, 0.02);

    // Spin and tumble slightly in the opposite direction
    const spinDir = this.heading >= 0 ? -1 : 1;
    this.tweens.add({
      targets: this.penguin,
      x: this.penguin.x + spinDir * 40,
      rotation: this.penguin.rotation + spinDir * Math.PI * 16,
      duration: 800,
      ease: "Cubic.easeOut",
    });

    const dist = Math.floor(this.distanceTraveled / 18);
    const distStr = dist >= 1000 ? (dist / 1000).toFixed(1) + " km" : dist + " m";
    const isNewBest = saveScore(this.level, this.score, dist);
    const bestLine = isNewBest ? "NEW BEST!\n" : "";
    const stats = `${bestLine}Score: ${this.score}  |  ${distStr}`;

    // Short delay so death animation plays before menu appears
    this.time.delayedCall(600, () => {
      this.showMenu(`GAME OVER\n\n${stats}`, [
        { label: "RETRY", action: () => this.restartGame() },
        { label: "QUIT", action: () => {
          this.hidePauseMenu();
          this.music.onRestart();
          this.effects.destroy();
          this.spawner.destroyAll();
          this.inputHandler.reset();
          this.scene.start("Boot");
        }},
      ]);
    });
  }

  private restartGame(): void {
    this.hidePauseMenu();
    this.music.onRestart();
    this.effects.destroy();
    this.spawner.destroyAll();
    this.inputHandler.reset();
    this.scene.restart({ level: this.level });
  }

  private togglePause(): void {
    if (this.gameOver) {
      if (this.menuOnBack) this.menuOnBack();
      return;
    }
    if (this.paused) {
      this.hidePauseMenu();
      this.paused = false;
      this.music.resume();
    } else {
      this.paused = true;
      this.music.pause();
      this.showPauseMenu();
    }
  }

  private showPauseMenu(): void {
    this.showMenu("PAUSED", [
      { label: "RESUME", action: () => this.togglePause() },
      {
        label: "QUIT", action: () => {
          this.hidePauseMenu();
          this.music.onRestart();
          this.effects.destroy();
          this.spawner.destroyAll();
          this.inputHandler.reset();
          this.scene.start("Boot");
        },
      },
    ], () => this.togglePause());
  }

  private menuCursor = 0;
  private menuItems: { label: string; action: () => void }[] = [];
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private menuKeys: Phaser.Input.Keyboard.Key[] = [];
  private menuOnBack: (() => void) | null = null;

  private showMenu(
    title: string,
    items: { label: string; action: () => void }[],
    onBack?: () => void,
  ): void {
    const { width, height } = this.scale;
    this.menuCursor = 0;
    this.menuItems = items;
    this.menuTexts = [];
    this.menuOnBack = onBack ?? null;

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    bg.setDepth(50).setScrollFactor(0);

    const titleText = this.add
      .text(width / 2, height * 0.28, title, {
        fontSize: "36px",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(51)
      .setScrollFactor(0);

    const children: Phaser.GameObjects.GameObject[] = [bg, titleText];
    const startY = height * 0.42;
    const gap = 52;
    const hitPad = 16;

    for (let i = 0; i < items.length; i++) {
      const txt = this.add
        .text(width / 2, startY + i * gap, items[i].label, {
          fontSize: "22px",
          color: "#9ca3af",
          fontFamily: "system-ui, sans-serif",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(51)
        .setScrollFactor(0);
      // Enlarged touch target
      txt.setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Rectangle(
          -hitPad, -hitPad,
          txt.width + hitPad * 2,
          txt.height + hitPad * 2,
        ),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      });
      txt.on("pointerdown", () => {
        this.menuCursor = i;
        this.updateMenuHighlight();
        items[i].action();
      });
      txt.on("pointerover", () => {
        this.menuCursor = i;
        this.updateMenuHighlight();
      });
      this.menuTexts.push(txt);
      children.push(txt);
    }

    this.updateMenuHighlight();

    this.pauseOverlay = this.add.container(0, 0, children);
    this.pauseOverlay.setDepth(50);

    // Keyboard navigation
    if (this.input.keyboard) {
      const upKey = this.input.keyboard.addKey("UP");
      const downKey = this.input.keyboard.addKey("DOWN");
      const enterKey = this.input.keyboard.addKey("ENTER");
      const spaceKey = this.input.keyboard.addKey("SPACE");
      const wKey = this.input.keyboard.addKey("W");
      const sKey = this.input.keyboard.addKey("S");

      const rKey = this.input.keyboard.addKey("R");
      const qKey = this.input.keyboard.addKey("Q");

      upKey.on("down", this.menuUp, this);
      wKey.on("down", this.menuUp, this);
      downKey.on("down", this.menuDown, this);
      sKey.on("down", this.menuDown, this);
      enterKey.on("down", this.menuSelect, this);
      spaceKey.on("down", this.menuSelect, this);
      rKey.on("down", () => this.menuAction("RETRY"));
      qKey.on("down", () => this.menuAction("QUIT"));

      this.menuKeys = [upKey, downKey, enterKey, spaceKey, wKey, sKey, rKey, qKey];
    }
  }

  private menuUp(): void {
    this.menuCursor = (this.menuCursor - 1 + this.menuItems.length) % this.menuItems.length;
    this.updateMenuHighlight();
  }

  private menuDown(): void {
    this.menuCursor = (this.menuCursor + 1) % this.menuItems.length;
    this.updateMenuHighlight();
  }

  private menuSelect(): void {
    if (this.menuItems[this.menuCursor]) {
      this.menuItems[this.menuCursor].action();
    }
  }

  private menuAction(label: string): void {
    const item = this.menuItems.find((i) => i.label === label);
    if (item) item.action();
  }

  private updateMenuHighlight(): void {
    for (let i = 0; i < this.menuTexts.length; i++) {
      if (i === this.menuCursor) {
        this.menuTexts[i].setColor("#ffffff");
        this.menuTexts[i].setText("\u25B6 " + this.menuItems[i].label);
      } else {
        this.menuTexts[i].setColor("#9ca3af");
        this.menuTexts[i].setText("  " + this.menuItems[i].label);
      }
    }
  }

  private hidePauseMenu(): void {
    // Clean up keyboard bindings
    for (const key of this.menuKeys) {
      key.removeAllListeners();
      this.input.keyboard?.removeKey(key);
    }
    this.menuKeys = [];
    this.menuTexts = [];
    this.menuItems = [];
    this.menuOnBack = null;

    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
  }

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

  private showTrickText(text: string): void {
    this.trickText.setText(text);
    this.trickText.setAlpha(1);
    this.tweens.add({
      targets: this.trickText,
      alpha: 0,
      duration: 800,
      ease: "Power2",
    });
  }

  private showStatusText(text: string, color: string): void {
    this.statusText.setText(text);
    this.statusText.setColor(color);
    this.statusText.setAlpha(1);
    this.tweens.add({
      targets: this.statusText,
      alpha: 0,
      y: this.scale.height * 0.55,
      duration: 1000,
      ease: "Power2",
      onComplete: () => {
        this.statusText.y = this.scale.height * 0.6;
      },
    });
  }
}
