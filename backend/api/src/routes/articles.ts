import { Hono } from "hono";
import { and, desc, eq, inArray, like } from "drizzle-orm";
import { z } from "zod";
import type { ContentBlock } from "@workspace/content";
import { getDb } from "../db/client";
import { articles } from "../db/schema";
import { normalizeArticleInput, serializeAdminArticle, serializePublicArticle } from "../lib/articles";
import type { Env } from "../lib/env";
import type { AppVariables } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";

const blockSchema: z.ZodType<ContentBlock> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string() }),
  z.object({ type: z.literal("lead"), text: z.string() }),
  z.object({ type: z.literal("small"), text: z.string() }),
  z.object({ type: z.literal("center"), text: z.string() }),
  z.object({ type: z.literal("heading2"), text: z.string() }),
  z.object({ type: z.literal("heading3"), text: z.string() }),
  z.object({ type: z.literal("heading4"), text: z.string() }),
  z.object({
    type: z.literal("quote"),
    text: z.string(),
    align: z.enum(["left", "center"]).optional(),
  }),
  z.object({ type: z.literal("callout"), variant: z.enum(["note", "warning", "tip"]), text: z.string() }),
  z.object({ type: z.literal("divider") }),
  z.object({ type: z.literal("spacer") }),
  z.object({ type: z.literal("list"), items: z.array(z.string()) }),
  z.object({ type: z.literal("orderedList"), items: z.array(z.string()) }),
  z.object({ type: z.literal("code"), text: z.string(), language: z.string().optional() }),
  z.object({
    type: z.literal("image"),
    url: z.string().min(1),
    caption: z.string().optional(),
    alt: z.string().optional(),
  }),
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Drafts are intentionally permissive so writers can save early and often.
// Publish-quality requirements are enforced separately in publishProblem().
const articleInputSchema = z.object({
  title: z.string().trim().min(1, "Give your story a title first.").max(300),
  slug: z.string().regex(SLUG_PATTERN, "Use lowercase letters, numbers, and dashes only.").or(z.literal("")),
  excerpt: z.string().default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid publish date."),
  category: z.enum(["News", "Resources"]),
  subCategory: z.enum(["Design", "Development"]),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  asciiType: z.number().int().min(1).max(10).default(1),
  imageUrl: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  authorName: z.string().max(120).nullable().optional(),
  showAuthor: z.boolean().default(false),
  bodyBlocks: z.array(blockSchema).min(1),
});

const PUBLIC_STATUSES = ["published", "archived"] as const;

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  slug: "Web address",
  excerpt: "Subtitle",
  date: "Publish date",
  category: "Section",
  subCategory: "Topic",
  tags: "Tags",
  authorName: "Author name",
  sourceUrl: "Source link",
  imageUrl: "Cover photo",
  bodyBlocks: "Story content",
};

function formatValidationError(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Something in the story form is not valid.";
  const field = FIELD_LABELS[String(issue.path[0])] ?? "Story";
  return `${field}: ${issue.message}`;
}

function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

function publishProblem(normalized: ReturnType<typeof normalizeArticleInput>) {
  if (normalized.status === "draft") return null;
  if (normalized.title.length < 3) {
    return "Add a longer title before publishing.";
  }
  if (normalized.excerpt.length < 10) {
    return "Add a short subtitle before publishing — it appears under the title and on story cards.";
  }
  if (!normalized.body.trim()) {
    return "Write some story content before publishing.";
  }
  return null;
}

function resolvePublishedAt(
  status: "draft" | "published" | "archived",
  existingPublishedAt: Date | null,
) {
  if (status === "draft") return null;
  return existingPublishedAt ?? new Date();
}

