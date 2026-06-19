import type { ReactNode } from "react";

type AdminFieldProps = {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
};

export function AdminField({ label, hint, htmlFor, children }: AdminFieldProps) {
  return (
    <label className="admin-field" htmlFor={htmlFor}>
      <span className="admin-field-label">{label}</span>
      {hint ? <span className="admin-field-hint">{hint}</span> : null}
      {children}
    </label>
  );
}
