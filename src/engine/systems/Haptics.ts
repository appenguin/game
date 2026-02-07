/**
 * Haptic feedback using the Web Vibration API.
 * Works on Android (web and Capacitor WebView).
 * Gracefully no-ops on iOS and desktop.
 */
export class Haptics {
  private _muted = false;
  private _supported: boolean;

  constructor() {
    this._supported = typeof navigator !== "undefined" && "vibrate" in navigator;
  }

  get muted(): boolean {
    return this._muted;
  }

  get supported(): boolean {
    return this._supported;
  }

  setMuted(m: boolean): void {
    this._muted = m;
  }

  private vibrate(pattern: number | number[]): void {
    if (this._muted || !this._supported) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Silently ignore errors (e.g., some browsers throw on certain patterns)
    }
  }

  // ── haptic events ──────────────────────────────────────────

  /** Strong impact — rock hit, life lost. */
  rockHit(): void {
    this.vibrate(200);
  }

  /** Medium impact — tree collision, scaled by centeredness (0–1). */
  treeHit(centeredness: number): void {
    const duration = Math.round(30 + centeredness * 70); // 30-100ms
    this.vibrate(duration);
  }

  /** Light tap — fish collected. */
  fishCollect(): void {
    this.vibrate(25);
  }

  /** Quick pulse — ramp launch. */
  rampLaunch(): void {
    this.vibrate(40);
  }

  /** Short bump — mogul bounce. */
  mogulLaunch(): void {
    this.vibrate(30);
  }

  /** Subtle pulse — ice patch entry. */
  iceEntry(): void {
    this.vibrate(20);
  }

  /** Soft thud — snowdrift hit. */
  snowdriftHit(): void {
    this.vibrate(35);
  }

  /** Clean landing — satisfying tap. */
  cleanLanding(): void {
    this.vibrate(30);
  }

  /** Sloppy landing — medium bump. */
  sloppyLanding(): void {
    this.vibrate(50);
  }

  /** Crash landing — strong thud. */
  crashLanding(): void {
    this.vibrate(100);
  }

  /** Trick performed — quick pulse. */
  trickPerformed(): void {
    this.vibrate(25);
  }

  /** Fling — strong impact with rumble pattern. */
  fling(): void {
    this.vibrate([100, 50, 80]);
  }

  /** Game over — long rumble. */
  gameOver(): void {
    this.vibrate([150, 80, 200]);
  }
}
