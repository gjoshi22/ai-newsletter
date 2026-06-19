export type ArticleCategory = "News" | "Resources";

export type ArticleSubCategory = "Design" | "Development";

export type ArticleStatus = "draft" | "published" | "archived";

export type UserRole = "superadmin" | "editor";



export type CalloutVariant = "note" | "warning" | "tip";

export type TextAlign = "left" | "center";



export type ContentBlock =

  | { type: "paragraph"; text: string }

  | { type: "lead"; text: string }

  | { type: "small"; text: string }

  | { type: "center"; text: string }

  | { type: "heading2"; text: string }

  | { type: "heading3"; text: string }

  | { type: "heading4"; text: string }

  | { type: "quote"; text: string; align?: TextAlign }

  | { type: "callout"; variant: CalloutVariant; text: string }

  | { type: "divider" }

  | { type: "spacer" }

  | { type: "list"; items: string[] }

  | { type: "orderedList"; items: string[] }

  | { type: "code"; text: string; language?: string }

  | { type: "image"; url: string; caption?: string; alt?: string };



export interface ArticleRecord {

  id: string;

  slug: string;

  title: string;

  excerpt: string;

  date: string;

  category: ArticleCategory;

  subCategory: ArticleSubCategory;

  tags: string[];

  featured: boolean;

  status: ArticleStatus;

  asciiType: number;

  imageUrl?: string | null;

  sourceUrl?: string | null;

  body: string;

  bodyBlocks: ContentBlock[];

  readingTime: number;

  authorName?: string | null;

  showAuthor?: boolean;

  createdAt: string;

  updatedAt: string;

}



export interface PublicArticle extends Omit<ArticleRecord, "bodyBlocks" | "createdAt" | "updatedAt" | "body"> {

  isNew?: boolean;

  image?: string;

  body?: string;

}



export interface UserRecord {

  id: string;

  email: string;

  name: string;

  role: UserRole;

  active: boolean;

  createdAt: string;

}


