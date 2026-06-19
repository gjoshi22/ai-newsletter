import { useEffect, useRef, useState, type ReactNode } from "react";
import { LinkDialog } from "@/components/LinkDialog";
import {
  getSelectedLink,
  getSelectedText,
  htmlToInlineMarkdown,
  inlineMarkdownToHtml,
  insertLink,
  removeLinkElement,
  wrapSelection,
} from "@/lib/wysiwyg-serialize";

type WysiwygFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  singleLine?: boolean;
  minHeight?: string;
  showCode?: boolean;
};

type ToolbarButton = {
  id: string;
  label: string;
  title: string;
  onClick: () => void;
  content: ReactNode;
};

export function WysiwygField({
  value,
  onChange,
  placeholder,
  singleLine = false,
  minHeight = "6.5rem",
  showCode = true,
}: WysiwygFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [editingLink, setEditingLink] = useState<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastValueRef.current) return;
    if (document.activeElement === editor) return;

    editor.innerHTML = inlineMarkdownToHtml(value);
    lastValueRef.current = value;
  }, [value]);

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const markdown = htmlToInlineMarkdown(editor);
    lastValueRef.current = markdown;
    onChange(markdown);
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const runCommand = (command: string, valueArg?: string) => {
    focusEditor();
    document.execCommand(command, false, valueArg);
    emitChange();
  };

  const wrapCode = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    const code = document.createElement("code");
    code.appendChild(range.extractContents());
    range.insertNode(code);
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(code);
    selection.addRange(nextRange);
    emitChange();
  };

  const openLinkDialog = () => {
    const editor = editorRef.current;
    if (!editor) return;
    focusEditor();
    const existing = getSelectedLink(editor);
    if (existing) {
      setEditingLink(existing.element);
      setLinkLabel(existing.label);
      setLinkUrl(existing.href);
    } else {
      setEditingLink(null);
      setLinkLabel(getSelectedText(editor) || "Link text");
      setLinkUrl("https://");
    }
    setLinkDialogOpen(true);
  };

  const applyLink = (label: string, url: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    focusEditor();
    if (editingLink) {
      removeLinkElement(editingLink);
      setEditingLink(null);
    }
    insertLink(editor, label, url);
    emitChange();
    setLinkDialogOpen(false);
  };

  const removeLink = () => {
    if (editingLink) {
      removeLinkElement(editingLink);
      setEditingLink(null);
      emitChange();
    }
    setLinkDialogOpen(false);
  };

  const wrapHighlight = () => {
    const editor = editorRef.current;
    if (!editor) return;
    focusEditor();
    wrapSelection(editor, "mark", "article-mark");
    emitChange();
  };

  const toolbarButtons: ToolbarButton[] = [
    { id: "bold", label: "Bold", title: "Bold (Ctrl+B)", onClick: () => runCommand("bold"), content: <strong>B</strong> },
    { id: "italic", label: "Italic", title: "Italic (Ctrl+I)", onClick: () => runCommand("italic"), content: <em>I</em> },
    { id: "underline", label: "Underline", title: "Underline (Ctrl+U)", onClick: () => runCommand("underline"), content: <u>U</u> },
    { id: "strike", label: "Cross out", title: "Cross out text", onClick: () => runCommand("strikeThrough"), content: <s>S</s> },
    { id: "highlight", label: "Highlight", title: "Highlight text", onClick: wrapHighlight, content: <mark className="article-mark">H</mark> },
    { id: "sup", label: "Small above", title: "Small text above the line", onClick: () => runCommand("superscript"), content: <sup>x</sup> },
    { id: "sub", label: "Small below", title: "Small text below the line", onClick: () => runCommand("subscript"), content: <sub>x</sub> },
  ];

  if (showCode) {
    toolbarButtons.push({
      id: "mono",
      label: "Code style",
      title: "Fixed-width code style",
      onClick: wrapCode,
      content: "Mono",
    });
  }

  toolbarButtons.push({
    id: "link",
    label: "Link",
    title: "Link (Ctrl+K)",
    onClick: openLinkDialog,
    content: "Link",
  });

  toolbarButtons.push({
    id: "clear",
    label: "Clear style",
    title: "Remove formatting from selection",
    onClick: () => runCommand("removeFormat"),
    content: "Clear",
  });

  return (
    <div className="wysiwyg-field">
      <div className="rich-text-toolbar" role="toolbar" aria-label="Formatting">
        {toolbarButtons.map((button) => (
          <button
            key={button.id}
            type="button"
            className="admin-btn wysiwyg-btn"
            title={button.title}
            onClick={button.onClick}
          >
            <span className="wysiwyg-btn-glyph">{button.content}</span>
            <span className="wysiwyg-btn-label">{button.label}</span>
          </button>
        ))}
      </div>

      <div
        ref={editorRef}
        className={`wysiwyg-editor${singleLine ? " wysiwyg-editor-single" : ""}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline={!singleLine}
        data-placeholder={placeholder}
        style={{ minHeight: singleLine ? undefined : minHeight }}
        onInput={emitChange}
        onBlur={emitChange}
        onKeyDown={(event) => {
          if (singleLine && event.key === "Enter") {
            event.preventDefault();
            return;
          }

          const mod = event.ctrlKey || event.metaKey;
          if (!mod) return;

          switch (event.key.toLowerCase()) {
            case "b":
              event.preventDefault();
              runCommand("bold");
              break;
            case "i":
              event.preventDefault();
              runCommand("italic");
              break;
            case "u":
              event.preventDefault();
              runCommand("underline");
              break;
            case "k":
              event.preventDefault();
              openLinkDialog();
              break;
            default:
              break;
          }
        }}
      />

      <LinkDialog
        open={linkDialogOpen}
        label={linkLabel}
        url={linkUrl}
        canRemove={Boolean(editingLink)}
        onConfirm={applyLink}
        onRemove={removeLink}
        onCancel={() => setLinkDialogOpen(false)}
      />
    </div>
  );
}
