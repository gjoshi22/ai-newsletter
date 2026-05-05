import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AnimatePresence } from "framer-motion";
import { useState, useCallback, Component, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Splash } from "@/components/Splash";
import Home from "@/pages/home";
import Archive from "@/pages/archive";
import ArticlePage from "@/pages/article";
import CollectionPage from "@/pages/collection";
import AsciiNotepadPage from "@/pages/ascii-notepad";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();
const SPLASH_STORAGE_KEY = "xd-ai-journal-splash-seen-v1";

/* ── Error boundary — catches render-time crashes and shows a clean fallback ── */
interface EBState { hasError: boolean; message: string }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, message: "" };
  static getDerivedStateFromError(err: unknown): EBState {
    const message = err instanceof Error ? err.message : String(err);
    return { hasError: true, message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#0d0c08",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            fontFamily: '"JetBrains Mono", monospace',
            color: "#F5C518",
          }}
        >
          <pre style={{ fontSize: "0.7rem", opacity: 0.6 }}>{`┌─[XD_AI_JOURNAL]─────────────────┐
│  $ runtime --check               │
│  > error caught by boundary      │
│  > ${(this.state.message || "unknown error").slice(0, 28).padEnd(28)} │
│  > reloading...                  │
└──────────────────────────────────┘`}</pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontFamily: "inherit",
              fontSize: "0.65rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              border: "1px solid #F5C518",
              background: "transparent",
              color: "#F5C518",
              padding: "0.6rem 1.5rem",
              cursor: "pointer",
            }}
          >
            reload →
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/news">{() => <CollectionPage category="News" />}</Route>
      <Route path="/resources">{() => <CollectionPage category="Resources" />}</Route>
      <Route path="/archive" component={Archive} />
      <Route path="/dispatch/:slug" component={ArticlePage} />
      <Route path="/ascii-notepad" component={AsciiNotepadPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppWithSplash() {
  const [location] = useLocation();
  const skipSplash = location === "/ascii-notepad";
  const [splashDone, setSplashDone] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(SPLASH_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const handleSplashComplete = useCallback(() => {
    try {
      window.sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
    } catch {
      /* ignore storage availability issues and still dismiss locally */
    }
    setSplashDone(true);
  }, []);
  return (
    <>
      {/* AppRoutes always mounted so the canvas, fonts and layout are
          fully measured and settled while the splash plays. The splash
          is position:fixed so it covers everything until dismissed.
          This eliminates the cold-mount layout shift on entry. */}
      <AppRoutes />
      <AnimatePresence>
        {!skipSplash && !splashDone && <Splash onComplete={handleSplashComplete} />}
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="xd-ai-journal-theme-v2"
      >
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppWithSplash />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
