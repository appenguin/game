import Phaser from "phaser";
import {
  type SlopeObjectType,
  getDifficulty,
  getSpawnInterval,
  getRampInterval,
  pickObstacleType,
} from "../../core/difficulty";

/** An object on the slope (obstacle, collectible, or ramp) */
export interface SlopeObject {
  sprite: Phaser.GameObjects.Shape;
  type: SlopeObjectType;
  width: number;
  height: number;
}

/**
 * Manages spawning, scrolling, and cleanup of slope objects.
 */
export class Spawner {
  private scene: Phaser.Scene;
  private objects: SlopeObject[] = [];
  private spawnTimer = 0;
  private rampSpawnTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Main update: spawn, scroll, and cull objects */
  update(
    dt: number,
    scrollSpeed: number,
    distanceTraveled: number,
  ): void {
    const { width, height } = this.scene.scale;
    const diff = getDifficulty(distanceTraveled);

    // Spawn obstacles
    const spawnInterval = getSpawnInterval(diff);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnObstacle(width, height, diff);
      this.spawnTimer = spawnInterval + Math.random() * spawnInterval;
    }

    // Spawn ramps
    const rampInterval = getRampInterval(diff);
    this.rampSpawnTimer -= dt;
    if (this.rampSpawnTimer <= 0) {
      this.spawnRamp(width, height);
      this.rampSpawnTimer = rampInterval + Math.random() * rampInterval;
    }

    // Scroll and cull
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      obj.sprite.y -= scrollSpeed * dt;
      if (obj.sprite.y < -50) {
        obj.sprite.destroy();
        this.objects.splice(i, 1);
      }
    }
  }

  getObjects(): SlopeObject[] {
    return this.objects;
  }

  removeObject(obj: SlopeObject): void {
    obj.sprite.destroy();
    const idx = this.objects.indexOf(obj);
    if (idx !== -1) this.objects.splice(idx, 1);
  }

  destroyAll(): void {
    for (const obj of this.objects) {
      obj.sprite.destroy();
    }
    this.objects = [];
    this.spawnTimer = 0;
    this.rampSpawnTimer = 0;
  }

  /** AABB collision check between penguin rect and a slope object */
  checkCollision(
    px: number,
    py: number,
    pw: number,
    ph: number,
    obj: SlopeObject,
  ): boolean {
    const ox = obj.sprite.x;
    const oy = obj.sprite.y;
    const ow = obj.width * 0.7;
    const oh = obj.height * 0.7;
    return (
      Math.abs(px - ox) < (pw + ow) / 2 &&
      Math.abs(py - oy) < (ph + oh) / 2
    );
  }

  // --- Spawn logic ---

  private isSpawnClear(x: number, y: number, minDist: number): boolean {
    for (const obj of this.objects) {
      const dx = obj.sprite.x - x;
      const dy = obj.sprite.y - y;
      if (dx * dx + dy * dy < minDist * minDist) return false;
    }
    return true;
  }

  private spawnObstacle(screenWidth: number, screenHeight: number, diff: number): void {
    const spawnY = screenHeight + 30;

    let x = 30 + Math.random() * (screenWidth - 60);
    let attempts = 0;
    while (!this.isSpawnClear(x, spawnY, 50) && attempts < 5) {
      x = 30 + Math.random() * (screenWidth - 60);
      attempts++;
    }

    const type = pickObstacleType(diff);
    switch (type) {
      case "rock":
        this.spawnRock(x, spawnY);
        break;
      case "tree":
        this.spawnTree(x, spawnY);
        break;
      case "fish":
        this.spawnFish(x, spawnY, screenWidth);
        break;
      case "ice":
        this.spawnIcePatch(x, spawnY);
        break;
      case "crevasse":
        this.spawnCrevasse(x, spawnY);
        break;
      case "mogul":
        this.spawnMogul(x, spawnY);
        break;
      case "snowdrift":
        this.spawnSnowdrift(x, spawnY);
        break;
    }
  }

  private spawnRamp(screenWidth: number, screenHeight: number): void {
    const x = 60 + Math.random() * (screenWidth - 120);
    const spawnY = screenHeight + 40;
    const ramp = this.scene.add.triangle(x, spawnY, 0, 0, 50, 0, 25, 24, 0x60a5fa);
    ramp.setStrokeStyle(2, 0x3b82f6);
    this.objects.push({ sprite: ramp, type: "ramp", width: 50, height: 24 });
  }

  private spawnRock(x: number, y: number): void {
    const rock = this.scene.add.rectangle(x, y, 30, 30, 0x6b7280);
    rock.setStrokeStyle(2, 0x4b5563);
    this.objects.push({ sprite: rock, type: "rock", width: 30, height: 30 });
  }

  private spawnTree(x: number, y: number): void {
    const tree = this.scene.add.triangle(x, y, 0, 0, 15, 30, 30, 0, 0x16a34a);
    this.objects.push({ sprite: tree, type: "tree", width: 30, height: 30 });
  }

  private spawnFish(x: number, y: number, screenWidth: number): void {
    if (Math.random() < 0.25) {
      this.spawnFishCluster(x, y, screenWidth);
      return;
    }
    const fish = this.scene.add.circle(x, y, 8, 0xf59e0b);
    this.objects.push({ sprite: fish, type: "fish", width: 16, height: 16 });
  }

  private spawnFishCluster(x: number, y: number, screenWidth: number): void {
    const count = 3 + Math.floor(Math.random() * 3);
    const spacing = 22;
    const startX = x - ((count - 1) * spacing) / 2;
    for (let i = 0; i < count; i++) {
      const fx = Phaser.Math.Clamp(startX + i * spacing, 16, screenWidth - 16);
      const fish = this.scene.add.circle(fx, y + i * 12, 8, 0xf59e0b);
      this.objects.push({ sprite: fish, type: "fish", width: 16, height: 16 });
    }
  }

  private spawnIcePatch(x: number, y: number): void {
    const w = 60 + Math.random() * 40;
    const ice = this.scene.add.rectangle(x, y, w, 20, 0xa5f3fc, 0.6);
    ice.setStrokeStyle(1, 0x67e8f9);
    this.objects.push({ sprite: ice, type: "ice", width: w, height: 20 });
  }

  private spawnCrevasse(x: number, y: number): void {
    const crevasse = this.scene.add.rectangle(x, y, 14, 50, 0x1e293b);
    crevasse.setStrokeStyle(1, 0x0f172a);
    this.objects.push({ sprite: crevasse, type: "crevasse", width: 14, height: 50 });
  }

  private spawnMogul(x: number, y: number): void {
    const mogul = this.scene.add.ellipse(x, y, 28, 16, 0xf1f5f9);
    mogul.setStrokeStyle(1, 0xcbd5e1);
    this.objects.push({ sprite: mogul, type: "mogul", width: 28, height: 16 });
  }

  private spawnSnowdrift(x: number, y: number): void {
    const drift = this.scene.add.ellipse(x, y, 44, 18, 0xe2e8f0);
    drift.setStrokeStyle(1, 0xcbd5e1);
    this.objects.push({ sprite: drift, type: "snowdrift", width: 44, height: 18 });
  }
}
