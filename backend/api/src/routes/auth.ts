import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import { signToken } from "../lib/auth";
import type { Env } from "../lib/env";
import type { AppVariables } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function createAuthRoutes(env: Env) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.post("/login", async (c) => {
    const body = loginSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: "Invalid credentials payload" }, 400);
    }

    const db = getDb(env.DATABASE_URL);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.data.email.toLowerCase()))
      .limit(1);

    if (!user?.active) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const valid = await bcrypt.compare(body.data.password, user.passwordHash);
    if (!valid) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const token = signToken(
      { sub: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
    );

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  });

  app.get("/me", authMiddleware(env.JWT_SECRET, env.DATABASE_URL), (c) => {
    return c.json({ user: c.get("user") });
  });

  return app;
}
