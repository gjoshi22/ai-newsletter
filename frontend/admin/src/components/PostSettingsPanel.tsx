import type { ReactNode } from "react";
import { AdminField } from "@/components/AdminField";
import { FeaturedArtPicker } from "@/components/FeaturedArtPicker";
import { UploadField } from "@/components/UploadField";

type PostSettingsPanelProps = {
  category: "News" | "Resources";
  subCategory: "Design" | "Development";
  date: string;
  status: "draft" | "published" | "archived";
  tags: string;
  featured: boolean;
  imageUrl: string | null;
  sourceUrl: string;
  slug: string;
  asciiType: number;
  authorName: string;
  showAuthor: boolean;
  onCategoryChange: (value: "News" | "Resources") => void;
  onSubCategoryChange: (value: "Design" | "Development") => void;
  onDateChange: (value: string) => void;
  onStatusChange: (value: "draft" | "published" | "archived") => void;
  onTagsChange: (value: string) => void;
  onFeaturedChange: (value: boolean) => void;
  onImageUrlChange: (value: string | null) => void;
  onSourceUrlChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onAsciiTypeChange: (value: number) => void;
  onAuthorNameChange: (value: string) => void;
  onShowAuthorChange: (value: boolean) => void;
  onUpload: (file: File) => Promise<string>;
  slugChanged?: boolean;
};

function SettingsSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="settings-section" open={defaultOpen}>
      <summary className="settings-section-summary">{title}</summary>
      <div className="settings-section-body">{children}</div>
    </details>
  );
}

export function PostSettingsPanel(props: PostSettingsPanelProps) {
  const showFeaturedArt = props.featured && !props.imageUrl;

  return (
    <div className="post-settings">
      <SettingsSection title="Publishing" defaultOpen>
        <div className="admin-field-row admin-field-row-3">
          <AdminField label="Section" hint="News or Resources">
            <select
              className="admin-select"
              value={props.category}
              onChange={(event) => props.onCategoryChange(event.target.value as "News" | "Resources")}
            >
              <option value="News">News</option>
              <option value="Resources">Resources</option>
            </select>
          </AdminField>
          <AdminField label="Topic" hint="Design or Development">
            <select
              className="admin-select"
              value={props.subCategory}
              onChange={(event) => props.onSubCategoryChange(event.target.value as "Design" | "Development")}
            >
              <option value="Design">Design</option>
              <option value="Development">Development</option>
            </select>
          </AdminField>
          <AdminField label="Publish date">
            <input
              className="admin-input"
              type="date"
              value={props.date}
              onChange={(event) => props.onDateChange(event.target.value)}
            />
          </AdminField>
        </div>

        <div className="admin-field-row">
          <AdminField label="Visibility">
            <select
              className="admin-select"
              value={props.status}
              onChange={(event) => props.onStatusChange(event.target.value as "draft" | "published" | "archived")}
            >
              <option value="draft">Draft — only visible to editors</option>
              <option value="published">Published — home, News/Resources, and archive</option>
              <option value="archived">Archived — Past Issues only (not promoted)</option>
            </select>
          </AdminField>
          <AdminField label="Tags" hint="Separate with commas, e.g. AI, design systems">
            <input
              className="admin-input"
              value={props.tags}
              onChange={(event) => props.onTagsChange(event.target.value)}
            />
          </AdminField>
        </div>

        {props.status === "published" ? (
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={props.featured}
              onChange={(event) => props.onFeaturedChange(event.target.checked)}
            />
            <span>Pin to the home page as the featured story (also shows a NEW badge on cards)</span>
          </label>
        ) : (
          <p className="admin-section-copy">Featured placement is only available while a story is published.</p>
        )}

        <AdminField label="Author name" hint="Byline for this story. Defaults to your editor account name on new stories.">
          <input
            className="admin-input"
            value={props.authorName}
            onChange={(event) => props.onAuthorNameChange(event.target.value)}
            placeholder="Writer name"
          />
        </AdminField>

        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={props.showAuthor}
            onChange={(event) => props.onShowAuthorChange(event.target.checked)}
          />
          <span>Show author on the published article page</span>
        </label>
      </SettingsSection>

      <SettingsSection title="Cover photo">
        <p className="admin-section-copy">
          The large image at the top of the story and on listing cards. For photos inside the story, use &ldquo;Photo in story&rdquo; in the content editor.
        </p>
        <UploadField
          value={props.imageUrl}
          onChange={props.onImageUrlChange}
          onUpload={props.onUpload}
          label="Upload cover photo"
          hint="Recommended for every published story"
        />
        <AdminField label="Or paste a cover image link" hint="Only if the image is already hosted online">
          <input
            className="admin-input"
            value={props.imageUrl ?? ""}
            onChange={(event) => props.onImageUrlChange(event.target.value || null)}
          />
        </AdminField>
      </SettingsSection>

      {showFeaturedArt ? (
        <SettingsSection title="Home page card art" defaultOpen>
          <p className="admin-section-copy">
            No cover photo is set. Pick the illustration shown on the featured home card.
          </p>
          <FeaturedArtPicker value={props.asciiType} onChange={props.onAsciiTypeChange} />
        </SettingsSection>
      ) : null}

      <SettingsSection title="Advanced options">
        <AdminField label="Custom web address" hint="Optional. Leave blank to auto-generate from the title.">
          <input
            className="admin-input"
            value={props.slug}
            onChange={(event) => props.onSlugChange(event.target.value)}
            placeholder="my-article-title"
          />
        </AdminField>
        {props.slugChanged ? (
          <p className="admin-banner admin-banner-warning">
            You changed the web address of a live story. Old links and bookmarks may stop working.
          </p>
        ) : null}
        <AdminField label="Original source link" hint="Optional link for attribution or further reading">
          <input
            className="admin-input"
            value={props.sourceUrl}
            onChange={(event) => props.onSourceUrlChange(event.target.value)}
            placeholder="https://"
          />
        </AdminField>
      </SettingsSection>
    </div>
  );
}
