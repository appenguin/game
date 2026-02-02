import Phaser from "phaser";

interface TrailSegment {
  mark: Phaser.GameObjects.Rectangle;
  age: number;
}

interface Snowflake {
  obj: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  size: number;
}

/**
 * Visual effects: snow spray, ski trail, event particle bursts,
 * ice sparkle, and background snowfall.
 */
export class Effects {
  private scene: Phaser.Scene;

  // Snow spray
  private snowEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

  // Event burst emitters (all emitting: false, burst-only)
  private goldEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private redEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private yellowEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private grayEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private cyanEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private whiteEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private treeSnowEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  // Ski trail
  private trailSegments: TrailSegment[] = [];
  private trailTimer = 0;

  // Ice sparkle state
  private iceSparkleActive = false;
  private iceSparkleTimer = 0;

  // Storm state
  private stormOverlay: Phaser.GameObjects.Rectangle;
  private snowflakes: Snowflake[] = [];
  private stormActive = false;
  private stormIntensity = 0;
  private windTime = 0;
  private windLateral = 0;
  private stormSpawnTimer = 0;
  private readonly MAX_WIND = 160;
  private readonly MAX_SNOWFLAKES = 500;

  // Trail constants
  private readonly TRAIL_INTERVAL = 0.012;
  private readonly TRAIL_MAX_AGE = 2.5;
  private readonly TRAIL_MAX_SEGMENTS = 200;
  private readonly TRAIL_ALPHA = 0.35;

  constructor(scene: Phaser.Scene, penguin: { x: number; y: number }) {
    this.scene = scene;

    // --- Snow spray (existing) ---
    this.snowEmitter = scene.add.particles(penguin.x, penguin.y + 12, "snow-particle", {
      speed: { min: 30, max: 80 },
      scale: { start: 1.2, end: 0.3 },
      alpha: { start: 0.8, end: 0 },
      lifespan: { min: 300, max: 500 },
      emitting: false,
      angle: { min: 220, max: 320 },
    });
    this.snowEmitter.setDepth(3);

    // --- Landing burst (snow, same as spray) ---
    this.goldEmitter = scene.add.particles(0, 0, "snow-particle", {
      speed: { min: 60, max: 140 },
      scale: { start: 1.4, end: 0.2 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 400, max: 700 },
      emitting: false,
      angle: { min: 200, max: 340 },
    });
    this.goldEmitter.setDepth(6);

    // --- Crash landing burst (snow) ---
    this.redEmitter = scene.add.particles(0, 0, "snow-particle", {
      speed: { min: 50, max: 120 },
      scale: { start: 1.3, end: 0.2 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 300, max: 600 },
      emitting: false,
      angle: { min: 0, max: 360 },
    });
    this.redEmitter.setDepth(6);

    // --- Yellow sparkle (fish collected) ---
    this.yellowEmitter = scene.add.particles(0, 0, "yellow-particle", {
      speed: { min: 40, max: 100 },
      scale: { start: 1.2, end: 0.1 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 300, max: 500 },
      emitting: false,
      angle: { min: 0, max: 360 },
    });
    this.yellowEmitter.setDepth(6);

    // --- Gray burst (death) ---
    this.grayEmitter = scene.add.particles(0, 0, "gray-particle", {
      speed: { min: 60, max: 160 },
      scale: { start: 1.5, end: 0.3 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 400, max: 800 },
      emitting: false,
      angle: { min: 0, max: 360 },
    });
    this.grayEmitter.setDepth(6);

    // --- Cyan sparkle (ice trail) ---
    this.cyanEmitter = scene.add.particles(0, 0, "cyan-particle", {
      speed: { min: 10, max: 40 },
      scale: { start: 1.0, end: 0.2 },
      alpha: { start: 0.7, end: 0 },
      lifespan: { min: 200, max: 400 },
      emitting: false,
      angle: { min: 200, max: 340 },
    });
    this.cyanEmitter.setDepth(3);

    // --- White puff (snowdrift) ---
    this.whiteEmitter = scene.add.particles(0, 0, "white-particle", {
      speed: { min: 30, max: 80 },
      scale: { start: 1.4, end: 0.3 },
      alpha: { start: 0.7, end: 0 },
      lifespan: { min: 300, max: 500 },
      emitting: false,
      angle: { min: 220, max: 320 },
    });
    this.whiteEmitter.setDepth(3);

    // --- Tree hit snow burst (white, small, lots of particles) ---
    this.treeSnowEmitter = scene.add.particles(0, 0, "white-particle", {
      speed: { min: 30, max: 100 },
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 0.95, end: 0 },
      lifespan: { min: 350, max: 650 },
      emitting: false,
      angle: { min: 0, max: 360 },
    });
    this.treeSnowEmitter.setDepth(6);

