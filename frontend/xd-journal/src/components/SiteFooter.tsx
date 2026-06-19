import { Link } from "wouter";

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.6rem] font-bold tracking-[0.22em] uppercase">XD AI Journal</span>
          <span className="font-mono text-[0.58rem] text-muted-foreground tracking-widest">— {new Date().getFullYear()} — All articles.</span>
        </div>
        <div className="flex items-center gap-8">
          <Link
            href="/news"
            data-cursor-hover
            className="interactive-ink font-mono text-[0.6rem] tracking-[0.18em] uppercase text-muted-foreground"
          >
            news ↗
          </Link>
          <Link
            href="/resources"
            data-cursor-hover
            className="interactive-ink font-mono text-[0.6rem] tracking-[0.18em] uppercase text-muted-foreground"
          >
            resources ↗
          </Link>
          <span className="font-mono text-[0.55rem] text-muted-foreground tracking-widest uppercase">built for builders</span>
        </div>
      </div>
    </footer>
  );
}
