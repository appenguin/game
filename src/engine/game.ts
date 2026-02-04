import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { RunScene } from "./scenes/RunScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 800,
  parent: "game-container",
  backgroundColor: "#0a1628",
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: "game-container",
  },
  input: {
    activePointers: 2,
  },
  audio: {
    // AudioContext injected at runtime in BootScene (shared with Strudel)
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, RunScene],
};

export function startGame(containerId: string): Phaser.Game {
  config.parent = containerId;
  return new Phaser.Game(config);
}
