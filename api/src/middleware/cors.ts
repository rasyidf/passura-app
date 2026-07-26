import { cors } from "hono/cors";

export const corsMiddleware = cors({
  origin: (origin) => {
    // Allow all origins in dev; restrict in prod via env if needed
    const allowed = [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://passura-app.workers.dev",
      "https://passura.vercel.app",
    ];
    return allowed.includes(origin) ? origin : allowed[0];
  },
  allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
});
