import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };
const isAndroid = process.env.VITE_PLATFORM === "android";
const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    // No service worker inside the Capacitor WebView: skip the plugin entirely on the Android build.
    ...(isAndroid
      ? []
      : [
          VitePWA({
            registerType: "prompt",
            injectRegister: false,
            includeAssets: ["favicon.svg", "apple-touch-icon-180x180.png"],
            manifest: {
              name: "Nocturne",
              short_name: "Nocturne",
              description: "Your day, printed as a single issue.",
              theme_color: "#0A1024",
              background_color: "#0A1024",
              display: "standalone",
              orientation: "any",
              start_url: base,
              scope: base,
              icons: [
                { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
                { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
                { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
                { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
              ],
            },
            workbox: {
              globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}"],
              navigateFallback: `${base}index.html`,
              maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
            },
          }),
        ]),
  ],
  build: { target: "es2022", sourcemap: false },
});
