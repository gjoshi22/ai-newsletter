export type ArticleRenderNode =

  | { type: "paragraph"; text: string }

  | { type: "lead"; text: string }

  | { type: "small"; text: string }

  | { type: "center"; text: string }

  | { type: "heading2"; text: string }

  | { type: "heading3"; text: string }

  | { type: "heading4"; text: string }

  | { type: "quote"; text: string; align?: "left" | "center" }

  | { type: "callout"; variant: "note" | "warning" | "tip"; text: string }

  | { type: "divider" }

  | { type: "spacer" }

  | { type: "list"; items: string[] }

  | { type: "orderedList"; items: string[] }

  | { type: "code"; text: string }

  | { type: "image"; url: string; alt?: string; caption?: string };



const ORDERED_ITEM = /^\d+\.\s+/;

const CALLOUT_OPEN = /^:::(note|warning|tip)\s*$/i;

const WRAPPER_OPEN = /^:::(lead|small|center|center-quote)\s*$/i;

const CALLOUT_CLOSE = /^:::\s*$/;



type WrapperKind = "lead" | "small" | "center" | "center-quote";



export function parseArticleMarkdown(body: string): ArticleRenderNode[] {

  const lines = body.replace(/\r\n/g, "\n").split("\n");

  const nodes: ArticleRenderNode[] = [];

  let paragraph: string[] = [];

  let list: string[] = [];

  let ordered: string[] = [];

  let quote: string[] = [];

  let code: string[] = [];

  let callout: { variant: "note" | "warning" | "tip"; lines: string[] } | null = null;

  let wrapper: { kind: WrapperKind; lines: string[] } | null = null;

  let inCode = false;



  const flushParagraph = () => {

    if (!paragraph.length) return;

    nodes.push({ type: "paragraph", text: paragraph.join("\n") });

    paragraph = [];

  };

  const flushList = () => {

    if (!list.length) return;

    nodes.push({ type: "list", items: [...list] });

    list = [];

  };

  const flushOrdered = () => {

    if (!ordered.length) return;

    nodes.push({ type: "orderedList", items: [...ordered] });

    ordered = [];

  };

  const flushQuote = () => {

    if (!quote.length) return;

    nodes.push({ type: "quote", text: quote.join("\n") });

    quote = [];

  };

  const flushCallout = () => {

    if (!callout) return;

    nodes.push({

      type: "callout",

      variant: callout.variant,

      text: callout.lines.join("\n"),

    });

    callout = null;

  };

  const flushWrapper = () => {

    if (!wrapper) return;

    const text = wrapper.lines.join("\n").trim();

    if (text) {

      switch (wrapper.kind) {

        case "lead":

          nodes.push({ type: "lead", text });

          break;

        case "small":

          nodes.push({ type: "small", text });

          break;

        case "center":

          nodes.push({ type: "center", text });

          break;

        case "center-quote":

          nodes.push({ type: "quote", text, align: "center" });

          break;

        default: {

          const never: never = wrapper.kind;

          throw new Error(`Unknown wrapper: ${never}`);

        }

      }

    }

    wrapper = null;

  };



  for (const line of lines) {

    const trimmed = line.trim();



    if (wrapper) {

      if (CALLOUT_CLOSE.test(trimmed)) {

        flushWrapper();

      } else {

        wrapper.lines.push(line);

      }

      continue;

    }



    if (callout) {

      if (CALLOUT_CLOSE.test(trimmed)) {

        flushCallout();

      } else {

        callout.lines.push(line);

      }

      continue;

    }



    if (trimmed.startsWith("```")) {

      if (inCode) {

        nodes.push({ type: "code", text: code.join("\n") });

        code = [];

        inCode = false;

      } else {

        flushParagraph();

        flushList();

        flushOrdered();

        flushQuote();

        inCode = true;

      }

      continue;

    }



    if (inCode) {

      code.push(line);

      continue;

    }



    const calloutOpen = trimmed.match(CALLOUT_OPEN);

    if (calloutOpen) {

      flushParagraph();

      flushList();

      flushOrdered();

      flushQuote();

      callout = {

        variant: calloutOpen[1].toLowerCase() as "note" | "warning" | "tip",

        lines: [],

      };

      continue;

    }



    const wrapperOpen = trimmed.match(WRAPPER_OPEN);

    if (wrapperOpen) {

      flushParagraph();

      flushList();

      flushOrdered();

      flushQuote();

      wrapper = {

        kind: wrapperOpen[1].toLowerCase() as WrapperKind,

        lines: [],

      };

      continue;

    }



    if (trimmed === "---" || trimmed === "***") {

      flushParagraph();

      flushList();

      flushOrdered();

      flushQuote();

      nodes.push({ type: "divider" });

      continue;

    }



    if (!trimmed) {

      flushParagraph();

      flushList();

      flushOrdered();

      flushQuote();

      if (nodes.length > 0 && nodes[nodes.length - 1]?.type !== "spacer") {

        nodes.push({ type: "spacer" });

      }

      continue;

    }



    const image = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)(?:\s+"([^"]+)")?$/);

    if (image) {

      flushParagraph();

      flushList();

      flushOrdered();

      flushQuote();

      nodes.push({

        type: "image",

        url: image[2],

        alt: image[3] || image[1] || undefined,

        caption: image[1] || undefined,

      });

      continue;

    }



    if (trimmed.startsWith("#### ")) {

      flushParagraph();

      flushList();

      flushOrdered();

      flushQuote();

      nodes.push({ type: "heading4", text: trimmed.slice(5) });

      continue;

    }



    if (trimmed.startsWith("### ")) {

      flushParagraph();

      flushList();

      flushOrdered();

      flushQuote();

      nodes.push({ type: "heading3", text: trimmed.slice(4) });

      continue;

    }



    if (trimmed.startsWith("## ")) {

      flushParagraph();

      flushList();

      flushOrdered();

      flushQuote();

      nodes.push({ type: "heading2", text: trimmed.slice(3) });

      continue;

    }



    if (trimmed.startsWith("> ")) {

      flushParagraph();

      flushList();

      flushOrdered();

      quote.push(trimmed.slice(2));

      continue;

    }



    if (trimmed.startsWith("- ")) {

      flushParagraph();

      flushOrdered();

      flushQuote();

      list.push(trimmed.slice(2));

      continue;

    }



    if (ORDERED_ITEM.test(trimmed)) {

      flushParagraph();

      flushList();

      flushQuote();

      ordered.push(trimmed.replace(ORDERED_ITEM, ""));

      continue;

    }



    flushList();

    flushOrdered();

    flushQuote();

    paragraph.push(trimmed);

  }



  if (inCode && code.length) {

    nodes.push({ type: "code", text: code.join("\n") });

  }

  flushParagraph();

  flushList();

  flushOrdered();

  flushQuote();

  flushCallout();

  flushWrapper();



  return nodes.length ? nodes : [{ type: "paragraph", text: "" }];

}


