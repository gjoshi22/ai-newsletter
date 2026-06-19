CREATE TYPE "public"."user_role" AS ENUM('superadmin', 'editor');
CREATE TYPE "public"."article_category" AS ENUM('News', 'Resources');
CREATE TYPE "public"."article_sub_category" AS ENUM('Design', 'Development');
CREATE TYPE "public"."article_status" AS ENUM('draft', 'published');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "name" varchar(120) NOT NULL,
  "password_hash" text NOT NULL,
  "role" "user_role" DEFAULT 'editor' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "articles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(160) NOT NULL,
  "title" varchar(300) NOT NULL,
  "excerpt" text NOT NULL,
  "date" varchar(10) NOT NULL,
  "category" "article_category" NOT NULL,
  "sub_category" "article_sub_category" NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "status" "article_status" DEFAULT 'draft' NOT NULL,
  "ascii_type" integer DEFAULT 1 NOT NULL,
  "image_url" text,
  "source_url" text,
  "body" text DEFAULT '' NOT NULL,
  "body_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "reading_time" integer DEFAULT 1 NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "published_at" timestamp with time zone,
  CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
  CONSTRAINT "articles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "articles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);
