ALTER TABLE "articles" ADD COLUMN "author_name" varchar(120);
ALTER TABLE "articles" ADD COLUMN "show_author" boolean DEFAULT false NOT NULL;
