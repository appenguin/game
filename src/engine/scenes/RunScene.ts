import Phaser from "phaser";

/** Obstacle types on the slope */
interface SlopeObject {
  sprite: Phaser.GameObjects.Shape;
  type: "rock" | "tree" | "ramp" | "fish" | "ice" | "crevasse" | "mogul" | "snowdrift";
  width: number;
  height: number;
}

/** A trick performed mid-air */
interface Trick {
  name: string;
  points: number;
  rotation: number; // radians to rotate penguin
}

const TRICKS: Record<string, Trick> = {
  up: { name: "Backflip", points: 100, rotation: Math.PI * 2 },
  down: { name: "Front Tuck", points: 80, rotation: -Math.PI * 2 },
  left: { name: "Left Spin", points: 60, rotation: -Math.PI },
  right: { name: "Right Spin", points: 60, rotation: Math.PI },
};

/**
 * Main gameplay scene: Ski or Die-style downhill.
 *
 * The penguin is near the top of the screen, sliding downhill.
 * Obstacles spawn ahead (bottom) and scroll upward past the penguin.
 * Ramps launch the penguin into the air for tricks.
 */
export class RunScene extends Phaser.Scene {
  // Penguin
  private penguin!: Phaser.GameObjects.Rectangle;
  private penguinShadow!: Phaser.GameObjects.Ellipse;
  private penguinAirHeight = 0;
  private isAirborne = false;
  private airTime = 0;
  private airDuration = 0;
  private trickQueue: Trick[] = [];
  private currentTrickRotation = 0;
  private targetTrickRotation = 0;

  // Status effects
  private slipperyTimer = 0; // seconds remaining of reduced steering
  private slowTimer = 0; // seconds remaining of reduced speed

  // Slope objects
  private slopeObjects: SlopeObject[] = [];
  private spawnTimer = 0;
  private rampSpawnTimer = 0;

  // Speed & scoring
  private baseScrollSpeed = 200;
  private scrollSpeed = 200;
  private steerSpeed = 250;
  private distanceTraveled = 0;
  private score = 0;
  private trickScore = 0;
  private combo = 0;
  private gameOver = false;

  // UI
  private scoreText!: Phaser.GameObjects.Text;
  private trickText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private effectText!: Phaser.GameObjects.Text;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private touchSteerX = 0;
  private isTouching = false;
  private tiltEnabled = false;
  private tiltSteerX = 0;
  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;

  constructor() {
    super("Run");
  }

  create(): void {
    const { width, height } = this.scale;
    this.gameOver = false;
    this.score = 0;
    this.distanceTraveled = 0;
    this.combo = 0;
    this.trickScore = 0;
    this.isAirborne = false;
    this.slopeObjects = [];
    this.baseScrollSpeed = 200;
    this.scrollSpeed = 200;
    this.spawnTimer = 0;
    this.rampSpawnTimer = 0;
    this.slipperyTimer = 0;
    this.slowTimer = 0;

    this.cameras.main.setBackgroundColor("#dce8f0");

    // Penguin shadow
    this.penguinShadow = this.add.ellipse(
      width / 2, height * 0.28, 36, 12, 0x000000, 0.2,
    );

    // Penguin
    this.penguin = this.add.rectangle(
      width / 2, height * 0.25, 28, 36, 0x38bdf8,
    );
    this.penguin.setStrokeStyle(2, 0x1e6091);

    // UI
    this.scoreText = this.add
      .text(16, 16, "0", {
        fontSize: "20px",
        color: "#1a1a2e",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setDepth(10);

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
      .setAlpha(0);

    this.comboText = this.add
      .text(width - 16, 16, "", {
        fontSize: "18px",
        color: "#7c3aed",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
        align: "right",
      })
      .setOrigin(1, 0)
      .setDepth(10);

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
      .setAlpha(0);

    this.effectText = this.add
      .text(width / 2, height * 0.15, "", {
        fontSize: "16px",
        color: "#0ea5e9",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0);

    // Keyboard
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = {
        a: this.input.keyboard.addKey("A"),
        d: this.input.keyboard.addKey("D"),
        w: this.input.keyboard.addKey("W"),
        s: this.input.keyboard.addKey("S"),
        r: this.input.keyboard.addKey("R"),
      };
    }

    // Touch
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.isTouching = true;
      this.updateTouchSteer(pointer);
      if (this.gameOver) this.restartGame();
      this.requestTiltPermission();
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isTouching) this.updateTouchSteer(pointer);
    });
    this.input.on("pointerup", () => {
      this.isTouching = false;
      this.touchSteerX = 0;
    });

