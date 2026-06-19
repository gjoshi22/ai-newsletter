import { useEffect, useState } from "react";
import { AdminField } from "@/components/AdminField";

type LinkDialogProps = {
  open: boolean;
  label: string;
  url: string;
  canRemove?: boolean;
  onConfirm: (label: string, url: string) => void;
  onRemove?: () => void;
  onCancel: () => void;
};

export function LinkDialog({
  open,
  label,
  url,
  canRemove = false,
  onConfirm,
  onRemove,
  onCancel,
}: LinkDialogProps) {
  const [linkLabel, setLinkLabel] = useState(label);
  const [linkUrl, setLinkUrl] = useState(url);

  useEffect(() => {
    if (!open) return;
    setLinkLabel(label);
    setLinkUrl(url);
  }, [label, open, url]);

  if (!open) return null;

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="confirm-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(linkLabel.trim() || "Link", linkUrl.trim());
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="confirm-dialog-title">Insert link</h2>
        <AdminField label="Link text">
          <input
            className="admin-input"
            value={linkLabel}
            onChange={(event) => setLinkLabel(event.target.value)}
            placeholder="Words readers will click"
            autoFocus
          />
        </AdminField>
        <AdminField label="URL">
          <input
            className="admin-input"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://"
            type="url"
          />
        </AdminField>
        <div className="confirm-dialog-actions">
          {canRemove && onRemove ? (
            <button type="button" className="admin-btn admin-btn-danger" onClick={onRemove}>
              Remove link
            </button>
          ) : null}
          <button type="button" className="admin-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="admin-btn admin-btn-primary">Apply link</button>
        </div>
      </form>
    </div>
  );
}
