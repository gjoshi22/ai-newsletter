import type { ContentBlock } from "@workspace/content";

import { defaultCalloutVariant } from "@workspace/content";



const TEXT_BLOCK_TYPES = [

  "paragraph",

  "lead",

  "small",

  "center",

  "heading2",

  "heading3",

  "heading4",

  "quote",

  "callout",

] as const;

const LIST_BLOCK_TYPES = ["list", "orderedList"] as const;



export type ConvertibleBlockType =

  | (typeof TEXT_BLOCK_TYPES)[number]

  | (typeof LIST_BLOCK_TYPES)[number];



export const TURN_INTO_OPTIONS: Array<{ type: ConvertibleBlockType; label: string }> = [

  { type: "paragraph", label: "Normal text" },

  { type: "lead", label: "Opening paragraph" },

  { type: "small", label: "Fine print" },

  { type: "center", label: "Centered text" },

  { type: "heading2", label: "Section heading" },

  { type: "heading3", label: "Subheading" },

  { type: "heading4", label: "Small heading" },

  { type: "quote", label: "Pull quote" },

  { type: "callout", label: "Callout box" },

  { type: "list", label: "Bullet list" },

  { type: "orderedList", label: "Numbered list" },

];



function blockText(block: ContentBlock) {

  if ("text" in block) return block.text;

  if ("items" in block) {

    const items = block.items.filter((item) => item.trim());

    return items.length ? items.join("\n") : "";

  }

  return "";

}



function blockItems(block: ContentBlock) {

  if ("items" in block) {

    const items = block.items.filter((item) => item.trim());

    return items.length ? items : [""];

  }

  const text = blockText(block);

  if (!text.trim()) return [""];

  return text.split("\n").map((line) => line.trim()).filter(Boolean);

}



export function canTurnInto(block: ContentBlock) {

  return TEXT_BLOCK_TYPES.includes(block.type as (typeof TEXT_BLOCK_TYPES)[number])

    || LIST_BLOCK_TYPES.includes(block.type as (typeof LIST_BLOCK_TYPES)[number]);

}



export function convertBlock(block: ContentBlock, nextType: ConvertibleBlockType): ContentBlock {

  if (block.type === nextType) return block;



  const text = blockText(block);

  const calloutVariant = block.type === "callout" ? block.variant : defaultCalloutVariant();

  const quoteAlign = block.type === "quote" ? block.align : undefined;



  switch (nextType) {

    case "paragraph":

      return { type: "paragraph", text };

    case "lead":

      return { type: "lead", text };

    case "small":

      return { type: "small", text };

    case "center":

      return { type: "center", text };

    case "heading2":

      return { type: "heading2", text: text.split("\n")[0] ?? "" };

    case "heading3":

      return { type: "heading3", text: text.split("\n")[0] ?? "" };

    case "heading4":

      return { type: "heading4", text: text.split("\n")[0] ?? "" };

    case "quote":

      return { type: "quote", text, align: quoteAlign };

    case "callout":

      return { type: "callout", variant: calloutVariant, text };

    case "list":

      return { type: "list", items: blockItems(block) };

    case "orderedList":

      return { type: "orderedList", items: blockItems(block) };

    default: {

      const never: never = nextType;

      throw new Error(`Unhandled block type: ${never}`);

    }

  }

}



export function turnIntoOptionsFor(block: ContentBlock) {

  return TURN_INTO_OPTIONS.filter((option) => option.type !== block.type);

}


