import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import type { Env } from "../lib/env";
import type { AppVariables } from "../middleware/auth";
import { authMiddleware, requireRole } from "../middleware/auth";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  password: z.string().min(8),
  role: z.enum(["superadmin", "editor"]).default("editor"),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  role: z.enum(["superadmin", "editor"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export function createUserRoutes(env: Env) {
  const app = new Hono<{ Variables: AppVariables }>();
  const guard = authMiddleware(env.JWT_SECRET, env.DATABASE_URL);

  app.use("*", guard, requireRole("superadmin"));

  app.get("/", async (c) => {
    const db = getDb(env.DATABASE_URL);
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    return c.json({
      users: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  });

  app.post("/", async (c) => {
    const body = createUserSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: body.error.flatten() }, 400);
    }

    const db = getDb(env.DATABASE_URL);
    const [created] = await db
      .insert(users)
      .values({
        email: body.data.email.toLowerCase(),
        name: body.data.name,
        passwordHash: await bcrypt.hash(body.data.password, 12),
        role: body.data.role,
        active: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        active: users.active,
        createdAt: users.createdAt,
      });

    return c.json({
      user: {
        ...created,
        createdAt: created.createdAt.toISOString(),
      },
    }, 201);
  });

  app.patch("/:id", async (c) => {
    const body = updateUserSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: body.error.flatten() }, 400);
    }

    const db = getDb(env.DATABASE_URL);
    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.data.name) updates.name = body.data.name;
    if (body.data.role) updates.role = body.data.role;
    if (body.data.active !== undefined) updates.active = body.data.active;
    if (body.data.password) updates.passwordHash = await bcrypt.hash(body.data.password, 12);

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, c.req.param("id")))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        active: users.active,
        createdAt: users.createdAt,
      });

    if (!updated) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({
      user: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  });

  return app;
}
