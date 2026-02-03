/**
 * Musical pattern definitions for PenguinSki.
 *
 * Edit this file to change the music. Each level defines a full mix
 * of instruments — as distance increases, the arrangement progresses
 * through increasingly complex layers.
 *
 * Pattern functions (sound, note, stack, …) are Strudel globals
 * available after initStrudel() is called by the Music system.
 * Docs: https://strudel.cc/reference/
 *
 * Key: B minor — dark, driving atmosphere.
 * Uses TR-909 drum samples + synth oscillators (sawtooth).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = () => globalThis as any;

// ---------------------------------------------------------------------------
// Distance thresholds (meters) — distance required to unlock each level (0-14)
// Instruments enter one at a time for a progressive build.
// ---------------------------------------------------------------------------

export const LEVEL_THRESHOLDS = [
  0,    // 0  Silence
  5,    // 1  Chord pad
  50,   // 2  + bass
  120,  // 3  Bass solo
  200,  // 4  + kick
  280,  // 5  + hi-hats
  370,  // 6  + snare
  460,  // 7  deep bass (bass2)
  560,  // 8  + ghost snares
  680,  // 9  + lead arrangement (cycles a/b/c)
  810,  // 10 bass change + lead
  950,  // 11 bass3 progression
  1080, // 12 bass4 double-time
  1260, // 13 + lead2 melody
  1500, // 14 full solo
];

// ---------------------------------------------------------------------------
// Tempo
// ---------------------------------------------------------------------------

export const BASE_BPM = 140;
export const LEVEL_BPM = [110, 124, 140]; // Easy, Medium, Hard

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map distance (meters) → music level (0-14). */
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
// Instruments enter one at a time:
//   0: silence → 1: chord → 2: +bass → 3: bass solo →
//   4: +kick → 5: +hh → 6: +snare → 7: bass2 → 8: +ghost →
//   9: +lead (arrange a/b/c) → 10: bass change+lead →
//   11: bass3 → 12: bass4 → 13: +lead2 → 14: full solo
//
// Strudel cheat-sheet:
//   note("b2*4")           4 B2 notes per cycle
//   sound("sawtooth")      oscillator type
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
//   arrange([n, pat], …)   play sections sequentially
// ---------------------------------------------------------------------------

export function getPatternForLevel(level: number): any {
  const { sound, note, stack, silence, sine, arrange } = g();

  // -- Instruments ----------------------------------------------------------

  const chord = note("b2,d3,f#3,a3,b3")
    .sound("triangle").gain(0.2).lpf(2000).room(0.5);

  const bass = note("b2 f#2 d2 <a1 a2>").fast(4)
    .sound("sawtooth")
    .lpf(sine.range(1000, 3000).slow(4))
    .orbit(2);

  const kick = sound("bd*4")
    .sustain(0.6).decay(0.05).gain(0.5)
    .duck(2).duckattack(0.17).duckdepth(0.4);

  const hh = sound("~ hh").fast(4)
    .sustain(0.25).release(0.05).room(0.2);

  const snare = sound("~ ~ sd ~ ~ ~ sd ~")
    .sustain(0.4);

  const ghost = sound("sd sd ~ sd sd sd ~ sd")
    .degradeBy(0.8).sustain(0.4).gain(0.3).bank("tr909");

  const lead1a = note("- b4").fast(4).sound("sawtooth")
    .lpf(sine.range(800, 4000).lpq(4).slow(8))
    .gain(0.5).delay(0.3);
  const lead1b = lead1a.note("d5").delay(0.4);
  const lead1c = lead1a.note("c#5").delay(0.5);
  const lead = arrange(
    [4, lead1a],
    [2, lead1b],
    [2, lead1c],
  );

  const bass2 = bass.note("b1").orbit(2);
  const bass3 = bass2.note("[b1 d2 e2 [eb2 d2]]/4");
  const bass4 = bass3.note("[b1 d2 e2 [eb2 d2]]/2");

  const lead2 = lead1a.note("[f#4 [b4 b4 <b4 d5> b4]]/4");

  const lead3 = note(`<
b4 d5 f#5 d5 f#5 e5 f#5 g5 a5 b5 f#5 d5 f#5 e5 d5 c#5
b4 c#5 d5 c#5 e5 d5 c#5 d5 f#5 e5 d5 e5 f#5 e5 d5 bb4
b4 _ _ _ b4 d5 f#5 b5 a5 b5 f#5 d5 f#5 g5 a5 b5
b4 c#5 d5 c#5 e5 d5 c#5 d5 f#5 e5 d5 e5 f#5 e5 d5 c#5
>`).fast(16).sound("sawtooth").lpf(3000).lpq(2).gain(0.25).delay(0.1);

  // -- Arrangement ----------------------------------------------------------

  switch (level) {
    case 0:  return silence;
    case 1:  return chord;
    case 2:  return stack(chord, bass);
    case 3:  return bass;
    case 4:  return stack(bass, kick);
    case 5:  return stack(bass, kick, hh);
    case 6:  return stack(bass, kick, hh, snare);
    case 7:  return stack(bass2, kick, hh, snare);
    case 8:  return stack(bass2, kick, hh, snare, ghost);
    case 9:  return stack(bass2, kick, hh, snare, ghost, lead);
    case 10: return stack(bass, kick, hh, snare, ghost, lead);
    case 11: return stack(bass3, kick, hh, snare, ghost);
    case 12: return stack(bass4, kick, hh, snare, ghost);
    case 13: return stack(bass4, kick, hh, snare, ghost, lead2);
    case 14: return stack(bass3, kick, hh, snare, ghost, lead3);
    default: return silence;
  }
}
