import type { ArticleCategory, ArticleSubCategory } from "@/lib/data";

const MODE_COPY: Record<ArticleSubCategory, { title: string }> = {
  Design: { title: "design" },
  Development: { title: "dev" },
};

type ModeFilterTabsProps = {
  category: ArticleCategory;
  activeMode: ArticleSubCategory;
  onModeChange: (mode: ArticleSubCategory) => void;
};

export function ModeFilterTabs({ category, activeMode, onModeChange }: ModeFilterTabsProps) {
  return (
    <section className="mode-toggle-shell" aria-label={`${category} design and development selector`}>
      <div className="mode-toggle-tabs" data-mascot-avoid role="tablist" aria-label="Choose collection mode">
        {(["Design", "Development"] as ArticleSubCategory[]).map((mode) => {
          const active = activeMode === mode;
          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={active}
              data-cursor-hover
              data-mode={mode.toLowerCase()}
              className={`mode-toggle-tab ${active ? "mode-toggle-tab-active" : ""}`}
              onClick={() => onModeChange(mode)}
            >
              <span>{MODE_COPY[mode].title}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
