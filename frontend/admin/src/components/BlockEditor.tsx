import type { CalloutVariant, ContentBlock, TextAlign } from "@workspace/content";

import { defaultCalloutVariant, emptyArticleBlocks } from "@workspace/content";

import { AdminField } from "@/components/AdminField";

import { UploadField } from "@/components/UploadField";

import { WysiwygField } from "@/components/WysiwygField";

import {

  canTurnInto,

  convertBlock,

  turnIntoOptionsFor,

  type ConvertibleBlockType,

} from "@/lib/block-convert";



const BLOCK_LABELS: Record<ContentBlock["type"], string> = {

  paragraph: "Normal text",

  lead: "Opening paragraph",

  small: "Fine print",

  center: "Centered text",

  heading2: "Section heading",

  heading3: "Subheading",

  heading4: "Small heading",

  quote: "Pull quote",

  callout: "Callout box",

  divider: "Divider line",

  spacer: "Extra space",

  list: "Bullet list",

  orderedList: "Numbered list",

  code: "Code block",

  image: "Photo in story",

};



const BLOCK_GROUPS: Array<{ label: string; types: ContentBlock["type"][] }> = [

  {

    label: "Writing",

    types: ["paragraph", "lead", "small", "center", "heading2", "heading3", "heading4", "quote", "callout"],

  },

  { label: "Lists", types: ["list", "orderedList"] },

  { label: "Photos", types: ["image"] },

  { label: "Layout", types: ["divider", "spacer"] },

  { label: "Technical stories", types: ["code"] },

];



const CALLOUT_LABELS: Record<CalloutVariant, string> = {

  note: "Note",

  tip: "Tip",

  warning: "Warning",

};



function createBlock(type: ContentBlock["type"]): ContentBlock {

  switch (type) {

    case "paragraph":

      return { type: "paragraph", text: "" };

    case "lead":

      return { type: "lead", text: "" };

    case "small":

      return { type: "small", text: "" };

    case "center":

      return { type: "center", text: "" };

    case "heading2":

      return { type: "heading2", text: "" };

    case "heading3":

      return { type: "heading3", text: "" };

    case "heading4":

      return { type: "heading4", text: "" };

    case "quote":

      return { type: "quote", text: "" };

    case "callout":

      return { type: "callout", variant: defaultCalloutVariant(), text: "" };

    case "divider":

      return { type: "divider" };

    case "spacer":

      return { type: "spacer" };

    case "list":

      return { type: "list", items: [""] };

    case "orderedList":

      return { type: "orderedList", items: [""] };

    case "code":

      return { type: "code", text: "" };

    case "image":

      return { type: "image", url: "", caption: "", alt: "" };

    default: {

      const never: never = type;

      throw new Error(`Unknown block type: ${never}`);

    }

  }

}



function TextBlockEditor({

  block,

  onChange,

  placeholder,

  singleLine = false,

  showCode = true,

}: {

  block: { text: string };

  onChange: (text: string) => void;

  placeholder?: string;

  singleLine?: boolean;

  showCode?: boolean;

}) {

  return (

    <WysiwygField

      value={block.text}

      onChange={onChange}

      placeholder={placeholder}

      singleLine={singleLine}

      showCode={showCode}

      minHeight={singleLine ? "2.5rem" : "7rem"}

    />

  );

}



function ListBlockEditor({

  items,

  onChange,

}: {

  items: string[];

  onChange: (items: string[]) => void;

}) {

  return (

    <div className="list-block-editor">

      {items.map((item, itemIndex) => (

        <div key={itemIndex} className="list-block-item">

          <WysiwygField

            singleLine

            showCode={false}

            value={item}

            onChange={(nextValue) => {

              const nextItems = [...items];

              nextItems[itemIndex] = nextValue;

              onChange(nextItems);

            }}

            placeholder={`Item ${itemIndex + 1}`}

            minHeight="2.5rem"

          />

          <button

            type="button"

            className="admin-btn admin-btn-danger"

            onClick={() => onChange(items.filter((_, index) => index !== itemIndex))}

            disabled={items.length === 1}

          >

            Remove

          </button>

        </div>

      ))}

      <button type="button" className="admin-btn" onClick={() => onChange([...items, ""])}>

        Add another item

      </button>

    </div>

  );

}



