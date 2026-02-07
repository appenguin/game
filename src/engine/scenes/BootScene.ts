import Phaser from "phaser";
import { getBest } from "../../core/storage";
import { music } from "../systems/Music";

const LEVELS = [
  { label: "EASY", color: "#22c55e" },
  { label: "MEDIUM", color: "#3b82f6" },
  { label: "HARD", color: "#ef4444" },
];

const SOUND_INDEX = LEVELS.length;
const MUSIC_INDEX = LEVELS.length + 1;
const ABOUT_INDEX = LEVELS.length + 2;
const MENU_COUNT = LEVELS.length + 3; // difficulties + sound toggle + music toggle + about

const SFX_STORAGE_KEY = "penguinski:sfx";

function getSfxMuted(): boolean {
  return localStorage.getItem(SFX_STORAGE_KEY) === "off";
}

function setSfxMuted(muted: boolean): void {
  localStorage.setItem(SFX_STORAGE_KEY, muted ? "off" : "on");
}

export class BootScene extends Phaser.Scene {
  private cursor = 0;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private soundText!: Phaser.GameObjects.Text;
  private musicText!: Phaser.GameObjects.Text;
  private aboutText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private aboutOverlay: Phaser.GameObjects.Container | null = null;
  private sfxMuted: boolean;

  constructor() {
    super("Boot");
    this.sfxMuted = getSfxMuted();
  }

  create(): void {
    const { width, height } = this.scale;
    this.sfxMuted = getSfxMuted();

    // Defer Strudel init to first user gesture (browser AudioContext requirement).
    // Create AudioContext synchronously inside the gesture callback so the browser
    // trusts it, then pass it to Strudel via setAudioContext (superdough).
    // Note: Strudel's built-in initAudioOnFirstClick only listens for mousedown,
    // so we handle all gesture types ourselves.
    let musicStarted = false;
    const startMusic = () => {
      if (musicStarted) return;
      musicStarted = true;
      document.removeEventListener("pointerdown", startMusic);
      document.removeEventListener("keydown", startMusic);
      const ctx = new AudioContext();
      // Share one AudioContext between Phaser SFX and Strudel music
      (this.sound as Phaser.Sound.WebAudioSoundManager).setAudioContext(ctx);
      music.init(ctx).then(() => music.play());
    };
    document.addEventListener("pointerdown", startMusic);
    document.addEventListener("keydown", startMusic);

    this.cameras.main.setBackgroundColor("#f8fbff");

    // Title
    this.add
      .text(width / 2, height * 0.2, "PENGUINSKI", {
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
    const toggleGap = 20; // extra space between difficulty items and toggles
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
        if (this.aboutOverlay) return;
        this.cursor = (this.cursor - 1 + MENU_COUNT) % MENU_COUNT;
        this.updateHighlight();
      });
      this.input.keyboard.on("keydown-W", () => {
        if (this.aboutOverlay) return;
        this.cursor = (this.cursor - 1 + MENU_COUNT) % MENU_COUNT;
        this.updateHighlight();
      });
      this.input.keyboard.on("keydown-DOWN", () => {
        if (this.aboutOverlay) return;
        this.cursor = (this.cursor + 1) % MENU_COUNT;
        this.updateHighlight();
      });
      this.input.keyboard.on("keydown-S", () => {
        if (this.aboutOverlay) return;
        this.cursor = (this.cursor + 1) % MENU_COUNT;
        this.updateHighlight();
      });
      this.input.keyboard.on("keydown-SPACE", () => {
        if (this.aboutOverlay) { this.hideAbout(); return; }
        if (this.cursor === SOUND_INDEX) {
          this.toggleSound();
        } else if (this.cursor === MUSIC_INDEX) {
          this.toggleMusic();
        } else if (this.cursor === ABOUT_INDEX) {
          this.showAbout();
        } else {
          this.selectLevel();
        }
      });
      this.input.keyboard.on("keydown-ENTER", () => {
        if (this.aboutOverlay) { this.hideAbout(); return; }
        if (this.cursor === SOUND_INDEX) {
          this.toggleSound();
        } else if (this.cursor === MUSIC_INDEX) {
          this.toggleMusic();
        } else if (this.cursor === ABOUT_INDEX) {
          this.showAbout();
        } else {
          this.selectLevel();
        }
      });
      this.input.keyboard.on("keydown-ESC", () => {
        if (this.aboutOverlay) this.hideAbout();
      });
    }

