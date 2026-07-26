import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Heavy visualisation libs ──────────────────────────────────
          if (id.includes("@xyflow") || id.includes("@dagrejs")) {
            return "vendor-flow";
          }
          // ── Date utilities ────────────────────────────────────────────
          if (id.includes("date-fns")) {
            return "vendor-date";
          }
          // ── Charting ─────────────────────────────────────────────────
          if (id.includes("recharts") || id.includes("/d3-")) {
            return "vendor-charts";
          }
          // ── Core React ───────────────────────────────────────────────
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-hook-form") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          // ── TanStack ──────────────────────────────────────────────────
          if (id.includes("@tanstack")) {
            return "vendor-tanstack";
          }
          // ── UI primitives ─────────────────────────────────────────────
          if (
            id.includes("@base-ui") ||
            id.includes("cmdk") ||
            id.includes("lucide-react")
          ) {
            return "vendor-ui";
          }
          // ── Local DB ──────────────────────────────────────────────────
          if (id.includes("dexie")) {
            return "vendor-db";
          }
          // ── Screen route chunks ───────────────────────────────────────
          const screens = [
            "clans", "loans", "receipts", "handovers", "obligations",
            "participants", "groups", "animal-types", "backup", "sync",
            "profile", "dashboard",
          ];
          for (const screen of screens) {
            if (
              id.includes(`/routes/dashboard/${screen}`) ||
              id.includes(`/screen/${screen}`)
            ) {
              return `route-${screen}`;
            }
          }
          if (id.includes("/routes/login") || id.includes("/auth/")) {
            return "route-auth";
          }
          // ── Remaining node_modules ────────────────────────────────────
          if (id.includes("node_modules")) {
            return "vendor-misc";
          }
        },
      },
    },
  },
  plugins: [
    TanStackRouterVite({ routesDirectory: "src/routes" }),
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
          { src: "/images/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/images/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
