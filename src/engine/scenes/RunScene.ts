import Phaser from "phaser";
import { type Trick, TRICKS, canQueueTrick } from "../../core/tricks";
import { getBaseSpeed } from "../../core/difficulty";
import { Input } from "../systems/Input";
import { Spawner, type SlopeObject } from "../systems/Spawner";

/**
 * Main gameplay scene: Ski or Die-style downhill.
 *
 * The penguin is near the top of the screen, sliding downhill.
 * Obstacles spawn ahead (bottom) and scroll upward past the penguin.
 * Ramps launch the penguin into the air for tricks.
 */
export class RunScene extends Phaser.Scene {
  // Penguin
  private penguin!: Phaser.GameObjects.Image;
  private penguinShadow!: Phaser.GameObjects.Ellipse;
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
  private slowTimer = 0;

  // Heading (angle-based steering with momentum)
  private heading = 0; // current angle (radians, 0 = straight down)
  private headingVelocity = 0; // angular velocity (rad/s)
  private readonly maxAngle = (Math.PI / 180) * 40; // ±40° max steering
  private readonly turnAccel = 6.0; // angular acceleration (rad/s²)
  private readonly maxTurnSpeed = 4.0; // max angular velocity (rad/s)
  private readonly headingDrag = 5.0; // angular velocity decay when no input
  private readonly headingCenter = 3.0; // heading return-to-center rate (when no input)
  private readonly lateralFactor = 1.6; // lateral speed = sin(heading) * scrollSpeed * factor

  // Difficulty level (0=Easy, 1=Medium, 2=Hard)
  private level = 1;

  // Speed & scoring
  private baseScrollSpeed = 200;
  private scrollSpeed = 200;
  private distanceTraveled = 0;
  private score = 0;
  private trickScore = 0;
  private combo = 0;
  private gameOver = false;

  // UI
  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private distText!: Phaser.GameObjects.Text;
  private trickText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private effectText!: Phaser.GameObjects.Text;

  // Systems
  private inputHandler!: Input;
  private spawner!: Spawner;

  constructor() {
    super("Run");
  }

  preload(): void {
    this.load.image("penguin", "penguin.png");
  }

  create(): void {
    const { width, height } = this.scale;

    // Read difficulty level from scene data
    const data = this.scene.settings.data as { level?: number } | undefined;
    this.level = data?.level ?? 1;

    // Reset state
    this.gameOver = false;
    this.score = 0;
    this.distanceTraveled = 0;
    this.combo = 0;
    this.trickScore = 0;
    this.isAirborne = false;
    this.baseScrollSpeed = 200;
    this.scrollSpeed = 200;
    this.heading = 0;
    this.headingVelocity = 0;
    this.slipperyTimer = 0;
    this.slowTimer = 0;

    this.cameras.main.setBackgroundColor("#f2f7ff");

    // Penguin shadow
    this.penguinShadow = this.add.ellipse(
      width / 2, height * 0.25, 36, 12, 0x000000, 0.2,
    );

    // Penguin
    this.penguin = this.add.image(width / 2, height * 0.25, "penguin");

    // UI — top bar
    const barH = 36;
    const levelNames = ["EASY", "MED", "HARD"];
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: "13px",
      color: "#ffffff",
      fontFamily: "system-ui, sans-serif",
      fontStyle: "bold",
    };

    this.add
      .rectangle(width / 2, barH / 2, width, barH, 0x1a1a2e, 0.45)
      .setDepth(10)
      .setScrollFactor(0);

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
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    const dt = delta / 1000;
    const { width, height } = this.scale;

    // Speed: base increases with distance, capped at 500
    this.baseScrollSpeed = getBaseSpeed(this.distanceTraveled, this.level);
    this.scrollSpeed = this.slowTimer > 0
      ? this.baseScrollSpeed * 0.5
      : this.baseScrollSpeed;
    this.distanceTraveled += this.scrollSpeed * dt;

    // Tick down status effects
    if (this.slipperyTimer > 0) this.slipperyTimer -= dt;
    if (this.slowTimer > 0) this.slowTimer -= dt;

