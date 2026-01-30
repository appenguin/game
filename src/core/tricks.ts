/** A trick performed mid-air */
export interface Trick {
  name: string;
  points: number;
  rotation: number; // radians to rotate penguin
}

export const TRICKS: Record<string, Trick> = {
  up: { name: "Backflip", points: 300, rotation: Math.PI * 2 },
  down: { name: "Front Tuck", points: 250, rotation: -Math.PI * 2 },
};

/** Sum base points + variety bonus (+50 per extra trick) */
export function calcTrickScore(queue: Trick[]): number {
  let total = 0;
  for (let i = 0; i < queue.length; i++) {
    total += queue[i].points;
    if (i > 0) total += 50;
  }
  return total;
}

/** Can this trick be queued? Not already in queue + enough air time remaining */
export function canQueueTrick(
  queue: Trick[],
  trick: Trick,
  timeLeft: number,
): boolean {
  if (timeLeft <= 0.4) return false;
  return !queue.some((t) => t.name === trick.name);
}
