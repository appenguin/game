import Phaser from "phaser";

/**
 * Handles all input: keyboard, touch steering, and trick buttons.
 * Resolves input priority: keyboard > touch buttons > touch steering.
 */
export class Input {
  private scene: Phaser.Scene;

  // Keyboard
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // Touch steering
  private touchSteerX = 0;
  private steerPointerId: number | null = null;

  // Touch trick buttons
  private touchTrickKey = "";
  private flipButton!: Phaser.GameObjects.Container;
  private tuckButton!: Phaser.GameObjects.Container;
  private flipButtonBounds!: Phaser.Geom.Rectangle;
  private tuckButtonBounds!: Phaser.Geom.Rectangle;

  // Touch steer buttons
  private leftButton!: Phaser.GameObjects.Container;
  private rightButton!: Phaser.GameObjects.Container;
  private leftButtonBounds!: Phaser.Geom.Rectangle;
  private rightButtonBounds!: Phaser.Geom.Rectangle;

  // State
  private _airborne = false;

  // Callbacks
  private onGameOverTap: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeyboard();
    this.setupTouch();
    this.createButtons();
  }

  /** Set callback for tap-to-restart during game over */
  setGameOverTapHandler(handler: (() => void) | null): void {
    this.onGameOverTap = handler;
  }

  /** Resolve steer direction: keyboard > touch. Returns -1, 0, or 1 */
  getSteerDir(): number {
    if (this.cursors?.left.isDown || this.keys?.a.isDown) return -1;
    if (this.cursors?.right.isDown || this.keys?.d.isDown) return 1;
    if (this.touchSteerX !== 0) return this.touchSteerX;
    return 0;
  }

  /** Resolve trick key: keyboard > buttons. Returns "up", "down", or "" */
  getTrickKey(): string {
    if (this.cursors?.up.isDown || this.keys?.w.isDown) return "up";
    if (this.cursors?.down.isDown || this.keys?.s.isDown) return "down";

    // Touch trick buttons
    if (this.touchTrickKey) {
      const key = this.touchTrickKey;
      this.touchTrickKey = "";
      return key;
    }

    return "";
  }

  /** Resolve spin direction while airborne: -1 (left), 0, or 1 (right) */
  getSpinDir(): number {
    if (this.cursors?.left.isDown || this.keys?.a.isDown) return -1;
    if (this.cursors?.right.isDown || this.keys?.d.isDown) return 1;
    if (this.touchSteerX !== 0) return this.touchSteerX;
    return 0;
  }

  /** Update trick button alpha and internal airborne flag */
  setAirborne(airborne: boolean): void {
    this._airborne = airborne;
    const alpha = airborne ? 0.9 : 0.4;
    this.flipButton.setAlpha(alpha);
    this.tuckButton.setAlpha(alpha);
  }

  /** Bind R key to restart handler */
  bindRestart(handler: () => void): void {
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.once("keydown-R", handler);
    }
  }

  /** Reset input state (for scene restart) */
  reset(): void {
    this.touchSteerX = 0;
    this.steerPointerId = null;
    this.touchTrickKey = "";
  }

  // --- Internal setup ---

  private setupKeyboard(): void {
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();
      this.keys = {
        a: this.scene.input.keyboard.addKey("A"),
        d: this.scene.input.keyboard.addKey("D"),
        w: this.scene.input.keyboard.addKey("W"),
        s: this.scene.input.keyboard.addKey("S"),
        r: this.scene.input.keyboard.addKey("R"),
      };
    }
  }

  private setupTouch(): void {
    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.onGameOverTap) {
        this.onGameOverTap();
        return;
      }
      if (this.isOnTrickButton(pointer)) {
        this.handleTrickButtonPress(pointer);
        return;
      }
      if (this.isOnSteerButton(pointer)) {
        this.handleSteerButtonPress(pointer);
        return;
      }
      this.steerPointerId = pointer.id;
      this.updateTouchSteer(pointer);
    });
    this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.steerPointerId) {
        this.updateTouchSteer(pointer);
      }
    });
    this.scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.steerPointerId) {
        this.steerPointerId = null;
        this.touchSteerX = 0;
      }
    });
  }

  private updateTouchSteer(pointer: Phaser.Input.Pointer): void {
    const { width, height } = this.scene.scale;
    if (pointer.y > height * 0.82) return; // button zone
    if (pointer.x < width / 2) this.touchSteerX = -1;
    else this.touchSteerX = 1;
  }

  private createButtons(): void {
    const { width, height } = this.scene.scale;
    const btnH = 64;
    const btnY = height - 44;
    const margin = 12;
    const gap = 6;
    // 4 buttons in a row: [<] [FLIP] [TUCK] [>]
    const totalGaps = gap * 3;
    const btnW = Math.floor((width - margin * 2 - totalGaps) / 4);

    const x0 = margin + btnW / 2;
    const x1 = margin + btnW + gap + btnW / 2;
    const x2 = margin + (btnW + gap) * 2 + btnW / 2;
    const x3 = margin + (btnW + gap) * 3 + btnW / 2;

    // LEFT steer
    const leftBg = this.scene.add.rectangle(0, 0, btnW, btnH, 0x475569, 0.35);
    leftBg.setStrokeStyle(2, 0x64748b);
    const leftLabel = this.scene.add
      .text(0, 0, "\u25C0", { fontSize: "20px", color: "#ffffff", fontFamily: "system-ui, sans-serif" })
      .setOrigin(0.5);
    this.leftButton = this.scene.add.container(x0, btnY, [leftBg, leftLabel]);
    this.leftButton.setDepth(20).setAlpha(0.7).setScrollFactor(0);

    // FLIP trick
    const flipBg = this.scene.add.rectangle(0, 0, btnW, btnH, 0x3b82f6, 0.35);
    flipBg.setStrokeStyle(2, 0x60a5fa);
    const flipLabel = this.scene.add
      .text(0, 0, "FLIP", { fontSize: "14px", color: "#ffffff", fontFamily: "system-ui, sans-serif", fontStyle: "bold" })
      .setOrigin(0.5);
    this.flipButton = this.scene.add.container(x1, btnY, [flipBg, flipLabel]);
    this.flipButton.setDepth(20).setAlpha(0.4).setScrollFactor(0);

    // TUCK trick
    const tuckBg = this.scene.add.rectangle(0, 0, btnW, btnH, 0x7c3aed, 0.35);
    tuckBg.setStrokeStyle(2, 0xa78bfa);
    const tuckLabel = this.scene.add
      .text(0, 0, "TUCK", { fontSize: "14px", color: "#ffffff", fontFamily: "system-ui, sans-serif", fontStyle: "bold" })
      .setOrigin(0.5);
    this.tuckButton = this.scene.add.container(x2, btnY, [tuckBg, tuckLabel]);
    this.tuckButton.setDepth(20).setAlpha(0.4).setScrollFactor(0);

    // RIGHT steer
    const rightBg = this.scene.add.rectangle(0, 0, btnW, btnH, 0x475569, 0.35);
    rightBg.setStrokeStyle(2, 0x64748b);
    const rightLabel = this.scene.add
      .text(0, 0, "\u25B6", { fontSize: "20px", color: "#ffffff", fontFamily: "system-ui, sans-serif" })
      .setOrigin(0.5);
    this.rightButton = this.scene.add.container(x3, btnY, [rightBg, rightLabel]);
    this.rightButton.setDepth(20).setAlpha(0.7).setScrollFactor(0);

    // Hit bounds
    this.leftButtonBounds = new Phaser.Geom.Rectangle(
      margin, btnY - btnH / 2, btnW, btnH,
    );
    this.flipButtonBounds = new Phaser.Geom.Rectangle(
      margin + btnW + gap, btnY - btnH / 2, btnW, btnH,
    );
    this.tuckButtonBounds = new Phaser.Geom.Rectangle(
      margin + (btnW + gap) * 2, btnY - btnH / 2, btnW, btnH,
    );
    this.rightButtonBounds = new Phaser.Geom.Rectangle(
      margin + (btnW + gap) * 3, btnY - btnH / 2, btnW, btnH,
    );
  }

  private isOnSteerButton(pointer: Phaser.Input.Pointer): boolean {
    return (
      this.leftButtonBounds.contains(pointer.x, pointer.y) ||
      this.rightButtonBounds.contains(pointer.x, pointer.y)
    );
  }

  private handleSteerButtonPress(pointer: Phaser.Input.Pointer): void {
    this.steerPointerId = pointer.id;
    if (this.leftButtonBounds.contains(pointer.x, pointer.y)) {
      this.touchSteerX = -1;
    } else if (this.rightButtonBounds.contains(pointer.x, pointer.y)) {
      this.touchSteerX = 1;
    }
  }

  private isOnTrickButton(pointer: Phaser.Input.Pointer): boolean {
    return (
      this.flipButtonBounds.contains(pointer.x, pointer.y) ||
      this.tuckButtonBounds.contains(pointer.x, pointer.y)
    );
  }

  private handleTrickButtonPress(pointer: Phaser.Input.Pointer): void {
    if (!this._airborne) return;
    if (this.flipButtonBounds.contains(pointer.x, pointer.y)) {
      this.touchTrickKey = "up";
    } else if (this.tuckButtonBounds.contains(pointer.x, pointer.y)) {
      this.touchTrickKey = "down";
    }
  }
}
