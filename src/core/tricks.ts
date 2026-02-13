/** A trick performed mid-air */
export interface Trick {
  name: string;
  points: number;
  rotation: number; // radians to rotate penguin
}

export const TRICKS: Record<string, Trick> = {
  flip: { name: "Flip", points: 300, rotation: Math.PI * 2 },
  tuck: { name: "Tuck", points: 200, rotation: 0 },
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

/** Can this trick be queued? Enough air time remaining */
export function canQueueTrick(
  _queue: Trick[],
  _trick: Trick,
  timeLeft: number,
): boolean {
  return timeLeft > 0.4;
}
