import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/* Suppress the benign ResizeObserver loop string-throw that Chrome emits when
   a ResizeObserver callback causes layout changes. It is not a real error —
   the browser retries on the next frame automatically — but Replit's preview
   wrapper catches it and surfaces it as a "runtime error" because it is a
   thrown string rather than an Error object. */
window.addEventListener("error", (e) => {
  if (
    typeof e.message === "string" &&
    e.message.includes("ResizeObserver loop")
  ) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
