import Phaser from "phaser";

/**
 * HUD bar and floating text elements.
 * Creates the top bar (score, distance, speed, lives, level) and
 * floating text for tricks, status, combos, and status effects.
 */
export class HUD {
  private scene: Phaser.Scene;

  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private distText!: Phaser.GameObjects.Text;
  private trickText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private effectText!: Phaser.GameObjects.Text;
  private healthBarFill!: Phaser.GameObjects.Rectangle;
  private healthBarW = 0; // set in constructor to full screen width
  private readonly healthBarH = 3;
  private targetHealth = 100;
  private displayHealth = 100;

  constructor(scene: Phaser.Scene, level: number, onPauseTap: () => void) {
    this.scene = scene;
    const { width } = scene.scale;

    const barH = 36;
    const levelNames = ["EASY", "MED", "HARD"];
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: "13px",
      color: "#ffffff",
      fontFamily: "system-ui, sans-serif",
      fontStyle: "bold",
    };

    const hudBar = scene.add
      .rectangle(width / 2, barH / 2, width, barH, 0x1a1a2e, 0.45)
      .setDepth(10)
      .setScrollFactor(0)
      .setInteractive();
    hudBar.on("pointerdown", onPauseTap);

    this.scoreText = scene.add
      .text(12, barH / 2, "Score: 0", textStyle)
      .setOrigin(0, 0.5)
      .setDepth(11)
      .setScrollFactor(0);

    this.distText = scene.add
      .text(width * 0.33, barH / 2, "0.0 km", textStyle)
      .setOrigin(0, 0.5)
      .setDepth(11)
      .setScrollFactor(0);

    this.speedText = scene.add
      .text(width * 0.62, barH / 2, "0 km/h", textStyle)
      .setOrigin(0, 0.5)
      .setDepth(11)
      .setScrollFactor(0);

    this.healthBarW = width;
    scene.add
      .rectangle(0, barH, width, this.healthBarH, 0x000000, 0.4)
      .setOrigin(0, 0)
      .setDepth(11)
      .setScrollFactor(0);
    this.healthBarFill = scene.add
      .rectangle(0, barH, width, this.healthBarH, 0x22c55e, 0.9)
      .setOrigin(0, 0)
      .setDepth(11)
      .setScrollFactor(0);

    scene.add
      .text(width - 12, barH / 2, levelNames[level] ?? "MED", textStyle)
      .setOrigin(1, 0.5)
      .setDepth(11)
      .setScrollFactor(0);

    const { height } = scene.scale;

    this.comboText = scene.add
      .text(width / 2, barH + 8, "", {
        fontSize: "16px",
        color: "#7c3aed",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setDepth(10)
      .setScrollFactor(0);

    this.trickText = scene.add
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

    this.statusText = scene.add
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

    this.effectText = scene.add
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
  }

  update(
    score: number,
    meters: number,
    speed: number,
    combo: number,
    slipperyTimer: number,
    snowdriftTimer: number,
  ): void {
    this.scoreText.setText(`Score: ${score}`);
    const distStr = meters >= 1000
      ? `${(meters / 1000).toFixed(1)} km`
      : `${meters} m`;
    this.distText.setText(distStr);
    this.speedText.setText(`${Math.floor(speed * 0.2)} km/h`);
    this.comboText.setText(combo > 1 ? `x${combo} combo` : "");

    if (slipperyTimer > 0) {
      this.effectText.setText("ICY!");
      this.effectText.setColor("#0ea5e9");
      this.effectText.setAlpha(0.8);
    } else if (snowdriftTimer > 0) {
      this.effectText.setText("DRAG!");
      this.effectText.setColor("#94a3b8");
      this.effectText.setAlpha(0.8);
    } else {
      this.effectText.setAlpha(0);
    }

    // Health bar: instant snap on damage, smooth lerp on regen
    if (this.displayHealth !== this.targetHealth) {
      if (this.targetHealth < this.displayHealth) {
        this.displayHealth = this.targetHealth;
      } else {
        this.displayHealth = Math.min(
          this.targetHealth,
          this.displayHealth + 120 * 0.016,
        );
      }
    }
    const pct = Phaser.Math.Clamp(this.displayHealth / 100, 0, 1);
    this.healthBarFill.width = this.healthBarW * pct;
    if (pct > 0.6) {
      this.healthBarFill.setFillStyle(0x22c55e);
    } else if (pct > 0.3) {
      this.healthBarFill.setFillStyle(0xeab308);
    } else {
      this.healthBarFill.setFillStyle(0xef4444);
    }
  }

  setHealth(health: number): void {
    this.targetHealth = health;
  }

  showTrickText(text: string): void {
    this.trickText.setText(text);
    this.trickText.setAlpha(1);
    this.scene.tweens.add({
      targets: this.trickText,
      alpha: 0,
      duration: 800,
      ease: "Power2",
    });
  }

  showStatusText(text: string, color: string): void {
    const height = this.scene.scale.height;
    this.statusText.setText(text);
    this.statusText.setColor(color);
    this.statusText.setAlpha(1);
    this.scene.tweens.add({
      targets: this.statusText,
      alpha: 0,
      y: height * 0.55,
      duration: 1000,
      ease: "Power2",
      onComplete: () => {
        this.statusText.y = height * 0.6;
      },
    });
  }
}
