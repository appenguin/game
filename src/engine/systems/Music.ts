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
import {
  getMusicLevel,
  getPatternForLevel,
  BASE_BPM,
} from "../../core/music";

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = () => globalThis as any;

const STORAGE_KEY = "icedrift:music";

class Music {
  private initialized = false;
  private musicLevel = -1; // -1 = not yet started
  private _muted: boolean;
  private wantsPlay = false; // true if play() was called before init finished

  constructor() {
    this._muted = localStorage.getItem(STORAGE_KEY) === "off";
  }

  /** Call once (idempotent). Resolves when Strudel is ready. */
  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await initStrudel({
        prebake: () => g().samples("github:tidalcycles/dirt-samples"),
      });
      this.initialized = true;
      // Fulfil any play() that arrived before init finished
      if (this.wantsPlay) {
        this.wantsPlay = false;
        this.musicLevel = 0;
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
  // Score-driven layer progression
  // -----------------------------------------------------------------------

  /** Call every frame (or when score changes) to update music layers. */
  updateScore(score: number): void {
    if (!this.initialized) return;
    const next = getMusicLevel(score);
    if (next !== this.musicLevel) {
      this.musicLevel = next;
      if (!this._muted) this.applyLevel(next);
    }
  }

  // -----------------------------------------------------------------------
  // Game-event hooks
  // -----------------------------------------------------------------------

  onGameOver(): void {
    this.hush();
  }

  onRestart(): void {
    this.musicLevel = 0;
    if (!this._muted) {
      this.applyLevel(0);
    }
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private applyLevel(next: number): void {
    if (!this.initialized) return;
    const { stack } = g();

    const bpm = BASE_BPM + next;
    const cps = bpm / 4 / 60; // cycles per second

    const layers: any[] = [];
    for (let i = 0; i <= next; i++) {
      const pat = getPatternForLevel(i);
      if (pat) layers.push(pat);
    }

    if (layers.length > 0) {
      stack(...layers).cps(cps).play();
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
