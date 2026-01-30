import { startGame } from "./engine/game";

document.addEventListener("DOMContentLoaded", () => {
  startGame("game-container");

  // Lock to portrait orientation when the API is available (PWA/fullscreen mode)
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
  };
  if (typeof orientation.lock === "function") {
    orientation.lock("portrait-primary").catch(() => {});
  }
});
