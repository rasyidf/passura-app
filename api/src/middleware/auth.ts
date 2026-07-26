import { createMiddleware } from "hono/factory";
import { verifyJwt, type JwtPayload } from "../lib/auth";

type Env = { DB: D1Database; JWT_SECRET: string };

declare module "hono" {
  interface ContextVariableMap {
    auth: JwtPayload;
  }
}

export const requireAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const header = c.req.header("authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required" }, 401);
  }
  const token = header.slice(7);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  c.set("auth", payload);
  await next();
});

export const requireRole = (...roles: string[]) =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const auth = c.get("auth");
    if (!auth || !roles.includes(auth.role)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
    await next();
  });
