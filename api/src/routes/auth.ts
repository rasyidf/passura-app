import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { elders } from "../db/schema";
import { signJwt, verifyPassword } from "../lib/auth";

type Env = { DB: D1Database; JWT_SECRET: string };

export const authRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, elder: { id, name, email, role } }
 */
authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => null);

  if (!body?.email || !body?.password) {
    return c.json({ error: "email and password required" }, 400);
  }

  const db = drizzle(c.env.DB);

  const elder = await db
    .select()
    .from(elders)
    .where(eq(elders.email, body.email.toLowerCase().trim()))
    .get();

  if (!elder) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(body.password, elder.passwordHash, elder.salt);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await signJwt(
    { elderId: elder.id, email: elder.email, role: elder.role },
    c.env.JWT_SECRET,
  );

  return c.json({
    token,
    elder: { id: elder.id, name: elder.name, email: elder.email, role: elder.role, clan: elder.clan },
  });
});