    // --- Steering (angle-based with momentum) ---
    if (!this.isAirborne) {
      const steerDir = this.inputHandler.getSteerDir();
      const icy = this.slipperyTimer > 0;
      const accel = icy ? this.turnAccel * 0.35 : this.turnAccel;
      const drag = icy ? this.headingDrag * 0.5 : this.headingDrag;

      if (steerDir !== 0) {
        // Counter-steering (pressing opposite to current heading) gets a boost
        const counterSteer = (steerDir > 0 && this.heading < -0.05) ||
          (steerDir < 0 && this.heading > 0.05);
        const effectiveAccel = counterSteer ? accel * 2.0 : accel;
        this.headingVelocity += steerDir * effectiveAccel * dt;
        this.headingVelocity = Phaser.Math.Clamp(
          this.headingVelocity, -this.maxTurnSpeed, this.maxTurnSpeed,
        );
      } else {
        this.headingVelocity *= 1 - drag * dt;
        if (Math.abs(this.headingVelocity) < 0.05) this.headingVelocity = 0;
      }

      this.heading += this.headingVelocity * dt;

      // Return heading toward straight downhill when not steering
      if (steerDir === 0) {
        this.heading *= 1 - this.headingCenter * dt;
        if (Math.abs(this.heading) < 0.01) this.heading = 0;
      }

      this.heading = Phaser.Math.Clamp(this.heading, -this.maxAngle, this.maxAngle);

      this.penguin.x += Math.sin(this.heading) * this.scrollSpeed * this.lateralFactor * dt;
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

    // --- Camera follows penguin horizontally ---
    this.cameras.main.scrollX = this.penguin.x - width / 2;

    // --- Spawn & scroll slope objects ---
    this.spawner.update(dt, this.scrollSpeed, this.distanceTraveled, this.penguin.x);

    // --- Collisions ---
    if (!this.isAirborne) {
      const px = this.penguin.x;
      const py = this.penguin.y;
      const pw = this.penguin.displayWidth * 0.7;
      const ph = this.penguin.displayHeight * 0.7;
      for (const obj of this.spawner.getObjects()) {
        if (this.spawner.checkCollision(px, py, pw, ph, obj)) {
          this.handleCollision(obj);
          if (this.gameOver) return;
        }
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

      if (Math.abs(this.targetTrickRotation - this.currentTrickRotation) > 0.05) {
        const rotSpeed = 8;
        this.currentTrickRotation = Phaser.Math.Linear(
          this.currentTrickRotation,
          this.targetTrickRotation,
          rotSpeed * dt,
        );
      }
      this.penguin.setRotation(-this.heading + this.currentTrickRotation + this.spinRotation);

      if (this.airTime >= this.airDuration) {
        this.land();
      }
    }

    // --- UI ---
    this.scoreText.setText(`Score: ${this.score}`);
    const meters = Math.floor(this.distanceTraveled / 100);
    const distStr = meters >= 1000
      ? `${(meters / 1000).toFixed(1)} km`
      : `${meters} m`;
    this.distText.setText(distStr);
    this.speedText.setText(`${Math.floor(this.scrollSpeed / 10)} km/h`);
    this.comboText.setText(this.combo > 1 ? `x${this.combo} combo` : "");

    if (this.slipperyTimer > 0) {
      this.effectText.setText("ICY!");
      this.effectText.setAlpha(0.8);
    } else if (this.slowTimer > 0) {
      this.effectText.setText("SLOW");
      this.effectText.setColor("#94a3b8");
      this.effectText.setAlpha(0.8);
    } else {
      this.effectText.setAlpha(0);
    }

    this.inputHandler.setAirborne(this.isAirborne);
  }

  private handleAirTricks(dt: number): void {
    // Tricks: up/down only
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
    this.penguin.y = this.scale.height * 0.25;
    this.penguin.setScale(1);
    this.penguin.setRotation(-this.heading);
    this.penguinShadow.setScale(1);
    this.penguinShadow.setAlpha(0.2);
    this.penguinAirHeight = 0;

    const rotDiff = Math.abs(this.currentTrickRotation - this.targetTrickRotation);
    const landed = rotDiff < 0.5;

    if (this.trickQueue.length > 0) {
      if (landed) {
        const comboMultiplier = Math.max(1, this.combo);
        const points = this.trickScore * comboMultiplier;
        this.score += points;
        this.combo++;
        this.showStatusText(`+${points}`, "#10b981");
      } else {
        this.combo = 0;
        this.showStatusText("CRASH!", "#ef4444");
      }
    }

    this.trickQueue = [];
    this.trickScore = 0;
    this.currentTrickRotation = 0;
    this.targetTrickRotation = 0;
    this.spinRotation = 0;
  }

  private launch(duration?: number): void {
    this.isAirborne = true;
    this.airTime = 0;
    this.airDuration = duration ?? 1.2 + (this.scrollSpeed - 200) * 0.002;
    this.trickQueue = [];
    this.trickScore = 0;
    this.currentTrickRotation = 0;
    this.targetTrickRotation = 0;
    this.spinRotation = 0;
    if (!duration) {
      this.showStatusText("AIR!", "#3b82f6");
    }
  }

  private handleCollision(obj: SlopeObject): void {
    switch (obj.type) {
      case "rock":
      case "crevasse":
        this.score += Math.floor(this.distanceTraveled);
        this.endGame();
        break;

      case "tree":
        this.scrollSpeed *= 0.7;
        this.combo = 0;
        this.cameras.main.shake(200, 0.01);
        this.showStatusText("HIT!", "#ef4444");
        this.spawner.removeObject(obj);
        break;

      case "snowdrift":
        this.slowTimer = 1.2;
        this.showStatusText("SNOW!", "#94a3b8");
        this.spawner.removeObject(obj);
        break;

      case "ice":
        this.slipperyTimer = 1.0;
        this.spawner.removeObject(obj);
        break;

      case "mogul":
        this.launch(0.5);
        this.spawner.removeObject(obj);
        break;

      case "ramp":
        this.launch();
        this.spawner.removeObject(obj);
        break;

      case "fish":
        this.score += 10;
        this.spawner.removeObject(obj);
        break;
    }
  }

  private endGame(): void {
    this.gameOver = true;
    this.penguin.setTint(0xef4444);
    this.cameras.main.shake(400, 0.02);

    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.35, "GAME OVER", {
        fontSize: "36px",
        color: "#1a1a2e",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setScrollFactor(0);

    this.add
      .text(
        width / 2,
        height * 0.45,
        `Score: ${this.score}\nDistance: ${Math.floor(this.distanceTraveled / 100) >= 1000 ? (Math.floor(this.distanceTraveled / 100) / 1000).toFixed(1) + " km" : Math.floor(this.distanceTraveled / 100) + " m"}`,
        {
          fontSize: "22px",
          color: "#374151",
          fontFamily: "system-ui, sans-serif",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(10)
      .setScrollFactor(0);

    this.add
      .text(width / 2, height * 0.58, "Tap or press R to restart", {
        fontSize: "16px",
        color: "#6b7280",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setScrollFactor(0);

    this.inputHandler.bindRestart(() => this.restartGame());
    this.inputHandler.setGameOverTapHandler(() => this.restartGame());
  }

  private restartGame(): void {
    this.spawner.destroyAll();
    this.inputHandler.reset();
    this.scene.restart({ level: this.level });
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
