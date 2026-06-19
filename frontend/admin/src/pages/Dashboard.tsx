import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { api, type AdminArticle, type ArticleInput } from "@/lib/api";
import { publicArticleUrl } from "@/lib/public-site";

export default function Dashboard() {
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<AdminArticle | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminArticle | null>(null);

  const loadArticles = useCallback(() => {
    setLoading(true);
    api.listArticles()
      .then((result) => setArticles(result.articles))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load articles"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const restoreStory = async (article: AdminArticle) => {
    setActionBusy(true);
    setError("");
    try {
      const payload: ArticleInput = {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        date: article.date,
        category: article.category,
        subCategory: article.subCategory,
        tags: article.tags,
        featured: article.featured,
        status: "published",
        asciiType: article.asciiType,
        imageUrl: article.imageUrl ?? null,
        sourceUrl: article.sourceUrl ?? null,
        authorName: article.authorName ?? null,
        showAuthor: Boolean(article.showAuthor),
        bodyBlocks: article.bodyBlocks,
      };
      await api.updateArticle(article.id, payload);
      loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore story");
    } finally {
      setActionBusy(false);
    }
  };

  const archiveStory = async () => {
    if (!pendingArchive) return;
    setActionBusy(true);
    setError("");
    try {
      const payload: ArticleInput = {
        title: pendingArchive.title,
        slug: pendingArchive.slug,
        excerpt: pendingArchive.excerpt,
        date: pendingArchive.date,
        category: pendingArchive.category,
        subCategory: pendingArchive.subCategory,
        tags: pendingArchive.tags,
        featured: false,
        status: "archived",
        asciiType: pendingArchive.asciiType,
        imageUrl: pendingArchive.imageUrl ?? null,
        sourceUrl: pendingArchive.sourceUrl ?? null,
        authorName: pendingArchive.authorName ?? null,
        showAuthor: Boolean(pendingArchive.showAuthor),
        bodyBlocks: pendingArchive.bodyBlocks,
      };
      await api.updateArticle(pendingArchive.id, payload);
      setPendingArchive(null);
      loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move story to archive");
    } finally {
      setActionBusy(false);
    }
  };

  const deleteStory = async () => {
    if (!pendingDelete) return;
    setActionBusy(true);
    setError("");
    try {
      await api.deleteArticle(pendingDelete.id);
      setPendingDelete(null);
      loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete story");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="editor-title">Stories</h1>
          <p className="editor-subtitle">
            All stories live in the database. Published stories appear on the site; archived stories stay in Past Issues only.
          </p>
        </div>
        <Link href="/articles/new" className="admin-btn admin-btn-primary">Write new story</Link>
      </div>

      {error ? <p className="admin-banner admin-banner-error">{error}</p> : null}

      {loading ? <p className="admin-banner admin-banner-muted">Loading stories from database...</p> : null}

      {!loading && !articles.length ? (
        <div className="admin-card admin-empty-state">
          <h2>No stories yet</h2>
          <p>Start writing a draft. Everything you save is stored in the database.</p>
          <Link href="/articles/new" className="admin-btn admin-btn-primary">Write your first story</Link>
        </div>
      ) : null}

      {articles.length ? (
        <div className="admin-card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td>
                    <Link href={`/articles/${article.id}`} className="admin-table-link">{article.title}</Link>
                  </td>
                  <td>{article.category} / {article.subCategory}</td>
                  <td>
                    <span className={`status-pill status-pill-${article.status}`}>{article.status}</span>
                    {article.featured ? <span className="status-pill status-pill-featured">featured</span> : null}
                  </td>
                  <td>{new Date(article.date).toLocaleDateString()}</td>
                  <td>
                    <div className="table-actions">
                      {article.status === "published" || article.status === "archived" ? (
                        <a
                          href={publicArticleUrl(article.slug)}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-btn"
                        >
                          View live
                        </a>
                      ) : null}
                      {article.status === "archived" ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          onClick={() => restoreStory(article)}
                          disabled={actionBusy}
                        >
                          Publish again
                        </button>
                      ) : null}
                      {article.status === "published" ? (
                        <button
                          type="button"
                          className="admin-btn"
                          onClick={() => setPendingArchive(article)}
                          disabled={actionBusy}
                        >
                          Archive
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() => setPendingDelete(article)}
                        disabled={actionBusy}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingArchive)}
        title="Move to archive?"
        message={`"${pendingArchive?.title ?? "This story"}" will leave the home page and News/Resources, but stay in Past Issues.`}
        confirmLabel="Move to archive"
        busy={actionBusy}
        onConfirm={archiveStory}
        onCancel={() => setPendingArchive(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this story permanently?"
        message={`"${pendingDelete?.title ?? "This story"}" will be removed from the database and disappear from the site entirely. This cannot be undone.`}
        confirmLabel="Delete permanently"
        danger
        busy={actionBusy}
        onConfirm={deleteStory}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
