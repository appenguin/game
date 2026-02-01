/**
 * Musical pattern definitions for Ice Drift.
 *
 * Edit this file to change the music. Each level defines a full mix
 * of instruments — as score increases, the arrangement progresses
 * through increasingly complex layers.
 *
 * Pattern functions (sound, note, stack, …) are Strudel globals
 * available after initStrudel() is called by the Music system.
 * Docs: https://strudel.cc/reference/
 *
 * Key: B minor — dark, driving atmosphere.
 * Uses TR-909 drum samples + synth oscillators (saw, supersaw).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = () => globalThis as any;

// ---------------------------------------------------------------------------
// Distance thresholds (meters) — distance required to unlock each level (0-15)
// Instruments enter one at a time for a progressive build.
// ---------------------------------------------------------------------------

export const LEVEL_THRESHOLDS = [
  0,    // 0  Silence
  20,   // 1  Bass intro
  60,   // 2  + kick
  100,  // 3  + hi-hats
  160,  // 4  + snare
  240,  // 5  + ghost snares, deep bass
  340,  // 6  + lead (b4)
  460,  // 7  + lead shift (d5)
  580,  // 8  + lead shift (c#5)
  720,  // 9  bass change + lead
  880,  // 10 + lead shift (d5)
  1040, // 11 + lead shift (c#5)
  1240, // 12 bass progression
  1480, // 13 bass double-time
  1720, // 14 + lead melody
  2000, // 15 full solo
];

// ---------------------------------------------------------------------------
// Tempo
// ---------------------------------------------------------------------------

export const BASE_BPM = 130;
export const LEVEL_BPM = [110, 124, 140]; // Easy, Medium, Hard

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map distance (meters) → music level (0-15). */
export function getMusicLevel(meters: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (meters >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Death pattern
// ---------------------------------------------------------------------------

export function getDeathPattern(): any {
  const { silence } = g();
  return silence;
}

// ---------------------------------------------------------------------------
// Pattern definitions — full arrangement per level
//
// Each level returns a complete stack of instruments.
// Instruments enter one at a time for a progressive build:
//   0: silence → 1: bass → 2: +kick → 3: +hh → 4: +snare →
//   5: +ghost → 6-8: leads → 9-11: bass change + leads →
//   12-13: bass progressions → 14: +melody → 15: full solo
//
// Strudel cheat-sheet:
//   note("b2*4")           4 B2 notes per cycle
//   sound("supersaw")      oscillator type
//   .bank("tr909")         sample bank
//   .gain(0.3)             volume
//   .lpf(800)              low-pass filter cutoff
//   .lpq(4)                filter resonance
//   .decay(0.1)            amp envelope
//   .fast(2) / .slow(2)    speed
//   .room(0.3)             reverb send
//   .delay(0.2)            delay send
//   .degradeBy(0.3)        randomly drop 30% of events
//   .orbit(n)              audio bus routing
//   .duck(n)               sidechain ducking
//   sine.range(a,b)        sine LFO mapped to range
// ---------------------------------------------------------------------------

export function getPatternForLevel(level: number): any {
  const { sound, note, stack, silence, sine } = g();

  // -- Instruments ----------------------------------------------------------

  const kick = sound("bd*4")
    .sustain(0.6).decay(0.05).gain(0.5)
    .duck(2).duckattack(0.17).duckdepth(0.4);

  const hh = sound("~ hh").fast(4)
    .sustain(0.25).release(0.05).room(0.2);

  const snare = sound("~ ~ sd ~ ~ ~ sd ~")
    .sustain(0.4);

  const ghost = sound("sd sd ~ sd sd sd ~ sd")
    .degradeBy(0.8).sustain(0.4).gain(0.3);

  const bass = note("b2 f#2 d2 <a1 a2>").fast(4)
    .sound("supersaw")
    .lpf(sine.range(1000, 5000).slow(4))
    .orbit(2);

  const lead1a = note("- b4").fast(4).sound("saw")
    .lpf(sine.range(800, 4000).lpq(4).slow(8))
    .gain(0.5).delay(0.2);
  const lead1b = lead1a.note("d5").delay(0.4);
  const lead1c = lead1a.note("c#5").delay(0.5);

  const bass2 = bass.note("b1").orbit(2);
  const bass3 = bass2.note("[b1 d2 e2 [eb2 d2]]/4");
  const bass4 = bass3.note("[b1 d2 e2 [eb2 d2]]/2");

  const lead2 = lead1a.note("[f#4 [b4 b4 <b4 d5> b4]]/4");

  const lead3 = note(`<
b4 d5 f#5 d5 f#5 e5 f#5 g5 a5 b5 f#5 d5 f#5 e5 d5 c#5
b4 c#5 d5 c#5 e5 d5 c#5 d5 f#5 e5 d5 e5 f#5 e5 d5 bb4
b4 _ _ _ b4 d5 f#5 b5 a5 b5 f#5 d5 f#5 e5 d5 c#5
b4 c#5 d5 c#5 e5 d5 c#5 d5 f#5 e5 d5 e5 f#5 e5 d5 bb4
>`).fast(16).sound("saw").lpf(3000).lpq(2).gain(0.2);

  // -- Arrangement ----------------------------------------------------------

  switch (level) {
    case 0:  return silence;
    case 1:  return bass;
    case 2:  return stack(kick, bass);
    case 3:  return stack(kick, hh, bass);
    case 4:  return stack(kick, hh, snare, bass);
    case 5:  return stack(kick, hh, snare, ghost, bass2);
    case 6:  return stack(kick, hh, snare, ghost, bass2, lead1a);
    case 7:  return stack(kick, hh, snare, ghost, bass2, lead1b);
    case 8:  return stack(kick, hh, snare, ghost, bass2, lead1c);
    case 9:  return stack(kick, hh, snare, ghost, bass, lead1a);
    case 10: return stack(kick, hh, snare, ghost, bass, lead1b);
    case 11: return stack(kick, hh, snare, ghost, bass, lead1c);
    case 12: return stack(kick, hh, snare, ghost, bass3);
    case 13: return stack(kick, hh, snare, ghost, bass4);
    case 14: return stack(kick, hh, snare, ghost, bass4, lead2);
    case 15: return stack(kick, hh, snare, ghost, bass3, lead3);
    default: return silence;
  }
}
