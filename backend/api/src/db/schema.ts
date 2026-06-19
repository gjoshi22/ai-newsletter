import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import type { ContentBlock } from "@workspace/content";

export const userRoleEnum = pgEnum("user_role", ["superadmin", "editor"]);
export const articleCategoryEnum = pgEnum("article_category", ["News", "Resources"]);
export const articleSubCategoryEnum = pgEnum("article_sub_category", ["Design", "Development"]);
export const articleStatusEnum = pgEnum("article_status", ["draft", "published", "archived"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("editor"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const articles = pgTable("articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 300 }).notNull(),
  excerpt: text("excerpt").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  category: articleCategoryEnum("category").notNull(),
  subCategory: articleSubCategoryEnum("sub_category").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  status: articleStatusEnum("status").notNull().default("draft"),
  asciiType: integer("ascii_type").notNull().default(1),
  imageUrl: text("image_url"),
  sourceUrl: text("source_url"),
  body: text("body").notNull().default(""),
  bodyBlocks: jsonb("body_blocks").$type<ContentBlock[]>().notNull().default([]),
  readingTime: integer("reading_time").notNull().default(1),
  authorName: varchar("author_name", { length: 120 }),
  showAuthor: boolean("show_author").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});
