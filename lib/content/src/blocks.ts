import { parseArticleMarkdown } from "./article-markdown";

import type { CalloutVariant, ContentBlock } from "./types";



export function blocksToMarkdown(blocks: ContentBlock[]): string {

  const parts: string[] = [];



  for (const block of blocks) {

    switch (block.type) {

      case "paragraph":

        if (block.text.trim()) parts.push(block.text.trim());

        break;

      case "lead":

        parts.push(`:::lead\n${block.text.trim()}\n:::`);

        break;

      case "small":

        parts.push(`:::small\n${block.text.trim()}\n:::`);

        break;

      case "center":

        parts.push(`:::center\n${block.text.trim()}\n:::`);

        break;

      case "heading2":

        parts.push(`## ${block.text.trim()}`);

        break;

      case "heading3":

        parts.push(`### ${block.text.trim()}`);

        break;

      case "heading4":

        parts.push(`#### ${block.text.trim()}`);

        break;

      case "quote": {

        if (block.align === "center") {

          parts.push(`:::center-quote\n${block.text.trim()}\n:::`);

        } else {

          const lines = block.text.trim().split("\n").map((line) => `> ${line.trim()}`);

          parts.push(lines.join("\n"));

        }

        break;

      }

      case "callout":

        parts.push(`:::${block.variant}\n${block.text.trim()}\n:::`);

        break;

      case "divider":

        parts.push("---");

        break;

      case "spacer":

        parts.push("");

        parts.push("");

        break;

      case "list":

        parts.push(block.items.map((item) => `- ${item.trim()}`).join("\n"));

        break;

      case "orderedList":

        parts.push(block.items.map((item, index) => `${index + 1}. ${item.trim()}`).join("\n"));

        break;

      case "code": {

        const lang = block.language?.trim() || "";

        parts.push(`\`\`\`${lang}\n${block.text}\n\`\`\``);

        break;

      }

      case "image": {

        const caption = block.caption?.trim() ?? "";

        const alt = block.alt?.trim();

        if (alt && alt !== caption) {

          parts.push(`![${caption}](${block.url} "${alt}")`);

        } else {

          parts.push(caption ? `![${caption}](${block.url})` : `![](${block.url})`);

        }

        break;

      }

      default: {

        const never: never = block;

        throw new Error(`Unknown block type: ${(never as ContentBlock).type}`);

      }

    }

  }



  return parts.join("\n\n").trim();

}



function renderNodeToBlock(node: ReturnType<typeof parseArticleMarkdown>[number]): ContentBlock {

  switch (node.type) {

    case "paragraph":

      return { type: "paragraph", text: node.text };

    case "lead":

      return { type: "lead", text: node.text };

    case "small":

      return { type: "small", text: node.text };

    case "center":

      return { type: "center", text: node.text };

    case "heading2":

      return { type: "heading2", text: node.text };

    case "heading3":

      return { type: "heading3", text: node.text };

    case "heading4":

      return { type: "heading4", text: node.text };

    case "quote":

      return { type: "quote", text: node.text, align: node.align };

    case "callout":

      return { type: "callout", variant: node.variant, text: node.text };

    case "divider":

      return { type: "divider" };

    case "spacer":

      return { type: "spacer" };

    case "list":

      return { type: "list", items: node.items };

    case "orderedList":

      return { type: "orderedList", items: node.items };

    case "code":

      return { type: "code", text: node.text };

    case "image":

      return {

        type: "image",

        url: node.url,

        caption: node.caption,

        alt: node.alt,

      };

    default: {

      const never: never = node;

      throw new Error(`Unknown render node: ${(never as { type: string }).type}`);

    }

  }

}



export function markdownToBlocks(markdown: string): ContentBlock[] {

  const nodes = parseArticleMarkdown(markdown);

  return nodes.map(renderNodeToBlock);

}



export function estimateReadingTime(body: string): number {

  const words = body.split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 220));

}



export function emptyArticleBlocks(): ContentBlock[] {

  return [{ type: "paragraph", text: "" }];

}



export function defaultCalloutVariant(): CalloutVariant {

  return "note";

}


