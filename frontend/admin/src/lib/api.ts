import type { ContentBlock, UserRole } from "@workspace/content";

const TOKEN_KEY = "xd-admin-token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload.error === "string"
      ? payload.error
      : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type ArticleInput = {
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  category: "News" | "Resources";
  subCategory: "Design" | "Development";
  tags: string[];
  featured: boolean;
  status: "draft" | "published" | "archived";
  asciiType: number;
  imageUrl: string | null;
  sourceUrl: string | null;
  authorName: string | null;
  showAuthor: boolean;
  bodyBlocks: ContentBlock[];
};

export interface AdminArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: "News" | "Resources";
  subCategory: "Design" | "Development";
  tags: string[];
  featured: boolean;
  status: "draft" | "published" | "archived";
  asciiType: number;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  body: string;
  bodyBlocks: ContentBlock[];
  readingTime: number;
  authorName?: string | null;
  showAuthor?: boolean;
}

export const api = {
  login(email: string, password: string) {
    return request<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  me() {
    return request<{ user: AuthUser }>("/api/auth/me");
  },
  listArticles() {
    return request<{ articles: AdminArticle[] }>("/api/articles");
  },
  getArticle(id: string) {
    return request<{ article: AdminArticle }>(`/api/articles/${id}`);
  },
  createArticle(payload: Record<string, unknown>) {
    return request<{ article: AdminArticle }>("/api/articles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateArticle(id: string, payload: Record<string, unknown>) {
    return request<{ article: AdminArticle }>(`/api/articles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteArticle(id: string) {
    return request<{ ok: boolean }>(`/api/articles/${id}`, { method: "DELETE" });
  },
  listUsers() {
    return request<{ users: Array<AuthUser & { active: boolean; createdAt: string }> }>("/api/users");
  },
  createUser(payload: { email: string; name: string; password: string; role: UserRole }) {
    return request<{ user: AuthUser }>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateUser(id: string, payload: Record<string, unknown>) {
    return request<{ user: AuthUser }>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string }>("/api/uploads", { method: "POST", body: form });
  },
};
