import { ArticleImageStage } from "@workspace/content/chrome";
import { ArticleMarkdownBody, renderInlineMarkdown } from "@workspace/content/render";

export function ArticleBody({ body }: { body: string }) {
  return <ArticleMarkdownBody body={body} />;
}

export function ArticleDeck({ text }: { text: string }) {
  return <>{renderInlineMarkdown(text)}</>;
}

export { ArticleImageStage };