export function BlockEditor({

  blocks,

  onChange,

  onUpload,

}: {

  blocks: ContentBlock[];

  onChange: (blocks: ContentBlock[]) => void;

  onUpload: (file: File) => Promise<string>;

}) {

  const updateBlock = (index: number, block: ContentBlock) => {

    const next = [...blocks];

    next[index] = block;

    onChange(next);

  };



  const removeBlock = (index: number) => {

    onChange(blocks.filter((_, blockIndex) => blockIndex !== index));

  };



  const moveBlock = (index: number, direction: -1 | 1) => {

    const target = index + direction;

    if (target < 0 || target >= blocks.length) return;

    const next = [...blocks];

    [next[index], next[target]] = [next[target], next[index]];

    onChange(next);

  };



  const addBlock = (type: ContentBlock["type"]) => {

    onChange([...blocks, createBlock(type)]);

  };



  return (

    <div className="block-editor">

      {(blocks.length ? blocks : emptyArticleBlocks()).map((block, index) => (

        <div key={index} className="block-row">

          <div className="block-row-header">

            <div className="block-row-title">

              <strong className="block-row-label">{BLOCK_LABELS[block.type]}</strong>

              {canTurnInto(block) ? (

                <label className="turn-into-control">

                  <span>Change to</span>

                  <select

                    className="admin-select"

                    value=""

                    onChange={(event) => {

                      const nextType = event.target.value as ConvertibleBlockType;

                      if (!nextType) return;

                      updateBlock(index, convertBlock(block, nextType));

                      event.target.value = "";

                    }}

                  >

                    <option value="">Choose a different type...</option>

                    {turnIntoOptionsFor(block).map((option) => (

                      <option key={option.type} value={option.type}>{option.label}</option>

                    ))}

                  </select>

                </label>

              ) : null}

            </div>

            <div className="block-row-actions">

              <button type="button" className="admin-btn" onClick={() => moveBlock(index, -1)} title="Move up">Up</button>

              <button type="button" className="admin-btn" onClick={() => moveBlock(index, 1)} title="Move down">Down</button>

              <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeBlock(index)}>Delete</button>

            </div>

          </div>



          {block.type === "paragraph" ? (

            <TextBlockEditor

              block={block}

              onChange={(text) => updateBlock(index, { ...block, text })}

              placeholder="Write your paragraph here"

            />

          ) : null}



          {block.type === "lead" ? (

            <TextBlockEditor

              block={block}

              onChange={(text) => updateBlock(index, { ...block, text })}

              placeholder="Opening paragraph — larger intro text"

            />

          ) : null}



          {block.type === "small" ? (

            <TextBlockEditor

              block={block}

              onChange={(text) => updateBlock(index, { ...block, text })}

              placeholder="Fine print, disclaimers, or footnotes"

            />

          ) : null}



          {block.type === "center" ? (

            <TextBlockEditor

              block={block}

              onChange={(text) => updateBlock(index, { ...block, text })}

              placeholder="Centered line or short statement"

            />

          ) : null}



          {block.type === "heading2" ? (

            <TextBlockEditor

              block={block}

              onChange={(text) => updateBlock(index, { ...block, text })}

              singleLine

              showCode={false}

              placeholder="Large section heading"

            />

          ) : null}



          {block.type === "heading3" ? (

            <TextBlockEditor

              block={block}

              onChange={(text) => updateBlock(index, { ...block, text })}

              singleLine

              showCode={false}

              placeholder="Smaller subheading"

            />

          ) : null}



          {block.type === "heading4" ? (

            <TextBlockEditor

              block={block}

              onChange={(text) => updateBlock(index, { ...block, text })}

              singleLine

              showCode={false}

              placeholder="Minor heading within a section"

            />

          ) : null}



          {block.type === "quote" ? (

            <div className="quote-block-editor">

              <AdminField label="Quote position">

                <select

                  className="admin-select"

                  value={block.align ?? "left"}

                  onChange={(event) => updateBlock(index, {

                    ...block,

                    align: event.target.value as TextAlign,

                  })}

                >

                  <option value="left">Standard (left border)</option>

                  <option value="center">Centered</option>

                </select>

              </AdminField>

              <TextBlockEditor

                block={block}

                onChange={(text) => updateBlock(index, { ...block, text })}

                placeholder="A quote or standout line"

              />

            </div>

          ) : null}



          {block.type === "callout" ? (

            <div className="callout-block-editor">

              <AdminField label="Callout style">

                <select

                  className="admin-select"

                  value={block.variant}

                  onChange={(event) => updateBlock(index, {

                    ...block,

                    variant: event.target.value as CalloutVariant,

                  })}

                >

                  {(Object.keys(CALLOUT_LABELS) as CalloutVariant[]).map((variant) => (

                    <option key={variant} value={variant}>{CALLOUT_LABELS[variant]}</option>

                  ))}

                </select>

              </AdminField>

              <TextBlockEditor

                block={block}

                onChange={(text) => updateBlock(index, { ...block, text })}

                placeholder="Important note, tip, or warning for readers"

              />

            </div>

          ) : null}



          {block.type === "list" || block.type === "orderedList" ? (

            <ListBlockEditor

              items={block.items}

              onChange={(items) => updateBlock(index, { ...block, items })}

            />

          ) : null}



          {block.type === "code" ? (

            <AdminField label="Code block" hint="For technical stories. Paste code exactly as readers should see it.">

              <textarea

                className="admin-textarea"

                rows={6}

                value={block.text}

                onChange={(event) => updateBlock(index, { ...block, text: event.target.value })}

              />

            </AdminField>

          ) : null}



          {block.type === "image" ? (

            <div className="image-block-editor">

              <p className="admin-section-copy">

                Adds a photo inside the story. This is separate from the cover photo in Post settings.

              </p>

              <UploadField

                value={block.url || null}

                onChange={(url) => updateBlock(index, { ...block, url: url ?? "" })}

                onUpload={onUpload}

                label="Upload photo for this section"

              />

              <AdminField label="Or paste an image link">

                <input

                  className="admin-input"

                  value={block.url}

                  onChange={(event) => updateBlock(index, { ...block, url: event.target.value })}

                />

              </AdminField>

              <AdminField label="Short description of the photo" hint="Describe what is in the image for readers using screen readers">

                <input

                  className="admin-input"

                  value={block.alt ?? ""}

                  onChange={(event) => updateBlock(index, { ...block, alt: event.target.value })}

                />

              </AdminField>

              <AdminField label="Caption" hint="Optional text shown below the photo">

                <WysiwygField

                  singleLine

                  showCode={false}

                  value={block.caption ?? ""}

                  onChange={(caption) => updateBlock(index, { ...block, caption })}

                  placeholder="Caption below the photo"

                  minHeight="2.5rem"

                />

              </AdminField>

            </div>

          ) : null}



          {block.type === "divider" ? (

            <p className="block-row-note">Inserts a horizontal line between sections.</p>

          ) : null}



          {block.type === "spacer" ? (

            <p className="block-row-note">Adds extra breathing room between sections.</p>

          ) : null}

        </div>

      ))}



      <details className="add-block-menu">

        <summary className="admin-btn admin-btn-primary add-block-trigger">Add a section</summary>

        <div className="add-block-groups">

          {BLOCK_GROUPS.map((group) => (

            <div key={group.label} className="add-block-group">

              <p className="add-block-group-label">{group.label}</p>

              <div className="add-block-group-actions">

                {group.types.map((type) => (

                  <button key={type} type="button" className="admin-btn" onClick={() => addBlock(type)}>

                    {BLOCK_LABELS[type]}

                  </button>

                ))}

              </div>

            </div>

          ))}

        </div>

      </details>

    </div>

  );

}


