import { defineConfig } from "vite";
import { execSync } from "child_process";
import { VitePWA } from "vite-plugin-pwa";

const commitHash = execSync("git rev-parse --short HEAD").toString().trim();
const buildDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");

export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  base: "./",
  build: {
    minify: "terser",
    terserOptions: {
      compress: { passes: 2 },
      mangle: true,
      format: { comments: false },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "PenguinSki",
        short_name: "PenguinSki",
        description: "Penguin downhill ski game",
        start_url: "./",
        display: "fullscreen",
        orientation: "portrait",
        background_color: "#0a1628",
        theme_color: "#0a1628",
        icons: [
          {
            src: "assets/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "assets/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,jpg,svg,woff2}"],
      },
    }),
  ],
  server: {
    port: 8080,
    allowedHosts: true,
  },
});
