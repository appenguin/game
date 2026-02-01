/**
 * Musical pattern definitions for Ice Drift.
 *
 * Edit this file to change the music. Each level adds one layer;
 * all layers up to the current level are stacked together.
 *
 * Pattern functions (sound, note, n, stack, …) are Strudel globals
 * available after initStrudel() is called by the Music system.
 * Docs: https://strudel.cc/reference/
 *
 * Key: E minor — cold, icy atmosphere.
 * Uses only synth oscillators (sine, square, sawtooth, triangle).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = () => globalThis as any;

// ---------------------------------------------------------------------------
// Score thresholds — score required to unlock each level (0-15)
// ---------------------------------------------------------------------------

export const LEVEL_THRESHOLDS = [
  0,    // 0  Intro pad
  20,   // 1  Cold pad chord
  50,   // 2  Kick (bd)
  100,  // 3  Sub bass
  160,  // 4  Arpeggio
  230,  // 5  Hi-hats (hh)
  310,  // 6  Pad progression
  400,  // 7  Snare backbeat (sd)
  500,  // 8  Crystal arp
  620,  // 9  Open hats (oh)
  750,  // 10 Lead melody
  880,  // 11 Ghost snares
  1020, // 12 Bass shift (F#m)
  1170, // 13 High counter-melody
  1330, // 14 Snare fill (sd)
  1500, // 15 Full arrangement
];

// ---------------------------------------------------------------------------
// Tempo
// ---------------------------------------------------------------------------

/** Base BPM at level 0. Increases +1 per level. */
export const BASE_BPM = 110;
export const LEVEL_BPM = [110, 124, 140]; // Easy, Medium, Hard

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map score → music level (0-15). */
export function getMusicLevel(score: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Death pattern — plays for a few bars on game over, then fades to intro pad
// ---------------------------------------------------------------------------

export function getDeathPattern(): any {
  const { silence } = g();
  return silence;
}

// ---------------------------------------------------------------------------
// Pattern definitions — one per level
//
// To tweak a layer, edit the matching case below.
// Strudel cheat-sheet:
//   note("e3*4")          4 E3 notes per cycle
//   sound("sawtooth")     oscillator type
//   .gain(0.3)            volume
//   .lpf(800)             low-pass filter cutoff
//   .decay(0.1)           amp envelope
//   .fast(2) / .slow(2)   speed
//   .pan(0.5)             stereo (0=left, 1=right)
//   .room(0.3)            reverb send
//   .delay(0.2)           delay send
//   .degradeBy(0.3)       randomly drop 30% of events
//   .scale("e:minor")     quantise to scale
//   sine.range(a,b)       sine LFO mapped to range
// ---------------------------------------------------------------------------

export function getPatternForLevel(level: number): any {
  const { sound, note, n, silence, sine, rand, irand } = g();

  switch (level) {
    // ---- intro — silence until first layer kicks in ----------------------
    case 0:
      return silence;

    // ---- cold pad — sustained E minor chord -----------------------------
    case 1:
      return note("<[e3,g3,b3]>")
        .sound("triangle")
        .attack(0.5)
        .sustain(0.6)
        .release(0.5)
        .lpf(1200)
        .gain(0.2);

    // ---- kick — 4-on-the-floor (first drum) ------------------------------
    case 2:
      return sound("bd*4")
        .gain(0.3);

    // ---- sub bass — filtered sawtooth following E minor ------------------
    case 3:
      return n(-14)
        .seg(16)
        .scale("e:minor")
        .sound("sawtooth")
        .lpf(sine.range(400, 1500).slow(3))
        .lpa(0.2)
        .lpenv(4)
        .gain(0.25);

    // ---- arpeggio — E minor, sawtooth -----------------------------------
    case 4:
      return n("[0 2 4 7]*4")
        .scale("e:minor")
        .add(48)
        .sound("sawtooth")
        .gain(0.2)
        .decay(0.1)
        .sustain(0.3)
        .release(0.1)
        .lpf(sine.range(1000, 2500).slow(4))
        .pan(sine.range(0.3, 0.7).slow(3))
        .room(0.2);

    // ---- hi-hats -----------------------------------------------------------
    case 5:
      return sound("hh*16")
        .gain(rand.range(0.2, 0.3))
        .degradeBy(0.3)
        .lpf(sine.range(5000, 10000).slow(5))
        .hpf(1000)
        .pan(sine.range(0, 1).slow(8));

    // ---- pad progression — cycling E minor chords -----------------------
    case 6:
      return note("<[e3,g3,b3] [b2,e3,g3] [e3,g3,b3] [g3,b3,e4]>")
        .sound("triangle")
        .attack(0.3)
        .decay(0.2)
        .sustain(0.6)
        .release(0.3)
        .lpf(1500)
        .lpq(5)
        .gain(0.2)
        .room(0.4);

    // ---- snare on backbeat ------------------------------------------------
    case 7:
      return sound("~ sd ~ sd?")
        .gain(rand.range(0.5, 0.7))
        .room(0.2);

    // ---- crystal arp — high register square -----------------------------
    case 8:
      return n("[7 9 11 12]*4")
        .scale("e:minor")
        .add(60)
        .sound("square")
        .gain(0.15)
        .decay(0.08)
        .sustain(0.2)
        .release(0.1)
        .lpf(sine.range(2000, 4000).slow(3))
        .pan(sine.range(0.2, 0.8).slow(5))
        .room(0.3);

    // ---- open hats ----------------------------------------------------------
    case 9:
      return sound("~ ~ oh ~ ~ ~ oh ~")
        .gain("[0.22 0.22 0.26 0.22]")
        .room(0.3)
        .pan("[-0.12 0.12 -0.10 0.10]");

    // ---- lead melody — supersaw with filter sweep -----------------------
    case 10:
      return sound("supersaw")
        .n(irand(12).sub(5))
        .scale("e:minor")
        .fast(2)
        .gain(0.25)
        .delay(rand.range(0, 0.4))
        .pan(sine.range(0.3, 0.7).slow(7))
        .lpf(sine.range(800, 2500).slow(4))
        .lpq(15);

    // ---- ghost snares -------------------------------------------------------
    case 11:
      return sound("~ ~ ~ ~ ~ sd? ~ ~ ~ ~ ~ ~ ~ sd? ~ ~")
        .gain(0.18);

    // ---- bass shift — F# minor for tension ------------------------------
    case 12:
      return n(-14)
        .seg(16)
        .scale("f#:minor")
        .degradeBy("[0.4 0.5 0.6 0.7] / 8")
        .sound("sawtooth")
        .lpf(sine.range(400, 1800).slow(2.5))
        .pan(0.3)
        .room(0.1)
        .gain(0.18);

    // ---- high counter-melody — sawtooth octave 5 ------------------------
    case 13:
      return n("[7 9 11 12]*2")
        .scale("e:minor")
        .add(60)
        .sound("sawtooth")
        .gain(0.2)
        .attack(0.01)
        .decay(0.1)
        .sustain(0.4)
        .release(0.2)
        .lpf(sine.range(1500, 3500).slow(3))
        .delay(0.3)
        .pan(sine.range(0.2, 0.8).slow(5))
        .room(0.3);

    // ---- snare fill ---------------------------------------------------------
    case 14:
      return sound("~ ~ sd ~ ~ ~ sd ~")
        .gain(0.4)
        .room(0.2);

    // ---- full arrangement — extra texture & fx --------------------------
    case 15:
      return n(irand(12).sub(5))
        .scale("e:minor")
        .add(72)
        .sound("square")
        .fast(8)
        .gain(rand.range(0.1, 0.2))
        .degradeBy(0.5)
        .lpf(sine.range(2000, 5000).slow(2))
        .delay(0.5)
        .pan(rand.range(0, 1))
        .room(0.5);

    default:
      return silence;
  }
}
