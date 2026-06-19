import { parseInlineMarkdown } from "@workspace/content";



function escapeHtml(text: string) {

  return text

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;");

}



export function inlineMarkdownToHtml(text: string) {

  if (!text.trim()) return "";



  return parseInlineMarkdown(text).map((node) => {

    switch (node.kind) {

      case "text":

        return escapeHtml(node.value);

      case "bold":

        return `<strong>${escapeHtml(node.value)}</strong>`;

      case "italic":

        return `<em>${escapeHtml(node.value)}</em>`;

      case "underline":

        return `<u>${escapeHtml(node.value)}</u>`;

      case "strike":

        return `<s>${escapeHtml(node.value)}</s>`;

      case "highlight":

        return `<mark class="article-mark">${escapeHtml(node.value)}</mark>`;

      case "sup":

        return `<sup>${escapeHtml(node.value)}</sup>`;

      case "sub":

        return `<sub>${escapeHtml(node.value)}</sub>`;

      case "code":

        return `<code>${escapeHtml(node.value)}</code>`;

      case "link":

        return `<a href="${escapeHtml(node.href)}">${escapeHtml(node.label)}</a>`;

      default: {

        const never: never = node;

        return escapeHtml(JSON.stringify(never));

      }

    }

  }).join("");

}



function nodeToMarkdown(node: Node): string {

  if (node.nodeType === Node.TEXT_NODE) {

    return node.textContent ?? "";

  }



  if (node.nodeType !== Node.ELEMENT_NODE) {

    return "";

  }



  const element = node as HTMLElement;

  const inner = Array.from(element.childNodes).map(nodeToMarkdown).join("");



  switch (element.tagName) {

    case "BR":

      return "\n";

    case "STRONG":

    case "B":

      return `**${inner}**`;

    case "EM":

    case "I":

      return `*${inner}*`;

    case "U":

      return `++${inner}++`;

    case "S":

    case "STRIKE":

    case "DEL":

      return `~~${inner}~~`;

    case "MARK":

      return `==${inner}==`;

    case "SUP":

      return `^${inner}^`;

    case "SUB":

      return `~${inner}~`;

    case "CODE":

      return `\`${inner}\``;

    case "A": {

      const href = element.getAttribute("href") ?? "";

      return `[${inner}](${href})`;

    }

    case "DIV":

    case "P":

      return element.nextSibling ? `${inner}\n` : inner;

    default:

      return inner;

  }

}



export function htmlToInlineMarkdown(root: HTMLElement) {

  return Array.from(root.childNodes)

    .map(nodeToMarkdown)

    .join("")

    .replace(/\n+$/g, "");

}



export function getSelectedLink(editor: HTMLElement) {

  const selection = window.getSelection();

  if (!selection?.rangeCount) return null;

  let node: Node | null = selection.anchorNode;

  while (node && node !== editor) {

    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "A") {

      const anchor = node as HTMLAnchorElement;

      return {

        element: anchor,

        label: anchor.textContent ?? "",

        href: anchor.getAttribute("href") ?? "",

      };

    }

    node = node.parentNode;

  }

  return null;

}



export function getSelectedText(editor: HTMLElement) {

  const selection = window.getSelection();

  if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return "";

  return selection.toString();

}



export function insertLink(editor: HTMLElement, label: string, url: string) {

  const selection = window.getSelection();

  if (!selection?.rangeCount) return;

  const range = selection.getRangeAt(0);

  range.deleteContents();

  const anchor = document.createElement("a");

  anchor.href = url;

  anchor.textContent = label;

  range.insertNode(anchor);

  selection.removeAllRanges();

  const nextRange = document.createRange();

  nextRange.selectNodeContents(anchor);

  nextRange.collapse(false);

  selection.addRange(nextRange);

}



export function removeLinkElement(anchor: HTMLAnchorElement) {

  const parent = anchor.parentNode;

  if (!parent) return;

  while (anchor.firstChild) {

    parent.insertBefore(anchor.firstChild, anchor);

  }

  parent.removeChild(anchor);

}



export function wrapSelection(editor: HTMLElement, tagName: string, className?: string) {

  const selection = window.getSelection();

  if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return;

  const range = selection.getRangeAt(0);

  const wrapper = document.createElement(tagName);

  if (className) wrapper.className = className;

  if (range.collapsed) {

    wrapper.textContent = "text";

    range.insertNode(wrapper);

  } else {

    wrapper.appendChild(range.extractContents());

    range.insertNode(wrapper);

  }

  selection.removeAllRanges();

  const nextRange = document.createRange();

  nextRange.selectNodeContents(wrapper);

  selection.addRange(nextRange);

}


