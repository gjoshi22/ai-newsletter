import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { blocksToMarkdown, emptyArticleBlocks, estimateReadingTime, type ContentBlock } from "@workspace/content";
import { AdminField } from "@/components/AdminField";
import { ArticlePreview } from "@/components/ArticlePreview";
import { BlockEditor } from "@/components/BlockEditor";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PostSettingsPanel } from "@/components/PostSettingsPanel";
import { useArticleAutosave } from "@/hooks/useArticleAutosave";
import { api, type ArticleInput } from "@/lib/api";
import { publicArticleUrl } from "@/lib/public-site";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function SaveStatusBanner({
  status,
  error,
  storyStatus,
  isDirty,
  hasArticleId,
}: {
  status: ReturnType<typeof useArticleAutosave>["status"];
  error: string;
  storyStatus: ArticleInput["status"];
  isDirty: boolean;
  hasArticleId: boolean;
}) {
  if (error) {
    return <p className="admin-banner admin-banner-error">{error}</p>;
  }

  if (status === "saving") {
    return <p className="admin-banner admin-banner-saving">Saving your changes...</p>;
  }

  if (status === "saved") {
    return <p className="admin-banner admin-banner-saved">Saved to database</p>;
  }

  if (hasArticleId && isDirty) {
    return <p className="admin-banner admin-banner-warning">Unsaved changes — saving automatically in a moment</p>;
  }

  if (hasArticleId && storyStatus === "draft") {
    return <p className="admin-banner admin-banner-muted">Draft — changes save automatically while you write</p>;
  }

  if (hasArticleId && (storyStatus === "published" || storyStatus === "archived")) {
    return <p className="admin-banner admin-banner-muted">Live story — edits save automatically to the database</p>;
  }

  return null;
}

