/** All slope object type strings */
export type SlopeObjectType =
  | "rock"
  | "tree"
  | "ramp"
  | "fish"
  | "ice"
  | "mogul"
  | "snowdrift";

/** Difficulty zone (0-3) based on distance in meters */
export function getDifficulty(meters: number): number {
  if (meters < 300) return 0;
  if (meters < 800) return 1;
  if (meters < 1500) return 2;
  return 3;
}

/** Speed profiles per player-selected level (Easy/Medium/Hard) */
export const SPEED_PROFILES = [
  { start: 150, accel: 0.02, cap: 350 }, // Easy
  { start: 200, accel: 0.04, cap: 500 }, // Medium
  { start: 280, accel: 0.07, cap: 600 }, // Hard
];

/** Base scroll speed for given distance and player level (0-2) */
export function getBaseSpeed(distance: number, level: number = 1): number {
  const p = SPEED_PROFILES[level] ?? SPEED_PROFILES[1];
  return Math.min(p.cap, p.start + distance * p.accel);
}

const SPAWN_INTERVALS = [0.6, 0.42, 0.3, 0.22];
const RAMP_INTERVALS = [3.0, 2.2, 1.8, 1.5];

/** Obstacle spawn interval for given difficulty */
export function getSpawnInterval(difficulty: number): number {
  return SPAWN_INTERVALS[difficulty] ?? SPAWN_INTERVALS[3];
}

/** Ramp spawn interval for given difficulty */
export function getRampInterval(difficulty: number): number {
  return RAMP_INTERVALS[difficulty] ?? RAMP_INTERVALS[3];
}

// Spawn weight tables per difficulty: [threshold, type][]
// Evaluated in order; first threshold the roll falls under wins.
type SpawnEntry = [number, SlopeObjectType];

const SPAWN_TABLES: SpawnEntry[][] = [
  // Difficulty 0 — Gentle: mostly fish, some trees, ice early, very rare rocks
  [
    [0.03, "rock"],
    [0.22, "tree"],
    [0.32, "ice"],
    [0.37, "snowdrift"],
    [1.0, "fish"],
  ],
  // Difficulty 1 — Building: more trees, ice common, some rocks
  [
    [0.12, "rock"],
    [0.37, "tree"],
    [0.50, "ice"],
    [0.56, "snowdrift"],
    [1.0, "fish"],
  ],
  // Difficulty 2 — Tough: dense obstacles, moguls, less fish
  [
    [0.22, "rock"],
    [0.47, "tree"],
    [0.60, "ice"],
    [0.68, "mogul"],
    [0.76, "snowdrift"],
    [1.0, "fish"],
  ],
  // Difficulty 3 — Expert: rocks and trees dominant, fish scarce
  [
    [0.30, "rock"],
    [0.52, "tree"],
    [0.65, "ice"],
    [0.73, "mogul"],
    [0.81, "snowdrift"],
    [1.0, "fish"],
  ],
];

/** Roll against spawn weight table, returns obstacle type */
export function pickObstacleType(difficulty: number): SlopeObjectType {
  const table = SPAWN_TABLES[difficulty] ?? SPAWN_TABLES[3];
  const roll = Math.random();
  for (const [threshold, type] of table) {
    if (roll < threshold) return type;
  }
  return "fish";
}
