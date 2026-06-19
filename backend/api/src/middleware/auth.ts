import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import type { UserRole } from "@workspace/content";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import { verifyToken } from "../lib/auth";
import type { Env } from "../lib/env";

export type AppVariables = {
  user: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
};

export function authMiddleware(secret: string, databaseUrl: string) {
  return createMiddleware<{ Variables: AppVariables; Bindings: Env }>(async (c, next) => {
    const header = c.req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const payload = verifyToken(token, secret);
      const db = getDb(databaseUrl);
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          name: users.name,
          active: users.active,
        })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!user?.active) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      c.set("user", {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });
      return await next();
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }
  });
}

export function requireRole(...roles: UserRole[]) {
  return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const user = c.get("user");
    if (!roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    return await next();
  });
}
