import Phaser from "phaser";

export interface MenuItem {
  label: string;
  action: () => void;
}

/**
 * Menu overlay system for pause and game-over screens.
 * Handles rendering, keyboard navigation, and touch input.
 */
export class Menu {
  private scene: Phaser.Scene;
  private cursor = 0;
  private items: MenuItem[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private keys: Phaser.Input.Keyboard.Key[] = [];
  private onBack: (() => void) | null = null;
  private overlay: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Call from ESC / Android back when menu is open */
  triggerBack(): void {
    if (this.onBack) this.onBack();
  }

  get visible(): boolean {
    return this.overlay !== null;
  }

  show(
    title: string,
    items: MenuItem[],
    onBack?: () => void,
  ): void {
    const { width, height } = this.scene.scale;
    this.cursor = 0;
    this.items = items;
    this.texts = [];
    this.onBack = onBack ?? null;

    const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    bg.setDepth(50).setScrollFactor(0);

    const titleText = this.scene.add
      .text(width / 2, height * 0.28, title, {
        fontSize: "36px",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(51)
      .setScrollFactor(0);

    const children: Phaser.GameObjects.GameObject[] = [bg, titleText];
    const startY = height * 0.42;
    const gap = 52;
    const hitPad = 16;

    for (let i = 0; i < items.length; i++) {
      const txt = this.scene.add
        .text(width / 2, startY + i * gap, items[i].label, {
          fontSize: "22px",
          color: "#9ca3af",
          fontFamily: "system-ui, sans-serif",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(51)
        .setScrollFactor(0);
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
        this.updateHighlight();
        items[i].action();
      });
      txt.on("pointerover", () => {
        this.cursor = i;
        this.updateHighlight();
      });
      this.texts.push(txt);
      children.push(txt);
    }

    this.updateHighlight();

    this.overlay = this.scene.add.container(0, 0, children);
    this.overlay.setDepth(50);

    // Keyboard navigation
    if (this.scene.input.keyboard) {
      const upKey = this.scene.input.keyboard.addKey("UP");
      const downKey = this.scene.input.keyboard.addKey("DOWN");
      const enterKey = this.scene.input.keyboard.addKey("ENTER");
      const spaceKey = this.scene.input.keyboard.addKey("SPACE");
      const wKey = this.scene.input.keyboard.addKey("W");
      const sKey = this.scene.input.keyboard.addKey("S");
      const rKey = this.scene.input.keyboard.addKey("R");
      const qKey = this.scene.input.keyboard.addKey("Q");

      upKey.on("down", this.up, this);
      wKey.on("down", this.up, this);
      downKey.on("down", this.down, this);
      sKey.on("down", this.down, this);
      enterKey.on("down", this.select, this);
      spaceKey.on("down", this.select, this);
      rKey.on("down", () => this.action("RETRY"));
      qKey.on("down", () => this.action("QUIT"));

      this.keys = [upKey, downKey, enterKey, spaceKey, wKey, sKey, rKey, qKey];
    }
  }

  hide(): void {
    for (const key of this.keys) {
      key.removeAllListeners();
      this.scene.input.keyboard?.removeKey(key);
    }
    this.keys = [];
    this.texts = [];
    this.items = [];
    this.onBack = null;

    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }

  private up(): void {
    this.cursor = (this.cursor - 1 + this.items.length) % this.items.length;
    this.updateHighlight();
  }

  private down(): void {
    this.cursor = (this.cursor + 1) % this.items.length;
    this.updateHighlight();
  }

  private select(): void {
    if (this.items[this.cursor]) {
      this.items[this.cursor].action();
    }
  }

  private action(label: string): void {
    const item = this.items.find((i) => i.label === label);
    if (item) item.action();
  }

  private updateHighlight(): void {
    for (let i = 0; i < this.texts.length; i++) {
      if (i === this.cursor) {
        this.texts[i].setColor("#ffffff");
        this.texts[i].setText("\u25B6 " + this.items[i].label);
      } else {
        this.texts[i].setColor("#9ca3af");
        this.texts[i].setText("  " + this.items[i].label);
      }
    }
  }
}
