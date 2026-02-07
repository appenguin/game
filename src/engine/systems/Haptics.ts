import { Haptics as CapacitorHaptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * Haptic feedback using Capacitor Haptics plugin.
 * Works on Android and iOS native apps.
 * Gracefully no-ops on web.
 */
export class Haptics {
  private _muted = false;
  private _supported = true; // Capacitor handles platform detection

  get muted(): boolean {
    return this._muted;
  }

  get supported(): boolean {
    return this._supported;
  }

  setMuted(m: boolean): void {
    this._muted = m;
  }

  private async impact(style: ImpactStyle): Promise<void> {
    if (this._muted) return;
    try {
      await CapacitorHaptics.impact({ style });
    } catch {
      // Silently ignore errors on unsupported platforms
    }
  }

  private async notification(type: NotificationType): Promise<void> {
    if (this._muted) return;
    try {
      await CapacitorHaptics.notification({ type });
    } catch {
      // Silently ignore errors
    }
  }

  private async vibrate(duration: number): Promise<void> {
    if (this._muted) return;
    try {
      await CapacitorHaptics.vibrate({ duration });
    } catch {
      // Silently ignore errors
    }
  }

  // ── haptic events ──────────────────────────────────────────

  /** Strong impact — rock hit, life lost. */
  rockHit(): void {
    this.impact(ImpactStyle.Heavy);
  }

  /** Medium impact — tree collision, scaled by centeredness (0–1). */
  treeHit(centeredness: number): void {
    if (centeredness > 0.6) {
      this.impact(ImpactStyle.Heavy);
    } else if (centeredness > 0.3) {
      this.impact(ImpactStyle.Medium);
    } else {
      this.impact(ImpactStyle.Light);
    }
  }

  /** Light tap — fish collected. */
  fishCollect(): void {
    this.impact(ImpactStyle.Light);
  }

  /** Quick pulse — ramp launch. */
  rampLaunch(): void {
    this.impact(ImpactStyle.Medium);
  }

  /** Short bump — mogul bounce. */
  mogulLaunch(): void {
    this.impact(ImpactStyle.Light);
  }

  /** Subtle pulse — ice patch entry. */
  iceEntry(): void {
    this.impact(ImpactStyle.Light);
  }

  /** Soft thud — snowdrift hit. */
  snowdriftHit(): void {
    this.impact(ImpactStyle.Light);
  }

  /** Clean landing — satisfying tap. */
  cleanLanding(): void {
    this.notification(NotificationType.Success);
  }

  /** Sloppy landing — medium bump. */
  sloppyLanding(): void {
    this.notification(NotificationType.Warning);
  }

  /** Crash landing — strong thud. */
  crashLanding(): void {
    this.notification(NotificationType.Error);
  }

  /** Trick performed — quick pulse. */
  trickPerformed(): void {
    this.impact(ImpactStyle.Light);
  }

  /** Fling — strong impact with rumble pattern. */
  fling(): void {
    this.vibrate(200);
  }

  /** Game over — long rumble. */
  gameOver(): void {
    this.vibrate(400);
  }
}
