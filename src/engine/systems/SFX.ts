/**
 * Procedural sound effects using Web Audio API.
 * All sounds synthesised at runtime — no audio files.
 * Shares the same AudioContext as Strudel (music) and Phaser.
 *
 * All pitched sounds use notes from B minor (B, C#, D, E, F#, G, A)
 * to match the game's Bmin9 music key.
 */
export class SFX {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private noiseBuffer: AudioBuffer;
  private _muted = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.connect(ctx.destination);

    // Pre-generate 2s of white noise, reused by all noise-based sounds
    const bufLen = ctx.sampleRate * 2;
    this.noiseBuffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  }

  get muted(): boolean {
    return this._muted;
  }

  setMuted(m: boolean): void {
    this._muted = m;
    this.masterGain.gain.value = m ? 0 : 1;
  }

  destroy(): void {
    this.masterGain.disconnect();
  }

  // ── helpers ──────────────────────────────────────────────

  /** Play a tone with attack/decay envelope. */
  private tone(
    freq: number,
    type: OscillatorType,
    dur: number,
    vol: number,
    opts?: { attack?: number; freqEnd?: number; delay?: number },
  ): void {
    const t = this.ctx.currentTime + (opts?.delay ?? 0);
    const atk = opts?.attack ?? 0.01;

    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (opts?.freqEnd != null) {
      osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + dur);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + atk);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  /** Play filtered white noise burst. */
  private noise(
    dur: number,
    vol: number,
    filterFreq: number,
    filterType: BiquadFilterType = "lowpass",
    opts?: { attack?: number; Q?: number; delay?: number },
  ): void {
    const t = this.ctx.currentTime + (opts?.delay ?? 0);
    const atk = opts?.attack ?? 0.01;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t);
    if (opts?.Q != null) filter.Q.setValueAtTime(opts.Q, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + atk);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    src.connect(filter).connect(gain).connect(this.masterGain);
    src.start(t);
    src.stop(t + dur);
  }

  /** Play filtered noise with a frequency sweep. */
  private noiseSweep(
    dur: number,
    vol: number,
    freqStart: number,
    freqEnd: number,
    filterType: BiquadFilterType = "bandpass",
    opts?: { attack?: number; Q?: number },
  ): void {
    const t = this.ctx.currentTime;
    const atk = opts?.attack ?? 0.02;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freqStart, t);
    filter.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    if (opts?.Q != null) filter.Q.setValueAtTime(opts.Q, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + atk);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    src.connect(filter).connect(gain).connect(this.masterGain);
    src.start(t);
    src.stop(t + dur);
  }

  // ── sound effects ────────────────────────────────────────

  /** Bright ding — fish collected (+10 pts). */
  fishCollect(): void {
    if (this._muted) return;
    this.tone(1319, "sine", 0.15, 0.3); // E6
    this.tone(1976, "sine", 0.12, 0.15, { delay: 0.01 }); // B6 twinkle
  }

  /** Ascending two-note chime — clean trick landing. */
  cleanLanding(): void {
    if (this._muted) return;
    this.tone(988, "sine", 0.2, 0.25); // B5
    this.tone(1319, "sine", 0.2, 0.25, { delay: 0.05 }); // E6
  }

  /** Heavy thud — crash landing, combo lost. */
  crashLanding(): void {
    if (this._muted) return;
    this.tone(110, "sine", 0.3, 0.4); // A2 thud
    this.noise(0.15, 0.3, 400);
  }

  /** Gentle mid tone — sloppy landing. */
  sloppyLanding(): void {
    if (this._muted) return;
    this.tone(294, "sine", 0.2, 0.2); // D4
  }

  /** Deep crash — rock collision, life lost. */
  rockHit(): void {
    if (this._muted) return;
    this.tone(82, "sine", 0.4, 0.5); // E2
    this.noise(0.25, 0.4, 600);
  }

  /** Woody thunk — tree collision, intensity scales with centeredness (0–1). */
  treeHit(centeredness: number): void {
    if (this._muted) return;
    const c = Math.max(0.15, Math.min(1, centeredness));
    this.tone(220, "sine", 0.1 + c * 0.15, 0.1 + c * 0.3); // A3
    this.noise(0.12, 0.1 + c * 0.25, 800, "bandpass", { Q: 2 });
  }

  /** Ascending whoosh — ramp launch. */
  rampLaunch(): void {
    if (this._muted) return;
    this.noiseSweep(0.3, 0.25, 400, 2000, "bandpass", { Q: 1 });
  }

  /** Short boing — mogul bounce. */
  mogulLaunch(): void {
    if (this._muted) return;
    this.tone(587, "sine", 0.15, 0.3, { freqEnd: 247 }); // D5→B3
  }

  /** Crystalline shimmer — ice patch entry. */
  iceEntry(): void {
    if (this._muted) return;
    this.tone(988, "sine", 0.3, 0.1); // B5
    this.tone(1175, "sine", 0.25, 0.1, { delay: 0.02 }); // D6
    this.tone(1480, "sine", 0.2, 0.1, { delay: 0.04 }); // F#6
  }

  /** Soft muffled poof — snowdrift hit. */
  snowdriftHit(): void {
    if (this._muted) return;
    this.noise(0.2, 0.2, 300, "lowpass", { attack: 0.02 });
  }

  /** Quick whoosh — trick performed mid-air. */
  trickPerformed(): void {
    if (this._muted) return;
    this.noise(0.1, 0.2, 1000, "bandpass", { Q: 1.5 });
  }

  /** Impact + tumble — penguin flung off-screen. */
  fling(): void {
    if (this._muted) return;
    this.tone(82, "sine", 0.5, 0.4); // E2
    this.noise(0.35, 0.35, 800);
  }

  /** Final crash — game over. */
  gameOver(): void {
    if (this._muted) return;
    this.tone(62, "sine", 0.8, 0.5); // B1
    this.tone(46, "sine", 0.6, 0.3, { delay: 0.05 }); // F#1 sub
    this.noise(0.4, 0.4, 500);
  }
}