export default function ArticleEditor() {
  const [, navigate] = useLocation();
  const [isNew] = useRoute("/articles/new");
  const [match, params] = useRoute("/articles/:id");
  const articleId = isNew ? null : match ? params?.id : null;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<"News" | "Resources">("News");
  const [subCategory, setSubCategory] = useState<"Design" | "Development">("Design");
  const [tags, setTags] = useState("");
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<ArticleInput["status"]>("draft");
  const [asciiType, setAsciiType] = useState(1);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [showAuthor, setShowAuthor] = useState(false);
  const [blocks, setBlocks] = useState<ContentBlock[]>(emptyArticleBlocks());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [originalSlug, setOriginalSlug] = useState("");

  useEffect(() => {
    if (articleId) return;
    api.me()
      .then(({ user }) => setAuthorName((current) => current || user.name))
      .catch(() => undefined);
  }, [articleId]);

  useEffect(() => {
    if (!articleId) return;
    api.getArticle(articleId)
      .then(({ article }) => {
        setTitle(article.title);
        setSlug(article.slug);
        setOriginalSlug(article.slug);
        setExcerpt(article.excerpt);
        setDate(article.date);
        setCategory(article.category);
        setSubCategory(article.subCategory);
        setTags(article.tags.join(", "));
        setFeatured(article.featured);
        setStatus(article.status);
        setAsciiType(article.asciiType);
        setImageUrl(article.imageUrl ?? null);
        setSourceUrl(article.sourceUrl ?? "");
        setAuthorName(article.authorName ?? "");
        setShowAuthor(Boolean(article.showAuthor));
        setBlocks(article.bodyBlocks);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load article"));
  }, [articleId]);

  const payload = useMemo<ArticleInput>(() => ({
    title,
    slug: slug || slugify(title),
    excerpt,
    date,
    category,
    subCategory,
    tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    featured,
    status,
    asciiType,
    imageUrl,
    sourceUrl: sourceUrl || null,
    authorName: authorName || null,
    showAuthor,
    bodyBlocks: blocks,
  }), [title, slug, excerpt, date, category, subCategory, tags, featured, status, asciiType, imageUrl, sourceUrl, authorName, showAuthor, blocks]);

  const autosave = useArticleAutosave({ articleId, payload });
  const { markSaving, syncSaved, markError, isDirty, status: autosaveStatus, error: autosaveError } = autosave;

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const save = useCallback(async () => {
    setSaving(true);
    setError("");
    markSaving();
    try {
      if (articleId) {
        await api.updateArticle(articleId, payload);
        syncSaved();
      } else {
        const result = await api.createArticle(payload);
        navigate(`/articles/${result.article.id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
      markError(message);
    } finally {
      setSaving(false);
    }
  }, [articleId, markError, markSaving, navigate, payload, syncSaved]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!saving && !actionBusy) {
          void save();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actionBusy, save, saving]);

  const moveToArchive = async () => {
    if (!articleId) return;
    setActionBusy(true);
    setError("");
    try {
      const archivedPayload: ArticleInput = {
        ...payload,
        status: "archived",
        featured: false,
      };
      await api.updateArticle(articleId, archivedPayload);
      setStatus("archived");
      setFeatured(false);
      syncSaved(JSON.stringify(archivedPayload));
      setConfirmArchiveOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move story to archive");
    } finally {
      setActionBusy(false);
    }
  };

  const restoreToPublished = async () => {
    if (!articleId) return;
    setActionBusy(true);
    setError("");
    try {
      const publishedPayload: ArticleInput = {
        ...payload,
        status: "published",
      };
      await api.updateArticle(articleId, publishedPayload);
      setStatus("published");
      syncSaved(JSON.stringify(publishedPayload));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore story to published");
    } finally {
      setActionBusy(false);
    }
  };

  const deleteStory = async () => {
    if (!articleId) return;
    setActionBusy(true);
    setError("");
    try {
      await api.deleteArticle(articleId);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete story");
      setActionBusy(false);
      setConfirmDeleteOpen(false);
    }
  };

  const handleStatusChange = (nextStatus: ArticleInput["status"]) => {
    setStatus(nextStatus);
    if (nextStatus !== "published") {
      setFeatured(false);
    }
  };

  const upload = async (file: File) => api.upload(file).then((result) => result.url);

  const resolvedSlug = slug || slugify(title);
  const canViewLive = Boolean(articleId && resolvedSlug && (status === "published" || status === "archived"));
  const bodyMarkdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);
  // Matches the backend exactly: reading time is computed from the body markdown only.
  const readingTime = useMemo(() => estimateReadingTime(bodyMarkdown), [bodyMarkdown]);
  const slugChanged = Boolean(
    articleId
    && originalSlug
    && resolvedSlug !== originalSlug
    && (status === "published" || status === "archived"),
  );

  const saveLabel = status === "draft"
    ? (saving ? "Saving..." : articleId ? "Save now" : "Create draft")
    : (saving ? "Saving..." : "Save now");

  return (
    <div className="editor-page">
      <div className="editor-header">
        <div>
          <h1 className="editor-title">{articleId ? "Edit story" : "Write a story"}</h1>
          <p className="editor-subtitle">
            Everything saves to the database. Published stories appear on the site; archived stories stay in Past Issues only.
          </p>
        </div>
        <div className="editor-header-actions">
          {canViewLive ? (
            <a
              href={publicArticleUrl(resolvedSlug)}
              target="_blank"
              rel="noreferrer"
              className="admin-btn"
            >
              View live
            </a>
          ) : null}
          {articleId && status === "archived" ? (
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={restoreToPublished}
              disabled={saving || actionBusy}
            >
              Restore to published
            </button>
          ) : null}
          {articleId && status === "published" ? (
            <button
              type="button"
              className="admin-btn"
              onClick={() => setConfirmArchiveOpen(true)}
              disabled={saving || actionBusy}
            >
              Move to archive
            </button>
          ) : null}
          {articleId ? (
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={saving || actionBusy}
            >
              Delete
            </button>
          ) : null}
          <button type="button" className="admin-btn admin-btn-primary" onClick={save} disabled={saving || actionBusy}>
            {saveLabel}
          </button>
        </div>
      </div>

      <SaveStatusBanner
        status={autosaveStatus}
        error={autosaveError || error}
        storyStatus={status}
        isDirty={isDirty}
        hasArticleId={Boolean(articleId)}
      />

      <div className="editor-layout">
        <div className="editor-main">
          <section className="admin-card admin-section editor-compose">
            <input
              className="editor-doc-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title"
              aria-label="Title"
            />

            <AdminField
              label="Subtitle"
              hint="Plain text only. Shown under the title on the article page and on home cards."
            >
              <textarea
                className="admin-textarea editor-subtitle-field"
                rows={3}
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
                placeholder="Summarize the story in one or two sentences"
              />
            </AdminField>

            <div className="editor-body-heading">
              <h2 className="admin-section-title">Story content</h2>
              <p className="admin-section-copy">
                Write section by section. Use the formatting buttons for bold, links, and highlights.
                Use &ldquo;Change to&rdquo; on a section if you want a heading, quote, or list instead.
              </p>
            </div>

            <BlockEditor blocks={blocks} onChange={setBlocks} onUpload={upload} />
          </section>

          <section className="admin-card admin-section">
            <h2 className="admin-section-title">Post settings</h2>
            <PostSettingsPanel
              category={category}
              subCategory={subCategory}
              date={date}
              status={status}
              tags={tags}
              featured={featured}
              imageUrl={imageUrl}
              sourceUrl={sourceUrl}
              slug={slug}
              asciiType={asciiType}
              onCategoryChange={setCategory}
              onSubCategoryChange={setSubCategory}
              onDateChange={setDate}
              onStatusChange={handleStatusChange}
              onTagsChange={setTags}
              onFeaturedChange={setFeatured}
              onImageUrlChange={setImageUrl}
              onSourceUrlChange={setSourceUrl}
              onSlugChange={setSlug}
              slugChanged={slugChanged}
              onAsciiTypeChange={setAsciiType}
              authorName={authorName}
              showAuthor={showAuthor}
              onAuthorNameChange={setAuthorName}
              onShowAuthorChange={setShowAuthor}
              onUpload={upload}
            />
          </section>
        </div>

        <aside className="editor-preview">
          <p className="editor-preview-label">How readers will see it</p>
          <ArticlePreview
            title={title}
            excerpt={excerpt}
            category={category}
            subCategory={subCategory}
            date={date}
            readingTime={readingTime}
            imageUrl={imageUrl}
            authorName={authorName}
            showAuthor={showAuthor}
            body={bodyMarkdown}
          />
        </aside>
      </div>

      <ConfirmDialog
        open={confirmArchiveOpen}
        title="Move to archive?"
        message="This removes the story from the home page and News/Resources sections. It will remain in Past Issues and stay readable by direct link."
        confirmLabel="Move to archive"
        busy={actionBusy}
        onConfirm={moveToArchive}
        onCancel={() => setConfirmArchiveOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this story permanently?"
        message="This cannot be undone. The story will be removed from the database and will no longer appear anywhere on the site."
        confirmLabel="Delete permanently"
        danger
        busy={actionBusy}
        onConfirm={deleteStory}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
