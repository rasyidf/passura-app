import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "node:path";

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [
    // NOTE: Enable cloudflare plugin when deploying to CF Workers:
    // cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "images/**/*"],
      manifest: {
        name: "Passura - Buku Besar Adat Digital",
        short_name: "Passura",
        description:
          "Sistem pencatatan buku besar adat Toraja secara digital dan offline-first.",
        theme_color: "#ea580c",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/images/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/images/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/_serverFn\//],
      },
    }),
  ],
});
