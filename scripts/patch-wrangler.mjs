/**
 * Patches dist/client/wrangler.json after the Cloudflare Vite build.
 *
 * @cloudflare/vite-plugin currently generates a wrangler.json with
 * assets-only config (no `main`). This script adds the `main` pointing
 * to the SSR Worker entry produced by TanStack Start, and sets the
 * assets binding so the Worker can serve static files.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const configPath = resolve(root, "dist/client/wrangler.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

// Point to the SSR Worker built by TanStack Start
config.main = "../server/server.js";

// Keep assets served from dist/client, bound as ASSETS
config.assets = { directory: ".", binding: "ASSETS" };

writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log("✓ Patched dist/client/wrangler.json with main + ASSETS binding");
