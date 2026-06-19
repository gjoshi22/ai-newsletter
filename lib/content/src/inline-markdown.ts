export type InlineNode =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "underline"; value: string }
  | { kind: "strike"; value: string }
  | { kind: "highlight"; value: string }
  | { kind: "sup"; value: string }
  | { kind: "sub"; value: string }
  | { kind: "code"; value: string }
  | { kind: "link"; label: string; href: string };

const INLINE_TOKEN =
  /(\[[^\]]+\]\([^)]+\)|`[^`]+`|==[^=\n]+==|\+\+[^+\n]+\+\+|~~[^~\n]+~~|\*\*[^*\n]+\*\*|~[^~\n]+~|\^[^\^\n]+\^|\*[^*\n]+\*|_[^_\n]+_)/g;

export function parseInlineMarkdown(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_TOKEN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push({ kind: "text", value: text.slice(lastIndex, index) });
    }

    const token = match[0];
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      nodes.push({ kind: "link", label: link[1], href: link[2] });
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push({ kind: "code", value: token.slice(1, -1) });
    } else if (token.startsWith("==") && token.endsWith("==")) {
      nodes.push({ kind: "highlight", value: token.slice(2, -2) });
    } else if (token.startsWith("++") && token.endsWith("++")) {
      nodes.push({ kind: "underline", value: token.slice(2, -2) });
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      nodes.push({ kind: "strike", value: token.slice(2, -2) });
    } else if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push({ kind: "bold", value: token.slice(2, -2) });
    } else if (token.startsWith("^") && token.endsWith("^")) {
      nodes.push({ kind: "sup", value: token.slice(1, -1) });
    } else if (token.startsWith("~") && token.endsWith("~")) {
      nodes.push({ kind: "sub", value: token.slice(1, -1) });
    } else if (
      (token.startsWith("*") && token.endsWith("*"))
      || (token.startsWith("_") && token.endsWith("_"))
    ) {
      nodes.push({ kind: "italic", value: token.slice(1, -1) });
    } else {
      nodes.push({ kind: "text", value: token });
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return nodes.length ? nodes : [{ kind: "text", value: text }];
}

export function wrapInlineSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string,
) {
  const selected = value.slice(selectionStart, selectionEnd);
  const nextValue = `${value.slice(0, selectionStart)}${before}${selected || "text"}${after}${value.slice(selectionEnd)}`;
  const start = selectionStart + before.length;
  const end = start + (selected || "text").length;
  return { value: nextValue, selectionStart: start, selectionEnd: end };
}

export function wrapInlineLink(
  value: string,
  selectionStart: number,
  selectionEnd: number,
) {
  const selected = value.slice(selectionStart, selectionEnd) || "link text";
  const token = `[${selected}](https://)`;
  const nextValue = `${value.slice(0, selectionStart)}${token}${value.slice(selectionEnd)}`;
  const urlStart = selectionStart + selected.length + 3;
  return {
    value: nextValue,
    selectionStart: urlStart,
    selectionEnd: urlStart + "https://".length,
  };
}
