const KEY = "penguinski:scores";

export interface BestRun {
  score: number;
  distance: number;
}

function load(): Record<string, BestRun> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Save score for a difficulty level. Returns true if it's a new high score. */
export function saveScore(level: number, score: number, distance: number): boolean {
  const data = load();
  const existing = data[level];
  if (existing && existing.score >= score) return false;
  data[level] = { score, distance };
  localStorage.setItem(KEY, JSON.stringify(data));
  return true;
}

/** Get the best run for a difficulty level, or null if none. */
export function getBest(level: number): BestRun | null {
  const data = load();
  return data[level] ?? null;
}
