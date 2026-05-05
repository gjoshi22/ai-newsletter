import { promises as fs } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const appRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");
const contentRoot = path.join(repoRoot, "backend/content");
const outputPath = path.join(appRoot, "src/generated/articles.ts");

const categories = new Set(["News", "Resources"]);
const subCategories = new Set(["Design", "Development"]);
const statuses = new Set(["draft", "published"]);
const requiredFields = ["title", "slug", "date", "category", "subCategory", "excerpt", "status", "asciiType"];

function parseFrontmatter(text, filePath) {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) {
    throw new Error(`${filePath} is missing front matter`);
  }

  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    throw new Error(`${filePath} has unclosed front matter`);
  }

  let data;
  try {
    data = parseYaml(match[1]) ?? {};
  } catch (error) {
    throw new Error(`${filePath} has invalid YAML front matter: ${error.message}`);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${filePath} front matter must be a YAML object`);
  }

  return { data, body: text.slice(match[0].length).trim() };
}

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function estimateReadingTime(body) {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function stringifyField(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim();
}

function validateDate(value, filePath) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${filePath} has invalid date "${value}". Expected YYYY-MM-DD.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${filePath} has invalid calendar date "${value}".`);
  }
}

function validateSlug(value, filePath) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(`${filePath} has invalid slug "${value}". Use lowercase letters, numbers, and hyphens.`);
  }
}

function normalizeTags(value, filePath) {
  if (value === undefined || value === null || value === "") return [];
  if (!Array.isArray(value)) {
    throw new Error(`${filePath} has invalid tags. Expected a YAML list.`);
  }

  return value.map((tag) => {
    const normalized = stringifyField(tag);
    if (!normalized) {
      throw new Error(`${filePath} has an empty tag.`);
    }
    return normalized;
  });
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return Boolean(value);
}

async function validateLocalImage(image, filePath) {
  if (!image || /^[a-z][a-z0-9+.-]*:/i.test(image)) return;

  const normalized = image.replace(/^\//, "");
  const candidates = [
    path.join(appRoot, "public", normalized),
    path.join(repoRoot, "frontend/xd-journal/public", normalized),
    path.join(repoRoot, normalized),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(`${filePath} references missing local image "${image}".`);
}

async function buildArticle(filePath, seenSlugs) {
  const raw = await fs.readFile(filePath, "utf8");
  const { data, body } = parseFrontmatter(raw, filePath);

  for (const field of requiredFields) {
    if (isBlank(data[field])) {
      throw new Error(`${filePath} is missing required front matter field "${field}".`);
    }
  }

  const title = stringifyField(data.title);
  const slug = stringifyField(data.slug);
  const date = stringifyField(data.date);
  const category = stringifyField(data.category);
  const subCategory = stringifyField(data.subCategory);
  const excerpt = stringifyField(data.excerpt);
  const status = stringifyField(data.status);
  const thumbnail = stringifyField(data.thumbnail);
  const sourceUrl = stringifyField(data.sourceUrl);
  const asciiType = Number(data.asciiType);

  validateSlug(slug, filePath);
  validateDate(date, filePath);

  if (seenSlugs.has(slug)) {
    throw new Error(`${filePath} duplicates slug "${slug}" already used by ${seenSlugs.get(slug)}.`);
  }
  seenSlugs.set(slug, filePath);

  if (!categories.has(category)) throw new Error(`${filePath} has invalid category: ${category}`);
  if (!subCategories.has(subCategory)) throw new Error(`${filePath} has invalid subCategory: ${subCategory}`);
  if (!statuses.has(status)) throw new Error(`${filePath} has invalid status: ${status}`);
  if (!Number.isInteger(asciiType) || asciiType < 1 || asciiType > 10) {
    throw new Error(`${filePath} has invalid asciiType: ${data.asciiType}. Expected an integer from 1 to 10.`);
  }

  const tags = normalizeTags(data.tags, filePath);
  await validateLocalImage(thumbnail, filePath);

  return {
    id: slug,
    slug,
    title,
    date,
    category,
    subCategory,
    excerpt,
    isNew: normalizeBoolean(data.featured ?? data.isNew),
    asciiType,
    image: thumbnail || undefined,
    tags,
    status,
    body,
    readingTime: estimateReadingTime(body),
    sourceUrl: sourceUrl || undefined,
  };
}

async function main() {
  const files = await walk(contentRoot);
  const articles = [];
  const seenSlugs = new Map();
  const errors = [];

  for (const filePath of files) {
    try {
      articles.push(await buildArticle(filePath, seenSlugs));
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Content validation failed:\n- ${errors.join("\n- ")}`);
  }

  const published = articles
    .filter((article) => article.status === "published")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const source = `import type { Article } from "@/lib/data";\n\nexport const generatedArticles = ${JSON.stringify(published, null, 2)} satisfies Article[];\n`;
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, source);
  console.log(`Generated ${published.length} published articles from ${articles.length} content files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
