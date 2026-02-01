import Phaser from "phaser";
import { music } from "../systems/Music";

const LEVELS = [
  { label: "EASY", color: "#22c55e" },
  { label: "MEDIUM", color: "#3b82f6" },
  { label: "HARD", color: "#ef4444" },
];

const MENU_COUNT = LEVELS.length + 1; // difficulties + music toggle
const MUSIC_INDEX = LEVELS.length;

export class BootScene extends Phaser.Scene {
  private cursor = 0;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private musicText!: Phaser.GameObjects.Text;

  constructor() {
    super("Boot");
  }

  create(): void {
    const { width, height } = this.scale;

    // Defer AudioContext creation to first user gesture (browser requirement)
    let musicStarted = false;
    const startMusic = () => {
      if (musicStarted) return;
      musicStarted = true;
      music.init().then(() => music.play());
    };
    this.input.on("pointerdown", startMusic);
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown", startMusic);
    }

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
    const hitPad = 16;
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
        this.cursor = i;
        this.selectLevel();
      });
      txt.on("pointerover", () => {
        this.cursor = i;
        this.updateHighlight();
      });
      this.menuTexts.push(txt);
    }

    // Keyboard
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-UP", () => {
        this.cursor = (this.cursor - 1 + MENU_COUNT) % MENU_COUNT;
        this.updateHighlight();
      });
      this.input.keyboard.on("keydown-W", () => {
        this.cursor = (this.cursor - 1 + MENU_COUNT) % MENU_COUNT;
        this.updateHighlight();
      });
      this.input.keyboard.on("keydown-DOWN", () => {
        this.cursor = (this.cursor + 1) % MENU_COUNT;
        this.updateHighlight();
      });
      this.input.keyboard.on("keydown-S", () => {
        this.cursor = (this.cursor + 1) % MENU_COUNT;
        this.updateHighlight();
      });
      this.input.keyboard.on("keydown-SPACE", () => {
        if (this.cursor === MUSIC_INDEX) {
          this.toggleMusic();
        } else {
          this.selectLevel();
        }
      });
      this.input.keyboard.on("keydown-ENTER", () => {
        if (this.cursor === MUSIC_INDEX) {
          this.toggleMusic();
        } else {
          this.selectLevel();
        }
      });
    }

    // Music toggle (part of the menu)
    const musicLabel = music.muted ? "MUSIC: OFF" : "MUSIC: ON";
    this.musicText = this.add
      .text(width / 2, startY + LEVELS.length * gap, "\u25B6 " + musicLabel, {
        fontSize: "24px",
        color: "#9ca3af",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.musicText.setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(
        -hitPad, -hitPad,
        this.musicText.width + hitPad * 2,
        this.musicText.height + hitPad * 2,
      ),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });

    this.musicText.on("pointerdown", () => {
      this.toggleMusic();
    });
    this.musicText.on("pointerover", () => {
      this.cursor = MUSIC_INDEX;
      this.updateHighlight();
    });

    this.updateHighlight();
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

    const musicLabel = music.muted ? "MUSIC: OFF" : "MUSIC: ON";
    if (this.cursor === MUSIC_INDEX) {
      this.musicText.setColor("#a855f7");
      this.musicText.setText("\u25B6 " + musicLabel);
    } else {
      this.musicText.setColor("#9ca3af");
      this.musicText.setText("  " + musicLabel);
    }
  }

  private toggleMusic(): void {
    music.toggleMute();
    this.updateHighlight();
  }

  private selectLevel(): void {
    this.scene.start("Run", { level: this.cursor });
  }
}