    // --- Storm visibility overlay ---
    const { width: sw, height: sh } = scene.scale;
    this.stormOverlay = scene.add.rectangle(sw / 2, sh / 2, sw, sh, 0xffffff, 0);
    this.stormOverlay.setScrollFactor(0);
    this.stormOverlay.setDepth(9);

  }

  update(
    dt: number,
    penguinX: number,
    penguinY: number,
    heading: number,
    scrollSpeed: number,
    isAirborne: boolean,
    inTree = false,
  ): void {
    this.updateSnowSpray(penguinX, penguinY, heading, scrollSpeed, isAirborne, dt);
    this.updateTrail(dt, penguinX, penguinY, scrollSpeed, isAirborne || inTree);
    this.updateIceSparkle(dt, penguinX, penguinY, isAirborne);
    this.updateStorm(dt, penguinX);
  }

  // --- Public burst methods ---

  burstTrickLanding(x: number, y: number): void {
    this.goldEmitter.setPosition(x, y);
    this.goldEmitter.emitParticle(12);
  }

  burstCrashLanding(x: number, y: number): void {
    this.redEmitter.setPosition(x, y);
    this.redEmitter.emitParticle(15);
  }

  burstFishCollected(x: number, y: number): void {
    this.yellowEmitter.setPosition(x, y);
    this.yellowEmitter.emitParticle(6);
  }

  burstDeath(x: number, y: number): void {
    this.grayEmitter.setPosition(x, y);
    this.grayEmitter.emitParticle(20);
  }

  burstSnowdrift(x: number, y: number): void {
    this.whiteEmitter.setPosition(x, y);
    this.whiteEmitter.emitParticle(8);
  }

  burstTreeHit(treeX: number, treeY: number, penguinX: number, penguinY: number): void {
    // Snow from the tree
    this.treeSnowEmitter.setPosition(treeX, treeY);
    this.treeSnowEmitter.emitParticle(20);
    // Snow from under the penguin on impact
    this.treeSnowEmitter.setPosition(penguinX, penguinY + 10);
    this.treeSnowEmitter.emitParticle(10);
  }

  startIceSparkle(): void {
    this.iceSparkleActive = true;
  }

  stopIceSparkle(): void {
    this.iceSparkleActive = false;
  }

  // --- Private update helpers ---

  private snowTimer = 0;

  private updateSnowSpray(
    penguinX: number,
    penguinY: number,
    heading: number,
    scrollSpeed: number,
    isAirborne: boolean,
    dt: number,
  ): void {
    this.snowEmitter.setPosition(penguinX, penguinY + 12);
    this.snowEmitter.setRotation(-heading);

    if (isAirborne || scrollSpeed < 10) return;

    // Faster = more frequent bursts with more particles
    const speedRatio = Phaser.Math.Clamp((scrollSpeed - 100) / 500, 0, 1);
    const interval = 0.08 - speedRatio * 0.05; // 80ms to 30ms
    const qty = 1 + Math.floor(speedRatio * 4);  // 1 to 5

    this.snowTimer += dt;
    if (this.snowTimer >= interval) {
      this.snowTimer -= interval;
      this.snowEmitter.emitParticle(qty);
    }
  }

  private updateIceSparkle(
    dt: number,
    penguinX: number,
    penguinY: number,
    isAirborne: boolean,
  ): void {
    if (!this.iceSparkleActive || isAirborne) return;

    this.iceSparkleTimer += dt;
    if (this.iceSparkleTimer >= 0.06) {
      this.iceSparkleTimer -= 0.06;
      this.cyanEmitter.setPosition(
        penguinX + Phaser.Math.Between(-8, 8),
        penguinY + Phaser.Math.Between(4, 14),
      );
      this.cyanEmitter.emitParticle(1);
    }
  }

  private updateTrail(
    dt: number,
    penguinX: number,
    penguinY: number,
    scrollSpeed: number,
    isAirborne: boolean,
  ): void {
    // Age, scroll, and fade existing segments
    for (let i = this.trailSegments.length - 1; i >= 0; i--) {
      const seg = this.trailSegments[i];
      seg.age += dt;
      seg.mark.y -= scrollSpeed * dt;

      if (seg.age >= this.TRAIL_MAX_AGE || seg.mark.y < -20) {
        seg.mark.destroy();
        this.trailSegments.splice(i, 1);
      } else {
        const alpha = this.TRAIL_ALPHA * (1 - seg.age / this.TRAIL_MAX_AGE);
        seg.mark.setAlpha(alpha);
      }
    }

    // Only spawn new segments on the ground
    if (isAirborne) {
      this.trailTimer = 0;
      return;
    }

    this.trailTimer += dt;
    if (this.trailTimer < this.TRAIL_INTERVAL) return;
    this.trailTimer -= this.TRAIL_INTERVAL;

    const markY = penguinY + 14;

    // Recycle oldest if at cap
    if (this.trailSegments.length >= this.TRAIL_MAX_SEGMENTS) {
      const oldest = this.trailSegments.shift()!;
      oldest.mark.destroy();
    }

    // Height covers actual frame distance to avoid gaps
    // TODO: trail still shows gaps at high speed — revisit with a continuous line/graphics approach
    const markH = Math.max(10, scrollSpeed * dt * 2);
    const mark = this.scene.add.rectangle(
      penguinX, markY, 18, markH, 0xb0c4de, this.TRAIL_ALPHA,
    );
    mark.setDepth(0);

    this.trailSegments.push({ mark, age: 0 });
  }

  // --- Storm methods ---

  startStorm(): void {
    this.stormActive = true;
  }

  setStormIntensity(intensity: number): void {
    this.stormIntensity = Phaser.Math.Clamp(intensity, 0, 1);
    this.stormOverlay.setAlpha(this.stormIntensity * 0.15);
  }

  getWindLateral(): number {
    return this.windLateral;
  }

  private updateStorm(dt: number, _penguinX: number): void {
    if (!this.stormActive) return;

    const { width, height } = this.scene.scale;

    // Advance wind time and compute organic gust direction
    this.windTime += dt;
    const windAngle =
      Math.sin(this.windTime * 0.7) * 0.8 +
      Math.sin(this.windTime * 1.9) * 0.4;
    this.windLateral = Math.sin(windAngle) * this.stormIntensity * this.MAX_WIND;

    // Wind velocity for snowflakes (screen-space px/s)
    const windVx = this.windLateral * 5;
    const windVy = 200 + this.stormIntensity * 200;

    // Spawn new snowflakes
    const targetCount = Math.floor(this.stormIntensity * this.MAX_SNOWFLAKES);
    this.stormSpawnTimer += dt;
    if (this.stormSpawnTimer >= 0.02 && this.snowflakes.length < targetCount) {
      this.stormSpawnTimer = 0;
      const batch = Math.min(12, targetCount - this.snowflakes.length);
      for (let i = 0; i < batch; i++) {
        const fast = Math.random() < 0.5;
        const size = fast ? 0.8 + Math.random() * 1.5 : 1 + Math.random() * 2.5;
        const alpha = fast ? 0.2 + Math.random() * 0.3 : 0.3 + Math.random() * 0.4;
        const speedMul = fast ? 1.8 + Math.random() * 0.4 : 0.6 + Math.random() * 0.4;
        const obj = this.scene.add.circle(
          Math.random() * width,
          Math.random() * height,
          size, 0xe2e8f0, alpha,
        );
        obj.setScrollFactor(0);
        obj.setDepth(9);
        this.snowflakes.push({
          obj,
          vx: windVx * speedMul + (Math.random() - 0.5) * 100,
          vy: windVy * speedMul,
          size,
        });
      }
    }

    // Move snowflakes and recycle off-screen ones
    for (const flake of this.snowflakes) {
      // Gradually steer toward current wind direction
      flake.vx += (windVx - flake.vx) * 2 * dt;
      flake.obj.x += flake.vx * dt;
      flake.obj.y += flake.vy * dt;

      // Wrap around screen edges
      if (flake.obj.y > height + 10) {
        flake.obj.y = -10;
        flake.obj.x = Math.random() * width;
      }
      if (flake.obj.x > width + 30) {
        flake.obj.x = -20;
        flake.obj.y = Math.random() * height * 0.5;
      } else if (flake.obj.x < -30) {
        flake.obj.x = width + 20;
        flake.obj.y = Math.random() * height * 0.5;
      }
    }
  }

  destroy(): void {
    this.snowEmitter.destroy();
    this.goldEmitter.destroy();
    this.redEmitter.destroy();
    this.yellowEmitter.destroy();
    this.grayEmitter.destroy();
    this.cyanEmitter.destroy();
    this.whiteEmitter.destroy();
    this.treeSnowEmitter.destroy();
    for (const flake of this.snowflakes) flake.obj.destroy();
    this.snowflakes = [];
    this.stormOverlay.destroy();
    for (const seg of this.trailSegments) {
      seg.mark.destroy();
    }
    this.trailSegments = [];
    this.trailTimer = 0;
    this.iceSparkleActive = false;
    this.iceSparkleTimer = 0;
    this.stormActive = false;
    this.stormIntensity = 0;
    this.windTime = 0;
    this.windLateral = 0;
    this.stormSpawnTimer = 0;
  }
}
