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
    if (document.hidden) {
      // App went to background - trigger pause
      triggerPause();
    }
    // Don't auto-resume when returning to foreground - let user resume manually
  });
});

// Expose pause function for Android back button
declare global {
  interface Window {
    androidPause?: () => void;
  }
}

function triggerPause() {
  // Dispatch ESC key event to trigger pause in the active scene
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    which: 27,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
}

window.androidPause = triggerPause;
