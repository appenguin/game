/**
 * Music system — manages Strudel lifecycle and reacts to game state.
 *
 * Pattern *content* lives in src/core/music.ts (easy to edit).
 * This file handles init, level transitions, and game-event hooks.
 *
 * Use the module-level `music` singleton — it persists across scenes
 * so the intro music flows seamlessly into gameplay.
 */

import { initStrudel } from "@strudel/web";
import { setAudioContext } from "superdough";
import {
  getMusicLevel,
  getPatternForLevel,
  getDeathPattern,
  BASE_BPM,
  LEVEL_BPM,
  LEVEL_THRESHOLDS,
} from "../../core/music";

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = () => globalThis as any;

const STORAGE_KEY = "penguinski:music";

class Music {
  private initialized = false;
  private musicLevel = -1; // -1 = not yet started
  private _muted: boolean;
  private wantsPlay = false; // true if play() was called before init finished
  private deathTimer: ReturnType<typeof setTimeout> | null = null;
  private difficultyLevel = 1; // 0=easy, 1=medium, 2=hard
  private pendingLevel = -1;   // queued level, applied on next 4-bar boundary
  private lastChangeTime = 0;  // timestamp (seconds) of last level change

  constructor() {
    this._muted = localStorage.getItem(STORAGE_KEY) === "off";
  }

  /** Set difficulty level to control base BPM. */
  setDifficulty(level: number): void {
    this.difficultyLevel = level;
  }

  private get baseBpm(): number {
    return LEVEL_BPM[this.difficultyLevel] ?? BASE_BPM;
  }

  /** Call once (idempotent). Pass an AudioContext created during a user gesture. */
  async init(ctx?: AudioContext): Promise<void> {
    if (this.initialized) return;
    try {
      // Pre-set the AudioContext so Strudel reuses it (avoids browser autoplay block)
      if (ctx) setAudioContext(ctx);
      await initStrudel({
        prebake: () => g().samples("github:tidalcycles/dirt-samples"),
      });
      this.initialized = true;
      // Play the full arrangement silently to preload all samples + warm up oscillators
      const cps = this.baseBpm / 4 / 60;
      const full = getPatternForLevel(LEVEL_THRESHOLDS.length - 1);
      if (full) full.gain(0).cps(cps).play();
      // Brief pause then hush, so Strudel fetches everything
      setTimeout(() => this.hush(), 500);
      // Fulfil any play() that arrived before init finished
      if (this.wantsPlay) {
        this.wantsPlay = false;
        this.musicLevel = 0;
        this.pendingLevel = -1;
        this.lastChangeTime = 0; // allow first level change immediately
        if (!this._muted) this.applyLevel(0);
      }
    } catch (e) {
      console.warn("[Music] Strudel init failed:", e);
    }
  }

  /** Start playing from level 0 (intro / ambient). */
  play(): void {
    if (!this.initialized) {
      this.wantsPlay = true;
      return;
    }
    this.musicLevel = 0;
    this.pendingLevel = -1;
    this.lastChangeTime = 0; // allow first level change immediately
    if (!this._muted) this.applyLevel(0);
  }

  /** Toggle mute state. Returns new muted value. */
  toggleMute(): boolean {
    this._muted = !this._muted;
    localStorage.setItem(STORAGE_KEY, this._muted ? "off" : "on");
    if (this._muted) {
      this.hush();
    } else {
      this.play();
    }
    return this._muted;
  }

  get muted(): boolean {
    return this._muted;
  }

  // -----------------------------------------------------------------------
  // Distance-driven layer progression (quantised to 4-bar boundaries)
  // -----------------------------------------------------------------------

  /** Call every frame to update music layers based on distance (meters). */
  updateDistance(meters: number): void {
    if (!this.initialized) return;
    const next = getMusicLevel(meters);
    if (next !== this.musicLevel) {
      this.pendingLevel = next;
    }
    if (this.pendingLevel < 0 || this.pendingLevel === this.musicLevel) return;

    const now = performance.now() / 1000;
    const fourBars = 4 / (this.baseBpm / 4 / 60); // 4 cycles in seconds
    if (now - this.lastChangeTime >= fourBars) {
      this.musicLevel = this.pendingLevel;
      this.pendingLevel = -1;
      this.lastChangeTime = now;
      if (!this._muted) this.applyLevel(this.musicLevel);
    }
  }

  // -----------------------------------------------------------------------
  // Game-event hooks
  // -----------------------------------------------------------------------

  onGameOver(): void {
    if (!this.initialized || this._muted) return;
    this.clearDeathTimer();
    // Play death pattern immediately
    const cps = this.baseBpm / 4 / 60;
    getDeathPattern().cps(cps).play();
    // After 2 bars, drop to intro pad
    const barDuration = 2 / cps; // 2 cycles in seconds
    this.deathTimer = setTimeout(() => {
      this.deathTimer = null;
      this.musicLevel = 0;
      if (!this._muted) this.applyLevel(0);
    }, barDuration * 1000);
  }

  onRestart(): void {
    this.clearDeathTimer();
    this.musicLevel = 0;
    this.pendingLevel = -1;
    this.lastChangeTime = 0; // allow first level change immediately
    if (!this._muted) {
      this.applyLevel(0);
    }
  }

  private clearDeathTimer(): void {
    if (this.deathTimer) {
      clearTimeout(this.deathTimer);
      this.deathTimer = null;
    }
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private applyLevel(next: number): void {
    if (!this.initialized) return;

    const cps = this.baseBpm / 4 / 60; // cycles per second
    const pat = getPatternForLevel(next);
    if (pat) {
      pat.cps(cps).play();
    }
  }

  private hush(): void {
    if (!this.initialized) return;
    try {
      g().hush();
    } catch { /* noop */ }
  }
}

/** Singleton — shared across all scenes. */
export const music = new Music();
