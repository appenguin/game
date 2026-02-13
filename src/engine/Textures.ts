import Phaser from "phaser";

/**
 * Generates all procedural textures used by the game.
 * Call from a scene's preload() after loading sprite sheets.
 */
export function generateTextures(scene: Phaser.Scene): void {
  // Particle textures
  const particles: [string, number, number, number][] = [
    ["snow-particle", 0x9ec5e8, 4, 8],
    ["gold-particle", 0xfbbf24, 3, 6],
    ["red-particle", 0xef4444, 3, 6],
    ["yellow-particle", 0xfde047, 2, 4],
    ["gray-particle", 0x6b7280, 4, 8],
    ["cyan-particle", 0x67e8f9, 2, 4],
    ["white-particle", 0xe2e8f0, 2.5, 5],
  ];
  const g = scene.add.graphics();
  for (const [key, color, radius, size] of particles) {
    if (!scene.textures.exists(key)) {
      g.clear();
      g.fillStyle(color);
      g.fillCircle(radius, radius, radius);
      g.generateTexture(key, size, size);
    }
  }
  g.destroy();

  // Snow background texture (tileable)
  if (!scene.textures.exists("snow-bg")) {
    const bg = scene.add.graphics();
    const size = 128;
    bg.fillStyle(0xf6f9ff);
    bg.fillRect(0, 0, size, size);
    const snow = (v: number) => (v << 16) | (v << 8) | v;
    // Soft broad variation
    for (let i = 0; i < 40; i++) {
      const sx = Math.random() * size;
      const sy = Math.random() * size;
      const sr = 2 + Math.random() * 5;
      bg.fillStyle(snow(244 + Math.floor(Math.random() * 12)), 0.1 + Math.random() * 0.1);
      bg.fillCircle(sx, sy, sr);
    }
    // Fine grain
    for (let i = 0; i < 250; i++) {
      const sx = Math.random() * size;
      const sy = Math.random() * size;
      const sr = 0.3 + Math.random() * 0.8;
      bg.fillStyle(snow(240 + Math.floor(Math.random() * 16)), 0.2 + Math.random() * 0.3);
      bg.fillCircle(sx, sy, sr);
    }
    // Sparkle pinpoints
    for (let i = 0; i < 100; i++) {
      const sx = Math.random() * size;
      const sy = Math.random() * size;
      const sr = 0.2 + Math.random() * 0.4;
      bg.fillStyle(0xffffff, 0.3 + Math.random() * 0.5);
      bg.fillCircle(sx, sy, sr);
    }
    // Shadow pinpoints
    for (let i = 0; i < 60; i++) {
      const sx = Math.random() * size;
      const sy = Math.random() * size;
      const sr = 0.3 + Math.random() * 0.6;
      bg.fillStyle(snow(230 + Math.floor(Math.random() * 16)), 0.15 + Math.random() * 0.15);
      bg.fillCircle(sx, sy, sr);
    }
    bg.generateTexture("snow-bg", size, size);
    bg.destroy();
  }

  // Ramp texture (procedural snow wedge)
  if (!scene.textures.exists("ramp-tex")) {
    const rg = scene.add.graphics();
    const rw = 60, rh = 32;
    // Shadow underneath
    rg.fillStyle(0x8faabe, 0.3);
    rg.beginPath();
    rg.moveTo(-2, 3);
    rg.lineTo(rw + 2, 3);
    rg.lineTo(rw - 8, rh + 2);
    rg.lineTo(8, rh + 2);
    rg.closePath();
    rg.fillPath();
    // Ramp body — trapezoid (wider at top/lip, narrower at base)
    rg.fillStyle(0xdce8f4);
    rg.beginPath();
    rg.moveTo(0, 0);
    rg.lineTo(rw, 0);
    rg.lineTo(rw - 10, rh);
    rg.lineTo(10, rh);
    rg.closePath();
    rg.fillPath();
    // Slope surface lines
    rg.lineStyle(0.5, 0xb0c8dc, 0.4);
    for (let i = 6; i < rh - 2; i += 5) {
      const t = i / rh;
      const inset = t * 10;
      rg.beginPath();
      rg.moveTo(inset + 2, i);
      rg.lineTo(rw - inset - 2, i);
      rg.strokePath();
    }
    // Lip highlight (bottom edge / launch lip)
    rg.fillStyle(0xf4f8ff);
    rg.fillRect(12, rh - 3, rw - 24, 3);
    // Outline
    rg.lineStyle(1.5, 0x8faabe);
    rg.beginPath();
    rg.moveTo(0, 0);
    rg.lineTo(rw, 0);
    rg.lineTo(rw - 10, rh);
    rg.lineTo(10, rh);
    rg.closePath();
    rg.strokePath();
    rg.generateTexture("ramp-tex", rw + 3, rh + 3);
    rg.destroy();
  }

  // Fish texture (procedural gold fish)
  if (!scene.textures.exists("fish-tex")) {
    const fg = scene.add.graphics();
    const fw = 18, fh = 12;
    const cx = fw / 2, cy = fh / 2;
    // Tail
    fg.fillStyle(0xe8920b);
    fg.beginPath();
    fg.moveTo(1, cy - 4);
    fg.lineTo(5, cy);
    fg.lineTo(1, cy + 4);
    fg.closePath();
    fg.fillPath();
    // Body (ellipse)
    fg.fillStyle(0xf59e0b);
    fg.fillEllipse(cx + 1, cy, 12, 9);
    // Belly highlight
    fg.fillStyle(0xfde68a, 0.5);
    fg.fillEllipse(cx + 2, cy - 1, 7, 4);
    // Eye
    fg.fillStyle(0x1a1a2e);
    fg.fillCircle(cx + 4, cy - 1, 1.2);
    fg.generateTexture("fish-tex", fw, fh);
    fg.destroy();
  }
}
