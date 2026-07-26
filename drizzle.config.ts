import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./api/src/db/schema.ts",
  dialect: "sqlite",
  // For local dev, use the wrangler local D1 SQLite file:
  // driver: "d1-http" when deploying against live D1
  dbCredentials: {
    url: ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/passura-sync.sqlite",
  },
});
