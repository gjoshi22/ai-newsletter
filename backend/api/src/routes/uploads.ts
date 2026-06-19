import { Hono } from "hono";
import type { Env } from "../lib/env";
import { storeUpload } from "../lib/uploads";
import type { AppVariables } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";

export function createUploadRoutes(env: Env) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use("*", authMiddleware(env.JWT_SECRET, env.DATABASE_URL));

  app.post("/", async (c) => {
    const body = await c.req.parseBody().catch(() => null);
    if (!body) {
      return c.json({ error: "That upload didn't come through correctly. Please try the file again." }, 400);
    }
    const file = body.file;
    if (!(file instanceof File)) {
      return c.json({ error: "Expected multipart field `file`" }, 400);
    }

    try {
      const url = await storeUpload(file, env);
      return c.json({ url });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      return c.json({ error: message }, 400);
    }
  });

  return app;
}