    // Tilt controls (non-iOS: enable immediately)
    this.initTilt();
  }

  private updateTouchSteer(pointer: Phaser.Input.Pointer): void {
    const { width } = this.scale;
    const third = width / 3;
    if (pointer.x < third) this.touchSteerX = -1;
    else if (pointer.x > third * 2) this.touchSteerX = 1;
    else this.touchSteerX = 0;
  }

  /** Set up tilt controls. On non-iOS, enable immediately. iOS needs user gesture. */
  private initTilt(): void {
    if (typeof DeviceOrientationEvent === "undefined") return;

    // iOS requires permission via requestPermission (user gesture needed)
    const doe = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>;
    };
    if (typeof doe.requestPermission === "function") {
      // iOS: defer to requestTiltPermission() called on first tap
      return;
    }

    // Non-iOS: enable immediately
    this.enableTilt();
  }

  /** Request iOS DeviceOrientation permission (must be called from user gesture) */
  private requestTiltPermission(): void {
    if (this.tiltEnabled) return;

    const doe = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>;
    };
    if (typeof doe.requestPermission !== "function") return;

    doe.requestPermission().then((state: string) => {
      if (state === "granted") this.enableTilt();
    });
  }

  /** Start listening for device orientation events */
  private enableTilt(): void {
    if (this.tiltEnabled) return;
    this.tiltEnabled = true;
    this.orientationHandler = (e: DeviceOrientationEvent) =>
      this.handleOrientation(e);
    window.addEventListener("deviceorientation", this.orientationHandler);
  }

  /** Map device gamma (left/right tilt) to -1..+1 steering */
  private handleOrientation(event: DeviceOrientationEvent): void {
    if (event.gamma === null) return;
    const clamped = Phaser.Math.Clamp(event.gamma, -30, 30);
    this.tiltSteerX = clamped / 30;
  }

  /** Difficulty zone based on distance */
  private getDifficulty(): number {
    if (this.distanceTraveled < 500) return 0;
    if (this.distanceTraveled < 1500) return 1;
    if (this.distanceTraveled < 3000) return 2;
    return 3;
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    const dt = delta / 1000;
    const { width, height } = this.scale;

    // Speed: base increases with distance, capped at 500
    this.baseScrollSpeed = Math.min(500, 200 + this.distanceTraveled * 0.04);
    // Apply slow effect
    this.scrollSpeed = this.slowTimer > 0
      ? this.baseScrollSpeed * 0.5
      : this.baseScrollSpeed;
    this.distanceTraveled += this.scrollSpeed * dt;

    // Tick down status effects
    if (this.slipperyTimer > 0) this.slipperyTimer -= dt;
    if (this.slowTimer > 0) this.slowTimer -= dt;

    // --- Steering (priority: keyboard > tilt > touch) ---
    let steerDir = 0;
    if (this.cursors?.left.isDown || this.keys?.a.isDown) steerDir = -1;
    else if (this.cursors?.right.isDown || this.keys?.d.isDown) steerDir = 1;
    else if (this.tiltEnabled && Math.abs(this.tiltSteerX) > 0.08) steerDir = this.tiltSteerX;
    else if (this.touchSteerX !== 0) steerDir = this.touchSteerX;

    if (!this.isAirborne) {
      const effectiveSteer = this.slipperyTimer > 0
        ? this.steerSpeed * 0.35
        : this.steerSpeed;
      this.penguin.x += steerDir * effectiveSteer * dt;
      const halfW = this.penguin.width / 2;
      this.penguin.x = Phaser.Math.Clamp(this.penguin.x, halfW + 8, width - halfW - 8);
      this.penguinShadow.x = this.penguin.x;

      // Slippery visual: tint penguin cyan
      if (this.slipperyTimer > 0) {
        this.penguin.setFillStyle(0x67e8f9);
      } else {
        this.penguin.setFillStyle(0x38bdf8);
      }
    } else {
      this.handleAirTricks(dt);
    }

    // --- Spawn slope objects ---
    const diff = this.getDifficulty();
    const spawnInterval = [0.5, 0.38, 0.28, 0.2][diff];
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnObstacle();
      this.spawnTimer = spawnInterval + Math.random() * spawnInterval;
    }

    const rampInterval = [2.5, 2.0, 1.8, 1.5][diff];
    this.rampSpawnTimer -= dt;
    if (this.rampSpawnTimer <= 0) {
      this.spawnRamp();
      this.rampSpawnTimer = rampInterval + Math.random() * rampInterval;
    }

    // --- Update slope objects ---
    for (let i = this.slopeObjects.length - 1; i >= 0; i--) {
      const obj = this.slopeObjects[i];
      obj.sprite.y -= this.scrollSpeed * dt;

      if (!this.isAirborne && this.checkCollision(obj)) {
        this.handleCollision(obj);
        if (this.gameOver) return;
      }

      if (obj.sprite.y < -50) {
        obj.sprite.destroy();
        this.slopeObjects.splice(i, 1);
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
        this.penguin.setRotation(this.currentTrickRotation);
      }

      if (this.airTime >= this.airDuration) {
        this.land();
      }
    }

    // --- UI ---
    this.scoreText.setText(
      `${Math.floor(this.distanceTraveled)}m  ${this.score}pts`,
    );
    this.comboText.setText(this.combo > 1 ? `x${this.combo} combo` : "");

    // Effect indicator
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
  }

  private handleAirTricks(dt: number): void {
    let trickKey = "";
    if (this.cursors?.up.isDown || this.keys?.w.isDown) trickKey = "up";
    else if (this.cursors?.down.isDown || this.keys?.s.isDown) trickKey = "down";
    else if (this.cursors?.left.isDown || this.keys?.a.isDown) trickKey = "left";
    else if (this.cursors?.right.isDown || this.keys?.d.isDown) trickKey = "right";

    if (this.touchSteerX < 0) trickKey = "left";
    if (this.touchSteerX > 0) trickKey = "right";

    if (trickKey && TRICKS[trickKey]) {
      const trick = TRICKS[trickKey];
      const alreadyQueued = this.trickQueue.some((t) => t.name === trick.name);
      const timeLeft = this.airDuration - this.airTime;
      if (!alreadyQueued && timeLeft > 0.4) {
        this.trickQueue.push(trick);
        this.targetTrickRotation += trick.rotation;
        this.trickScore += trick.points;

        if (this.trickQueue.length > 1) {
          this.trickScore += 50 * (this.trickQueue.length - 1);
        }

        this.showTrickText(trick.name);
      }
    }

    // Reduced air steering (same priority: keyboard > tilt > touch)
    const { width } = this.scale;
    let steerDir = 0;
    if (this.cursors?.left.isDown || this.keys?.a.isDown) steerDir = -1;
    else if (this.cursors?.right.isDown || this.keys?.d.isDown) steerDir = 1;
    else if (this.tiltEnabled && Math.abs(this.tiltSteerX) > 0.08) steerDir = this.tiltSteerX;
    else if (this.touchSteerX !== 0) steerDir = this.touchSteerX;
    this.penguin.x += steerDir * this.steerSpeed * 0.5 * dt;
    const halfW = this.penguin.width / 2;
    this.penguin.x = Phaser.Math.Clamp(this.penguin.x, halfW + 8, width - halfW - 8);
    this.penguinShadow.x = this.penguin.x;
  }

  private land(): void {
    this.isAirborne = false;
    this.penguin.y = this.scale.height * 0.25;
    this.penguin.setScale(1);
    this.penguin.setRotation(0);
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
  }

  private launch(duration?: number): void {
    this.isAirborne = true;
    this.airTime = 0;
    this.airDuration = duration ?? 1.2 + (this.scrollSpeed - 200) * 0.002;
    this.trickQueue = [];
    this.trickScore = 0;
    this.currentTrickRotation = 0;
    this.targetTrickRotation = 0;
    if (!duration) {
      this.showStatusText("AIR!", "#3b82f6");
    }
  }

  /** Check if a spawn position is clear of nearby objects */
  private isSpawnClear(x: number, y: number, minDist: number): boolean {
    for (const obj of this.slopeObjects) {
      const dx = obj.sprite.x - x;
      const dy = obj.sprite.y - y;
      if (dx * dx + dy * dy < minDist * minDist) return false;
    }
    return true;
  }

  private spawnObstacle(): void {
    const { width, height } = this.scale;
    const diff = this.getDifficulty();
    const spawnY = height + 30;

    // Pick x, ensure minimum spacing
    let x = 30 + Math.random() * (width - 60);
    let attempts = 0;
    while (!this.isSpawnClear(x, spawnY, 50) && attempts < 5) {
      x = 30 + Math.random() * (width - 60);
      attempts++;
    }

    // Weighted spawn table based on difficulty
    const roll = Math.random();

    if (diff === 0) {
      // Easy: fish heavy, some trees, rare rocks
      if (roll < 0.15) {
        this.spawnRock(x, spawnY);
      } else if (roll < 0.35) {
        this.spawnTree(x, spawnY);
      } else if (roll < 0.45) {
        this.spawnSnowdrift(x, spawnY);
      } else {
        this.spawnFish(x, spawnY);
      }
    } else if (diff === 1) {
      // Medium: ice patches, more rocks
      if (roll < 0.2) {
        this.spawnRock(x, spawnY);
      } else if (roll < 0.38) {
        this.spawnTree(x, spawnY);
      } else if (roll < 0.48) {
        this.spawnIcePatch(x, spawnY);
      } else if (roll < 0.55) {
        this.spawnSnowdrift(x, spawnY);
      } else if (roll < 0.62) {
        this.spawnCrevasse(x, spawnY);
      } else {
        this.spawnFish(x, spawnY);
      }
    } else if (diff === 2) {
      // Hard: moguls, crevasses, dense
      if (roll < 0.22) {
        this.spawnRock(x, spawnY);
      } else if (roll < 0.37) {
        this.spawnTree(x, spawnY);
      } else if (roll < 0.47) {
        this.spawnIcePatch(x, spawnY);
      } else if (roll < 0.55) {
        this.spawnCrevasse(x, spawnY);
      } else if (roll < 0.65) {
        this.spawnMogul(x, spawnY);
      } else if (roll < 0.72) {
        this.spawnSnowdrift(x, spawnY);
      } else {
        this.spawnFish(x, spawnY);
      }
    } else {
      // Expert: everything, high density
      if (roll < 0.25) {
        this.spawnRock(x, spawnY);
      } else if (roll < 0.37) {
        this.spawnTree(x, spawnY);
      } else if (roll < 0.47) {
        this.spawnCrevasse(x, spawnY);
      } else if (roll < 0.57) {
        this.spawnIcePatch(x, spawnY);
      } else if (roll < 0.67) {
        this.spawnMogul(x, spawnY);
      } else if (roll < 0.73) {
        this.spawnSnowdrift(x, spawnY);
      } else {
        this.spawnFish(x, spawnY);
      }
    }
  }

  // --- Spawn helpers ---

  private spawnRock(x: number, y: number): void {
    const rock = this.add.rectangle(x, y, 30, 30, 0x6b7280);
    rock.setStrokeStyle(2, 0x4b5563);
    this.slopeObjects.push({ sprite: rock, type: "rock", width: 30, height: 30 });
  }

  private spawnTree(x: number, y: number): void {
    const tree = this.add.triangle(x, y, 0, 0, 15, 30, 30, 0, 0x16a34a);
    this.slopeObjects.push({ sprite: tree, type: "tree", width: 30, height: 30 });
  }

  private spawnFish(x: number, y: number): void {
    // Occasionally spawn a cluster
    if (Math.random() < 0.25) {
      this.spawnFishCluster(x, y);
      return;
    }
    const fish = this.add.circle(x, y, 8, 0xf59e0b);
    this.slopeObjects.push({ sprite: fish, type: "fish", width: 16, height: 16 });
  }

  private spawnFishCluster(x: number, y: number): void {
    const { width } = this.scale;
    const count = 3 + Math.floor(Math.random() * 3); // 3-5 fish
    const spacing = 22;
    const startX = x - ((count - 1) * spacing) / 2;
    for (let i = 0; i < count; i++) {
      const fx = Phaser.Math.Clamp(startX + i * spacing, 16, width - 16);
      const fish = this.add.circle(fx, y + i * 12, 8, 0xf59e0b);
      this.slopeObjects.push({ sprite: fish, type: "fish", width: 16, height: 16 });
    }
  }

  private spawnIcePatch(x: number, y: number): void {
    const w = 60 + Math.random() * 40;
    const ice = this.add.rectangle(x, y, w, 20, 0xa5f3fc, 0.6);
    ice.setStrokeStyle(1, 0x67e8f9);
    this.slopeObjects.push({ sprite: ice, type: "ice", width: w, height: 20 });
  }

  private spawnCrevasse(x: number, y: number): void {
    const crevasse = this.add.rectangle(x, y, 14, 50, 0x1e293b);
    crevasse.setStrokeStyle(1, 0x0f172a);
    this.slopeObjects.push({ sprite: crevasse, type: "crevasse", width: 14, height: 50 });
  }

  private spawnMogul(x: number, y: number): void {
    const mogul = this.add.ellipse(x, y, 28, 16, 0xf1f5f9);
    mogul.setStrokeStyle(1, 0xcbd5e1);
    this.slopeObjects.push({ sprite: mogul, type: "mogul", width: 28, height: 16 });
  }

  private spawnSnowdrift(x: number, y: number): void {
    const drift = this.add.ellipse(x, y, 44, 18, 0xe2e8f0);
    drift.setStrokeStyle(1, 0xcbd5e1);
    this.slopeObjects.push({ sprite: drift, type: "snowdrift", width: 44, height: 18 });
  }

  private spawnRamp(): void {
    const { width, height } = this.scale;
    const x = 60 + Math.random() * (width - 120);
    const spawnY = height + 40;
    const ramp = this.add.triangle(x, spawnY, 0, 0, 50, 0, 25, 24, 0x60a5fa);
    ramp.setStrokeStyle(2, 0x3b82f6);
    this.slopeObjects.push({ sprite: ramp, type: "ramp", width: 50, height: 24 });
  }

  private checkCollision(obj: SlopeObject): boolean {
    const px = this.penguin.x;
    const py = this.penguin.y;
    const pw = this.penguin.width * 0.7;
    const ph = this.penguin.height * 0.7;

    const ox = obj.sprite.x;
    const oy = obj.sprite.y;
    const ow = obj.width * 0.7;
    const oh = obj.height * 0.7;

    return (
      Math.abs(px - ox) < (pw + ow) / 2 && Math.abs(py - oy) < (ph + oh) / 2
    );
  }

  private handleCollision(obj: SlopeObject): void {
    switch (obj.type) {
      case "rock":
        this.score += Math.floor(this.distanceTraveled);
        this.endGame();
        break;

      case "crevasse":
        this.score += Math.floor(this.distanceTraveled);
        this.endGame();
        break;

      case "tree":
        this.scrollSpeed *= 0.7;
        this.combo = 0;
        this.cameras.main.shake(200, 0.01);
        this.showStatusText("HIT!", "#ef4444");
        obj.sprite.destroy();
        this.slopeObjects.splice(this.slopeObjects.indexOf(obj), 1);
        break;

      case "snowdrift":
        this.slowTimer = 1.2;
        this.showStatusText("SNOW!", "#94a3b8");
        obj.sprite.destroy();
        this.slopeObjects.splice(this.slopeObjects.indexOf(obj), 1);
        break;

      case "ice":
        this.slipperyTimer = 1.0;
        obj.sprite.destroy();
        this.slopeObjects.splice(this.slopeObjects.indexOf(obj), 1);
        break;

      case "mogul":
        // Mini-launch: short air, enough for one quick trick
        this.launch(0.5);
        obj.sprite.destroy();
        this.slopeObjects.splice(this.slopeObjects.indexOf(obj), 1);
        break;

      case "ramp":
        this.launch();
        obj.sprite.destroy();
        this.slopeObjects.splice(this.slopeObjects.indexOf(obj), 1);
        break;

      case "fish":
        this.score += 10;
        obj.sprite.destroy();
        this.slopeObjects.splice(this.slopeObjects.indexOf(obj), 1);
        break;
    }
  }

  private endGame(): void {
    this.gameOver = true;
    this.penguin.setFillStyle(0xef4444);
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
      .setDepth(10);

    this.add
      .text(
        width / 2,
        height * 0.45,
        `Score: ${this.score}\nDistance: ${Math.floor(this.distanceTraveled)}m`,
        {
          fontSize: "22px",
          color: "#374151",
          fontFamily: "system-ui, sans-serif",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(10);

    this.add
      .text(width / 2, height * 0.58, "Tap or press R to restart", {
        fontSize: "16px",
        color: "#6b7280",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(10);

    if (this.input.keyboard) {
      this.input.keyboard.once("keydown-R", () => {
        this.restartGame();
      });
    }
  }

  private restartGame(): void {
    if (this.orientationHandler) {
      window.removeEventListener("deviceorientation", this.orientationHandler);
    }
    for (const obj of this.slopeObjects) {
      obj.sprite.destroy();
    }
    this.scene.restart();
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
