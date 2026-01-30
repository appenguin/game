import Phaser from "phaser";

interface TrailSegment {
  mark: Phaser.GameObjects.Rectangle;
  age: number;
}

/**
 * Visual effects: snow spray particles and ski trail behind the penguin.
 */
export class Effects {
  private scene: Phaser.Scene;

  // Snow spray
  private snowEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

  // Ski trail
  private trailSegments: TrailSegment[] = [];
  private trailTimer = 0;

  // Trail constants
  private readonly TRAIL_INTERVAL = 0.012;
  private readonly TRAIL_MAX_AGE = 2.5;
  private readonly TRAIL_MAX_SEGMENTS = 200;
  private readonly TRAIL_ALPHA = 0.35;

  constructor(scene: Phaser.Scene, penguin: Phaser.GameObjects.Image) {
    this.scene = scene;
    this.snowEmitter = scene.add.particles(penguin.x, penguin.y + 12, "snow-particle", {
      speed: { min: 30, max: 80 },
      scale: { start: 1.2, end: 0.3 },
      alpha: { start: 0.8, end: 0 },
      lifespan: { min: 300, max: 500 },
      emitting: false,
      angle: { min: 220, max: 320 },
    });
    this.snowEmitter.setDepth(3);
  }

  update(
    dt: number,
    penguinX: number,
    penguinY: number,
    heading: number,
    scrollSpeed: number,
    isAirborne: boolean,
  ): void {
    this.updateSnowSpray(penguinX, penguinY, heading, scrollSpeed, isAirborne, dt);
    this.updateTrail(dt, penguinX, penguinY, scrollSpeed, isAirborne);
  }

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
    mark.setDepth(1);

    this.trailSegments.push({ mark, age: 0 });
  }

  destroy(): void {
    this.snowEmitter.destroy();
    for (const seg of this.trailSegments) {
      seg.mark.destroy();
    }
    this.trailSegments = [];
    this.trailTimer = 0;
  }
}
