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

  // State
  private _airborne = false;

  // Callbacks
  private onGameOverTap: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeyboard();
    this.setupTouch();
    this.createTrickButtons();
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

  /** Resolve trick key: keyboard > buttons > touch steering. Returns key or "" */
  getTrickKey(): string {
    // Keyboard: all 4 directions
    if (this.cursors?.up.isDown || this.keys?.w.isDown) return "up";
    if (this.cursors?.down.isDown || this.keys?.s.isDown) return "down";
    if (this.cursors?.left.isDown || this.keys?.a.isDown) return "left";
    if (this.cursors?.right.isDown || this.keys?.d.isDown) return "right";

    // Touch trick buttons
    if (this.touchTrickKey) {
      const key = this.touchTrickKey;
      this.touchTrickKey = "";
      return key;
    }

    // Touch steering: left/right spins
    if (this.touchSteerX < 0) return "left";
    if (this.touchSteerX > 0) return "right";

    return "";
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
    if (pointer.y > height * 0.85) return; // trick button zone
    if (pointer.x < width / 2) this.touchSteerX = -1;
    else this.touchSteerX = 1;
  }

  private createTrickButtons(): void {
    const { width, height } = this.scene.scale;
    const btnW = 80;
    const btnH = 50;
    const btnY = height - 50;
    const margin = 24;

    // Flip button (left side) — triggers Backflip
    const flipBg = this.scene.add.rectangle(0, 0, btnW, btnH, 0x3b82f6, 0.35);
    flipBg.setStrokeStyle(2, 0x60a5fa);
    const flipLabel = this.scene.add
      .text(0, 0, "FLIP", {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.flipButton = this.scene.add.container(margin + btnW / 2, btnY, [
      flipBg,
      flipLabel,
    ]);
    this.flipButton.setDepth(20);
    this.flipButton.setAlpha(0.4);

    // Tuck button (right side) — triggers Front Tuck
    const tuckBg = this.scene.add.rectangle(0, 0, btnW, btnH, 0x7c3aed, 0.35);
    tuckBg.setStrokeStyle(2, 0xa78bfa);
    const tuckLabel = this.scene.add
      .text(0, 0, "TUCK", {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.tuckButton = this.scene.add.container(width - margin - btnW / 2, btnY, [
      tuckBg,
      tuckLabel,
    ]);
    this.tuckButton.setDepth(20);
    this.tuckButton.setAlpha(0.4);

    // Hit bounds for point-in-rect testing
    this.flipButtonBounds = new Phaser.Geom.Rectangle(
      margin,
      btnY - btnH / 2,
      btnW,
      btnH,
    );
    this.tuckButtonBounds = new Phaser.Geom.Rectangle(
      width - margin - btnW,
      btnY - btnH / 2,
      btnW,
      btnH,
    );
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