    // Sound toggle (SFX)
    const soundLabel = this.sfxMuted ? "SOUND: OFF" : "SOUND: ON";
    this.soundText = this.add
      .text(width / 2, startY + SOUND_INDEX * gap + toggleGap, "\u25B6 " + soundLabel, {
        fontSize: "24px",
        color: "#9ca3af",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.soundText.setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(
        -hitPad, -hitPad,
        this.soundText.width + hitPad * 2,
        this.soundText.height + hitPad * 2,
      ),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
    this.soundText.on("pointerdown", () => {
      this.toggleSound();
    });
    this.soundText.on("pointerover", () => {
      this.cursor = SOUND_INDEX;
      this.updateHighlight();
    });

    // Music toggle
    const musicLabel = music.muted ? "MUSIC: OFF" : "MUSIC: ON";
    this.musicText = this.add
      .text(width / 2, startY + MUSIC_INDEX * gap + toggleGap, "\u25B6 " + musicLabel, {
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

    // About
    this.aboutText = this.add
      .text(width / 2, startY + ABOUT_INDEX * gap + toggleGap, "  ABOUT", {
        fontSize: "24px",
        color: "#9ca3af",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.aboutText.setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(
        -hitPad, -hitPad,
        this.aboutText.width + hitPad * 2,
        this.aboutText.height + hitPad * 2,
      ),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
    this.aboutText.on("pointerdown", () => {
      this.showAbout();
    });
    this.aboutText.on("pointerover", () => {
      this.cursor = ABOUT_INDEX;
      this.updateHighlight();
    });

    // High score display
    this.bestText = this.add
      .text(width / 2, startY + (ABOUT_INDEX + 1) * gap + toggleGap + 8, "", {
        fontSize: "16px",
        color: "#64748b",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);

    this.updateHighlight();

    // Hide the HTML splash screen now that the menu is ready
    const splash = document.getElementById("splash-screen");
    if (splash) {
      splash.classList.add("fade-out");
      splash.addEventListener("transitionend", () => splash.remove());
    }
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

    const soundLabel = this.sfxMuted ? "SOUND: OFF" : "SOUND: ON";
    if (this.cursor === SOUND_INDEX) {
      this.soundText.setColor("#f97316");
      this.soundText.setText("\u25B6 " + soundLabel);
    } else {
      this.soundText.setColor("#9ca3af");
      this.soundText.setText("  " + soundLabel);
    }

    const musicLabel = music.muted ? "MUSIC: OFF" : "MUSIC: ON";
    if (this.cursor === MUSIC_INDEX) {
      this.musicText.setColor("#a855f7");
      this.musicText.setText("\u25B6 " + musicLabel);
    } else {
      this.musicText.setColor("#9ca3af");
      this.musicText.setText("  " + musicLabel);
    }

    if (this.cursor === ABOUT_INDEX) {
      this.aboutText.setColor("#64748b");
      this.aboutText.setText("\u25B6 ABOUT");
    } else {
      this.aboutText.setColor("#9ca3af");
      this.aboutText.setText("  ABOUT");
    }

    // Show high score for selected difficulty
    const level = this.cursor < LEVELS.length ? this.cursor : this.cursor - 1;
    const best = getBest(level);
    if (best) {
      const distStr = best.distance >= 1000
        ? (best.distance / 1000).toFixed(1) + " km"
        : best.distance + " m";
      this.bestText.setText(`BEST: ${best.score} \u00B7 ${distStr}`);
    } else {
      this.bestText.setText("");
    }
  }

  private toggleSound(): void {
    this.sfxMuted = !this.sfxMuted;
    setSfxMuted(this.sfxMuted);
    this.updateHighlight();
  }

  private toggleMusic(): void {
    music.toggleMute();
    this.updateHighlight();
  }

  private showAbout(): void {
    if (this.aboutOverlay) return;
    const { width, height } = this.scale;

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e, 0.92);
    const hitPad = 16;

    const title = this.add
      .text(width / 2, height * 0.22, "PENGUINSKI", {
        fontSize: "36px",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(width / 2, height * 0.32, "A penguin downhill ski game.\nDodge obstacles, hit ramps,\ndo tricks, collect fish!", {
        fontSize: "16px",
        color: "#94a3b8",
        fontFamily: "system-ui, sans-serif",
        align: "center",
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    const webUrl = this.add
      .text(width / 2, height * 0.48, "game.appenguin.com", {
        fontSize: "20px",
        color: "#38bdf8",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    webUrl.setInteractive({ useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(-hitPad, -hitPad, webUrl.width + hitPad * 2, webUrl.height + hitPad * 2),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
    webUrl.on("pointerdown", () => window.open("https://game.appenguin.com", "_blank"));

    const ghUrl = this.add
      .text(width / 2, height * 0.55, "Source on GitHub", {
        fontSize: "20px",
        color: "#38bdf8",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    ghUrl.setInteractive({ useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(-hitPad, -hitPad, ghUrl.width + hitPad * 2, ghUrl.height + hitPad * 2),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
    ghUrl.on("pointerdown", () => window.open("https://github.com/appenguin/game", "_blank"));

    const version = `v1.${__BUILD_DATE__}.${__COMMIT_HASH__}`;
    const versionText = this.add
      .text(width / 2, height * 0.64, version, {
        fontSize: "14px",
        color: "#64748b",
        fontFamily: "system-ui, sans-serif",
      })
      .setOrigin(0.5);

    const back = this.add
      .text(width / 2, height * 0.72, "BACK", {
        fontSize: "22px",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    back.setInteractive({ useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(-hitPad, -hitPad, back.width + hitPad * 2, back.height + hitPad * 2),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
    back.on("pointerdown", () => this.hideAbout());

    this.aboutOverlay = this.add.container(0, 0, [bg, title, desc, webUrl, ghUrl, versionText, back]);
    this.aboutOverlay.setDepth(50);
  }

  private hideAbout(): void {
    if (this.aboutOverlay) {
      this.aboutOverlay.destroy();
      this.aboutOverlay = null;
    }
  }

  private selectLevel(): void {
    this.scene.start("Run", { level: this.cursor, sfxMuted: this.sfxMuted });
  }
}
