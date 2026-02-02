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
  sprite: Phaser.GameObjects.Shape | Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  type: SlopeObjectType;
  width: number;
  height: number;
  hit?: boolean;
  originX?: number;
  originY?: number;
}

/**
 * Manages spawning, scrolling, and cleanup of slope objects.
 */
export class Spawner {
  private scene: Phaser.Scene;
  private objects: SlopeObject[] = [];
  private spawnTimer = 0;
  private rampSpawnTimer = 0;
  private penguinX = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Main update: spawn, scroll, and cull objects */
  update(
    dt: number,
    scrollSpeed: number,
    distanceTraveled: number,
    penguinX: number,
  ): void {
    this.penguinX = penguinX;
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

    // Scroll and cull (vertical + horizontal)
    const scrollDy = scrollSpeed * dt;
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      obj.sprite.y -= scrollDy;
      if (obj.originY != null) obj.originY -= scrollDy;
      if (obj.sprite.y < -50 || Math.abs(obj.sprite.x - penguinX) > width * 2) {
        obj.sprite.destroy();
        this.objects.splice(i, 1);
      }
    }
  }

  getObjects(): SlopeObject[] {
    return this.objects;
  }

  markHit(obj: SlopeObject): void {
    obj.hit = true;
  }

  /** Destroy and re-create a tree sprite so it's on top of the display list, shaking around its origin */
  redrawTree(obj: SlopeObject): void {
    const oldSprite = obj.sprite as Phaser.GameObjects.Sprite;
    // Store origin on first hit
    if (obj.originX == null) {
      obj.originX = oldSprite.x;
      obj.originY = oldSprite.y;
    }
    const frame = oldSprite.frame.name;
    oldSprite.destroy();
    const tree = this.scene.add.sprite(
      obj.originX + Phaser.Math.Between(-3, 3),
      obj.originY! + Phaser.Math.Between(-3, 3),
      "tree", frame,
    );
    tree.setScale(2.2);
    tree.setDepth(7);
    obj.sprite = tree;
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
    const spawnWidth = screenWidth * 1.5;
    const spawnLeft = this.penguinX - spawnWidth / 2;

    let x = spawnLeft + Math.random() * spawnWidth;
    let attempts = 0;
    while (!this.isSpawnClear(x, spawnY, 50) && attempts < 5) {
      x = spawnLeft + Math.random() * spawnWidth;
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
        this.spawnFish(x, spawnY);
        break;
      case "ice":
        this.spawnIcePatch(x, spawnY);
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
    const spawnWidth = screenWidth * 1.2;
    const x = this.penguinX - spawnWidth / 2 + Math.random() * spawnWidth;
    const spawnY = screenHeight + 40;
    const ramp = this.scene.add.image(x, spawnY, "ramp-tex");
    ramp.setScale(1.6);
    ramp.setDepth(6);
    this.objects.push({ sprite: ramp, type: "ramp", width: 65, height: 20 });
  }

  private spawnRock(x: number, y: number): void {
    const frame = Phaser.Math.Between(0, 3);
    const rock = this.scene.add.sprite(x, y, "rock", frame);
    rock.setScale(2.8);
    rock.setDepth(7);
    this.objects.push({ sprite: rock, type: "rock", width: 50, height: 40 });
  }

  private spawnTree(x: number, y: number): void {
    const frame = Phaser.Math.Between(0, 3);
    const tree = this.scene.add.sprite(x, y, "tree", frame);
    tree.setScale(2.2);
    tree.setDepth(7);
    this.objects.push({ sprite: tree, type: "tree", width: 40, height: 50 });
  }

  private spawnFish(x: number, y: number): void {
    if (Math.random() < 0.25) {
      this.spawnFishCluster(x, y);
      return;
    }
    const fish = this.scene.add.image(x, y, "fish-tex");
    fish.setScale(1.4);
    this.objects.push({ sprite: fish, type: "fish", width: 18, height: 12 });
  }

  private spawnFishCluster(x: number, y: number): void {
    const count = 3 + Math.floor(Math.random() * 3);
    const spacing = 22;
    const startX = x - ((count - 1) * spacing) / 2;
    for (let i = 0; i < count; i++) {
      const fx = startX + i * spacing;
      const fish = this.scene.add.image(fx, y + i * 12, "fish-tex");
      fish.setScale(1.4);
      this.objects.push({ sprite: fish, type: "fish", width: 18, height: 12 });
    }
  }

  private spawnIcePatch(x: number, y: number): void {
    const w = 70 + Math.random() * 60;
    const h = 25 + Math.random() * 20;
    const n = 8 + Math.floor(Math.random() * 5);
    const pts: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const wobble = 0.7 + Math.random() * 0.6;
      pts.push(Math.cos(a) * (w / 2) * wobble, Math.sin(a) * (h / 2) * wobble);
    }
    const ice = this.scene.add.polygon(x, y, pts, 0xa5f3fc, 0.5);
    ice.setStrokeStyle(1.5, 0x67e8f9);
    this.objects.push({ sprite: ice, type: "ice", width: w, height: h });
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
