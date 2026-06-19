import { useId, useRef, useState } from "react";

type UploadFieldProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<string>;
  label?: string;
  hint?: string;
  accept?: string;
};

export function UploadField({
  value,
  onChange,
  onUpload,
  label = "Upload image",
  hint,
  accept = "image/*",
}: UploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const url = await onUpload(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFile(file);
    event.target.value = "";
  };

  const onDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await handleFile(file);
  };

  return (
    <div className="upload-field">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        className="upload-field-input"
        onChange={onInputChange}
        disabled={uploading}
      />
      <button
        type="button"
        className={`upload-field-dropzone${dragOver ? " upload-field-dropzone-active" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        disabled={uploading}
      >
        <span className="upload-field-title">{uploading ? "Uploading..." : label}</span>
        <span className="upload-field-copy">
          {hint ?? "Click to browse or drag an image here"}
        </span>
      </button>
      {value ? (
        <div className="upload-field-preview">
          <img src={value} alt="" />
          <button type="button" className="admin-btn" onClick={() => onChange(null)}>
            Remove image
          </button>
        </div>
      ) : null}
      {error ? <p className="admin-inline-error">{error}</p> : null}
    </div>
  );
}
