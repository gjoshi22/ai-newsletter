import type { ReactNode } from "react";
import { parseArticleMarkdown } from "./article-markdown";
import { parseInlineMarkdown } from "./inline-markdown";

function renderTextWithBreaks(value: string, keyPrefix: string) {
  const parts = value.split("\n");
  return parts.map((part, partIndex) => (
    <span key={`${keyPrefix}-${partIndex}`}>
      {partIndex > 0 ? <br /> : null}
      {part}
    </span>
  ));
}

function InlineMarkdown({ text }: { text: string }) {
  return (
    <>
      {parseInlineMarkdown(text).map((node, index) => {
        switch (node.kind) {
          case "text":
            return <span key={index}>{renderTextWithBreaks(node.value, `t-${index}`)}</span>;

          case "bold":

            return <strong key={index}>{node.value}</strong>;

          case "italic":

            return <em key={index}>{node.value}</em>;

          case "underline":

            return <u key={index}>{node.value}</u>;

          case "strike":

            return <s key={index}>{node.value}</s>;

          case "highlight":

            return <mark key={index} className="article-mark">{node.value}</mark>;

          case "sup":

            return <sup key={index}>{node.value}</sup>;

          case "sub":

            return <sub key={index}>{node.value}</sub>;

          case "code":

            return <code key={index}>{node.value}</code>;

          case "link":

            return (

              <a key={index} href={node.href} target="_blank" rel="noreferrer">

                {node.label}

              </a>

            );

          default: {

            const never: never = node;

            return <span key={index}>{JSON.stringify(never)}</span>;

          }

        }

      })}

    </>

  );

}



const CALLOUT_LABELS = {

  note: "NOTE",

  warning: "WARNING",

  tip: "TIP",

} as const;



export function ArticleMarkdownBody({ body }: { body: string }) {

  const nodes = parseArticleMarkdown(body);



  return (

    <div className="article-prose">

      {nodes.map((node, index) => {

        switch (node.type) {

          case "paragraph":

            return node.text.trim()

              ? <p key={index}><InlineMarkdown text={node.text} /></p>

              : null;

          case "lead":

            return node.text.trim()

              ? <p key={index} className="article-lead"><InlineMarkdown text={node.text} /></p>

              : null;

          case "small":

            return node.text.trim()

              ? <p key={index} className="article-small"><InlineMarkdown text={node.text} /></p>

              : null;

          case "center":

            return node.text.trim()

              ? <p key={index} className="article-center"><InlineMarkdown text={node.text} /></p>

              : null;

          case "heading2":

            return <h2 key={index}><InlineMarkdown text={node.text} /></h2>;

          case "heading3":

            return <h3 key={index}><InlineMarkdown text={node.text} /></h3>;

          case "heading4":

            return <h4 key={index}><InlineMarkdown text={node.text} /></h4>;

          case "quote":

            return (

              <blockquote

                key={index}

                className={node.align === "center" ? "article-quote-center" : undefined}

              >

                <InlineMarkdown text={node.text} />

              </blockquote>

            );

          case "callout":

            return (

              <aside key={index} className={`article-callout article-callout-${node.variant}`}>

                <p className="article-callout-label">{CALLOUT_LABELS[node.variant]}</p>

                <div className="article-callout-copy">

                  <InlineMarkdown text={node.text} />

                </div>

              </aside>

            );

          case "divider":

            return <hr key={index} className="article-divider" />;

          case "spacer":

            return <div key={index} className="article-spacer" aria-hidden="true" />;

          case "list":

            return (

              <ul key={index}>

                {node.items.map((item, itemIndex) => (

                  <li key={itemIndex}><InlineMarkdown text={item} /></li>

                ))}

              </ul>

            );

          case "orderedList":

            return (

              <ol key={index} className="article-ordered-list">

                {node.items.map((item, itemIndex) => (

                  <li key={itemIndex}><InlineMarkdown text={item} /></li>

                ))}

              </ol>

            );

          case "code":

            return (

              <pre key={index}>

                <code>{node.text}</code>

              </pre>

            );

          case "image":

            return (

              <figure key={index} className="article-inline-image">

                <img

                  src={node.url}

                  alt={node.alt ?? node.caption ?? ""}

                  loading="lazy"

                  decoding="async"

                />

                {node.caption ? (

                  <figcaption><InlineMarkdown text={node.caption} /></figcaption>

                ) : null}

              </figure>

            );

          default: {

            const never: never = node;

            return <p key={index}>{JSON.stringify(never)}</p>;

          }

        }

      })}

    </div>

  );

}



export function renderInlineMarkdown(text: string): ReactNode {

  return <InlineMarkdown text={text} />;

}


