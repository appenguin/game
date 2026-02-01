/** All slope object type strings */
export type SlopeObjectType =
  | "rock"
  | "tree"
  | "ramp"
  | "fish"
  | "ice"
  | "crevasse"
  | "mogul"
  | "snowdrift";

/** Difficulty zone (0-3) based on distance traveled */
export function getDifficulty(distance: number): number {
  if (distance < 500) return 0;
  if (distance < 1500) return 1;
  if (distance < 3000) return 2;
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

const SPAWN_INTERVALS = [0.5, 0.38, 0.28, 0.2];
const RAMP_INTERVALS = [2.5, 2.0, 1.8, 1.5];

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
  // Difficulty 0 — Easy: lots of trees, fish, rare rocks
  [
    [0.10, "rock"],
    [0.50, "tree"],
    [0.58, "snowdrift"],
    [1.0, "fish"],
  ],
  // Difficulty 1 — Medium: trees dominant, ice patches, some rocks
  [
    [0.15, "rock"],
    [0.50, "tree"],
    [0.58, "ice"],
    [0.64, "snowdrift"],
    [0.70, "crevasse"],
    [1.0, "fish"],
  ],
  // Difficulty 2 — Hard: dense trees, moguls, crevasses
  [
    [0.18, "rock"],
    [0.48, "tree"],
    [0.56, "ice"],
    [0.63, "crevasse"],
    [0.72, "mogul"],
    [0.78, "snowdrift"],
    [1.0, "fish"],
  ],
  // Difficulty 3 — Expert: everything, trees still common
  [
    [0.20, "rock"],
    [0.45, "tree"],
    [0.53, "crevasse"],
    [0.61, "ice"],
    [0.70, "mogul"],
    [0.76, "snowdrift"],
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
