import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadEnv } from "./lib/env";
import { createAuthRoutes } from "./routes/auth";
import { createArticleRoutes } from "./routes/articles";
import { createUploadRoutes } from "./routes/uploads";
import { createUserRoutes } from "./routes/users";

const env = loadEnv();
const app = new Hono();

const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0];
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Something went wrong on the server. Your work is kept locally — try saving again." }, 500);
});

app.get("/health", (c) => c.json({ ok: true }));
app.route("/api/auth", createAuthRoutes(env));
app.route("/api/users", createUserRoutes(env));
app.route("/api/articles", createArticleRoutes(env));
app.route("/api/uploads", createUploadRoutes(env));
app.use(
  "/uploads/*",
  serveStatic({
    root: path.relative(process.cwd(), path.resolve(env.UPLOAD_DIR)) || ".",
    rewriteRequestPath: (requestPath) => requestPath.replace(/^\/uploads/, ""),
  }),
);

serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`API listening on http://localhost:${env.PORT}`);