export function createArticleRoutes(env: Env) {
  const app = new Hono<{ Variables: AppVariables }>();
  const guard = authMiddleware(env.JWT_SECRET, env.DATABASE_URL);

  async function ensureUniqueSlug(desired: string, excludeId?: string) {
    const db = getDb(env.DATABASE_URL);
    const rows = await db
      .select({ id: articles.id, slug: articles.slug })
      .from(articles)
      .where(like(articles.slug, `${desired}%`));
    const taken = new Set(rows.filter((row) => row.id !== excludeId).map((row) => row.slug));

    if (!taken.has(desired)) return desired;
    for (let suffix = 2; suffix < 100; suffix += 1) {
      const candidate = `${desired}-${suffix}`;
      if (!taken.has(candidate)) return candidate;
    }
    return `${desired}-${Date.now()}`;
  }

  async function slugTakenByAnother(slug: string, excludeId: string) {
    const db = getDb(env.DATABASE_URL);
    const [row] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);
    return Boolean(row && row.id !== excludeId);
  }

  app.get("/public", async (c) => {
    const db = getDb(env.DATABASE_URL);
    const rows = await db
      .select()
      .from(articles)
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.date), desc(articles.updatedAt));

    return c.json({
      articles: rows.map(serializePublicArticle),
    });
  });

  app.get("/public/archive", async (c) => {
    const db = getDb(env.DATABASE_URL);
    const rows = await db
      .select()
      .from(articles)
      .where(inArray(articles.status, [...PUBLIC_STATUSES]))
      .orderBy(desc(articles.date), desc(articles.updatedAt));

    return c.json({
      articles: rows.map(serializePublicArticle),
    });
  });

  app.get("/public/:slug", async (c) => {
    const db = getDb(env.DATABASE_URL);
    const [row] = await db
      .select()
      .from(articles)
      .where(and(
        eq(articles.slug, c.req.param("slug")),
        inArray(articles.status, [...PUBLIC_STATUSES]),
      ))
      .limit(1);

    if (!row) {
      return c.json({ error: "Article not found" }, 404);
    }

    return c.json({ article: serializePublicArticle(row) });
  });

  app.use("/*", guard);

  app.get("/", async (c) => {
    const db = getDb(env.DATABASE_URL);
    const rows = await db.select().from(articles).orderBy(desc(articles.updatedAt));
    return c.json({ articles: rows.map(serializeAdminArticle) });
  });

  app.get("/:id", async (c) => {
    const db = getDb(env.DATABASE_URL);
    const [row] = await db.select().from(articles).where(eq(articles.id, c.req.param("id"))).limit(1);
    if (!row) return c.json({ error: "Article not found" }, 404);
    return c.json({ article: serializeAdminArticle(row) });
  });

  app.post("/", async (c) => {
    const raw = await c.req.json().catch(() => null);
    if (!raw) return c.json({ error: "Invalid request body" }, 400);

    const body = articleInputSchema.safeParse(raw);
    if (!body.success) {
      return c.json({ error: formatValidationError(body.error) }, 400);
    }

    const user = c.get("user");
    const normalized = normalizeArticleInput(body.data);

    const problem = publishProblem(normalized);
    if (problem) return c.json({ error: problem }, 400);

    const desiredSlug = normalized.slug || slugifyTitle(normalized.title) || `story-${Date.now()}`;
    normalized.slug = await ensureUniqueSlug(desiredSlug);

    const db = getDb(env.DATABASE_URL);
    const [created] = await db
      .insert(articles)
      .values({
        ...normalized,
        createdBy: user.id,
        updatedBy: user.id,
        publishedAt: resolvePublishedAt(normalized.status, null),
      })
      .returning();

    return c.json({ article: serializeAdminArticle(created) }, 201);
  });

  app.patch("/:id", async (c) => {
    const raw = await c.req.json().catch(() => null);
    if (!raw) return c.json({ error: "Invalid request body" }, 400);

    const body = articleInputSchema.partial().safeParse(raw);
    if (!body.success) {
      return c.json({ error: formatValidationError(body.error) }, 400);
    }

    const user = c.get("user");
    const db = getDb(env.DATABASE_URL);
    const [existing] = await db.select().from(articles).where(eq(articles.id, c.req.param("id"))).limit(1);
    if (!existing) return c.json({ error: "Article not found" }, 404);

    // `?? existing` would swallow explicit nulls, making it impossible to
    // remove a cover photo, source link, or author name. Distinguish
    // "field omitted" (undefined) from "field cleared" (null).
    const provided = <K extends keyof typeof body.data>(key: K) => body.data[key] !== undefined;

    const mergedBlocks = body.data.bodyBlocks ?? (existing.bodyBlocks as ContentBlock[]);
    const normalized = normalizeArticleInput({
      title: body.data.title ?? existing.title,
      slug: body.data.slug ?? existing.slug,
      excerpt: body.data.excerpt ?? existing.excerpt,
      date: body.data.date ?? existing.date,
      category: body.data.category ?? existing.category,
      subCategory: body.data.subCategory ?? existing.subCategory,
      tags: body.data.tags ?? existing.tags ?? [],
      featured: body.data.featured ?? existing.featured,
      status: body.data.status ?? existing.status,
      asciiType: body.data.asciiType ?? existing.asciiType,
      imageUrl: provided("imageUrl") ? body.data.imageUrl ?? null : existing.imageUrl,
      sourceUrl: provided("sourceUrl") ? body.data.sourceUrl ?? null : existing.sourceUrl,
      authorName: provided("authorName") ? body.data.authorName ?? null : existing.authorName,
      showAuthor: body.data.showAuthor ?? existing.showAuthor,
      bodyBlocks: mergedBlocks,
    });

    if (!normalized.slug) {
      normalized.slug = existing.slug;
    }

    const problem = publishProblem(normalized);
    if (problem) return c.json({ error: problem }, 400);

    if (normalized.slug !== existing.slug && await slugTakenByAnother(normalized.slug, existing.id)) {
      return c.json({ error: "That web address is already used by another story. Pick a different one." }, 409);
    }

    const [updated] = await db
      .update(articles)
      .set({
        ...normalized,
        updatedBy: user.id,
        updatedAt: new Date(),
        publishedAt: resolvePublishedAt(normalized.status, existing.publishedAt),
      })
      .where(eq(articles.id, c.req.param("id")))
      .returning();

    return c.json({ article: serializeAdminArticle(updated) });
  });

  app.delete("/:id", async (c) => {
    const db = getDb(env.DATABASE_URL);
    const [deleted] = await db.delete(articles).where(eq(articles.id, c.req.param("id"))).returning({ id: articles.id });
    if (!deleted) return c.json({ error: "Article not found" }, 404);
    return c.json({ ok: true });
  });

  return app;
}
