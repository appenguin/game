import Phaser from "phaser";

const LEVELS = [
  { label: "EASY", color: 0x22c55e, stroke: 0x16a34a },
  { label: "MEDIUM", color: 0x3b82f6, stroke: 0x2563eb },
  { label: "HARD", color: 0xef4444, stroke: 0xdc2626 },
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#dce8f0");

    // Title
    this.add
      .text(width / 2, height * 0.2, "ICE DRIFT", {
        fontSize: "42px",
        color: "#1a1a2e",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.28, "Choose difficulty", {
        fontSize: "18px",
        color: "#64748b",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);

    // Difficulty buttons
    const btnW = 200;
    const btnH = 56;
    const startY = height * 0.42;
    const gap = 20;

    for (let i = 0; i < LEVELS.length; i++) {
      const { label, color, stroke } = LEVELS[i];
      const y = startY + i * (btnH + gap);

      const bg = this.add.rectangle(width / 2, y, btnW, btnH, color, 0.35);
      bg.setStrokeStyle(2, stroke);
      bg.setInteractive({ useHandCursor: true });

      this.add
        .text(width / 2, y, label, {
          fontSize: "20px",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      bg.on("pointerdown", () => {
        this.scene.start("Run", { level: i });
      });
    }
  }
}
