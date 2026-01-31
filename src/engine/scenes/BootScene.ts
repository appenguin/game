import Phaser from "phaser";
import { music } from "../systems/Music";

const LEVELS = [
  { label: "EASY", color: "#22c55e" },
  { label: "MEDIUM", color: "#3b82f6" },
  { label: "HARD", color: "#ef4444" },
];

export class BootScene extends Phaser.Scene {
  private cursor = 0;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private musicText!: Phaser.GameObjects.Text;

  constructor() {
    super("Boot");
  }

  create(): void {
    const { width, height } = this.scale;

    music.init();
    this.input.once("pointerdown", () => music.play());

    this.cameras.main.setBackgroundColor("#f8fbff");

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

    // Difficulty menu items
    const startY = height * 0.42;
    const gap = 52;
    this.menuTexts = [];
    this.cursor = 1; // default to Medium

    for (let i = 0; i < LEVELS.length; i++) {
      const txt = this.add
        .text(width / 2, startY + i * gap, LEVELS[i].label, {
          fontSize: "24px",
          color: "#9ca3af",
          fontFamily: "system-ui, sans-serif",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      txt.setInteractive({ useHandCursor: true });
      txt.on("pointerdown", () => {
        this.cursor = i;
        this.selectLevel();
      });
      txt.on("pointerover", () => {
        this.cursor = i;
        this.updateHighlight();
      });
      this.menuTexts.push(txt);
    }

    this.updateHighlight();

    // Keyboard
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-UP", () => {
        this.cursor = (this.cursor - 1 + LEVELS.length) % LEVELS.length;
        this.updateHighlight();
      });
      this.input.keyboard.on("keydown-W", () => {
        this.cursor = (this.cursor - 1 + LEVELS.length) % LEVELS.length;
        this.updateHighlight();
      });
      this.input.keyboard.on("keydown-DOWN", () => {
        this.cursor = (this.cursor + 1) % LEVELS.length;
        this.updateHighlight();
      });
      this.input.keyboard.on("keydown-S", () => {
        this.cursor = (this.cursor + 1) % LEVELS.length;
        this.updateHighlight();
      });
      this.input.keyboard.on("keydown-ENTER", () => {
        this.selectLevel();
      });
    }

    // Music toggle
    const musicLabel = () => music.muted ? "Music: OFF" : "Music: ON";
    this.musicText = this.add
      .text(width / 2, height * 0.85, musicLabel(), {
        fontSize: "16px",
        color: "#64748b",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.musicText.on("pointerdown", () => {
      music.toggleMute();
      this.musicText.setText(musicLabel());
    });
  }

  private updateHighlight(): void {
    for (let i = 0; i < this.menuTexts.length; i++) {
      if (i === this.cursor) {
        this.menuTexts[i].setColor(LEVELS[i].color);
        this.menuTexts[i].setText("\u25B6 " + LEVELS[i].label);
      } else {
        this.menuTexts[i].setColor("#9ca3af");
        this.menuTexts[i].setText("  " + LEVELS[i].label);
      }
    }
  }

  private selectLevel(): void {
    this.scene.start("Run", { level: this.cursor });
  }
}
