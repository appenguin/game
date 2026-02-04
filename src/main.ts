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

  // Auto-pause when app goes to background (Android home/multitask, iOS switch, browser tab hide)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && window.__gamePause) {
      window.__gamePause();
    }
    // Don't auto-resume when returning to foreground - let user resume manually
  });
});

// Global pause hooks (set by RunScene when active)
declare global {
  interface Window {
    __gameTogglePause?: () => void;
    __gamePause?: () => void;
  }
}
