import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { blocksToMarkdown, markdownToBlocks } from "@workspace/content";
import { getDb } from "./client";
import { articles, users } from "./schema";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const db = getDb(databaseUrl);
  const email = process.env.SEED_SUPERADMIN_EMAIL ?? "admin@xdai.journal";
  const password = process.env.SEED_SUPERADMIN_PASSWORD ?? "ChangeMeNow1!";
  const name = process.env.SEED_SUPERADMIN_NAME ?? "Super Admin";

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let superadminId = existing[0]?.id;

  if (!superadminId) {
    const [created] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash: await bcrypt.hash(password, 12),
        role: "superadmin",
        active: true,
      })
      .returning({ id: users.id });
    superadminId = created.id;
    console.log(`Created superadmin ${email}`);
  } else {
    console.log(`Superadmin ${email} already exists`);
  }

  const sampleBody = `## Why this matters

The strongest AI-native systems will have three layers working together.

> Design systems are becoming grammars, not shelves of parts.

- Tokens for visual consistency.
- Components for repeatable interaction patterns.
- Instructions for how generated interfaces should behave.

### What to do next

Start with one workflow, one component family, and one model instruction set.`;
  const bodyBlocks = markdownToBlocks(sampleBody);
  const body = blocksToMarkdown(bodyBlocks);

  const sampleSlug = "welcome-to-xd-ai-journal";
  const existingArticle = await db.select().from(articles).where(eq(articles.slug, sampleSlug)).limit(1);
  if (!existingArticle.length) {
    await db.insert(articles).values({
      slug: sampleSlug,
      title: "Welcome to XD AI Journal",
      excerpt: "Your new AWS-backed editorial system is live. Create articles in the admin and they appear on the site automatically.",
      date: new Date().toISOString().slice(0, 10),
      category: "News",
      subCategory: "Design",
      tags: ["launch", "editorial"],
      featured: true,
      status: "published",
      asciiType: 3,
      body,
      bodyBlocks,
      readingTime: 2,
      createdBy: superadminId,
      updatedBy: superadminId,
      publishedAt: new Date(),
    });
    console.log(`Seeded sample article /dispatch/${sampleSlug}`);
  }

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
