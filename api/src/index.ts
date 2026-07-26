import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors";
import { authRoutes } from "./routes/auth";
import { syncRoutes } from "./routes/sync";
import { entityRoutes } from "./routes/entities";

type Env = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

// ─── Global CORS (preflight + actual) ────────────────────────────────────────
app.use("/api/*", corsMiddleware);

// ─── Public ───────────────────────────────────────────────────────────────────
app.route("/api/auth", authRoutes);

// ─── Protected ────────────────────────────────────────────────────────────────
app.route("/api/sync", syncRoutes);
app.route("/api", entityRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok", service: "passura-api", ts: Date.now() }));

export default app;
