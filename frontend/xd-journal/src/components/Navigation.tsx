import { useTheme } from "next-themes";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const navItems = [
  { href: "/news", label: "/news", hide: "" },
  { href: "/resources", label: "/resources", hide: "hidden sm:inline-flex" },
  { href: "/archive", label: "/archive", hide: "hidden md:inline-flex" },
];

export function Navigation() {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 h-11 flex items-center transition-all duration-300 ${
      scrolled ? "bg-background/96 backdrop-blur-sm border-b border-border" : "bg-transparent border-b border-transparent"
    }`}>
      <div className="w-full max-w-[1600px] mx-auto px-6 md:px-12 flex items-center justify-between">

        <Link href="/">
          <span
            data-cursor-hover
            className="interactive-ink font-mono text-[0.62rem] font-bold tracking-[0.22em] uppercase cursor-pointer select-none"
          >
            XD_AI_JOURNAL
          </span>
        </Link>

        <div className="flex items-center gap-5 md:gap-8">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href}>
                <span
                  data-cursor-hover
                  aria-current={isActive ? "page" : undefined}
                  className={`interactive-ink nav-link ${item.hide} ${isActive ? "nav-link-active" : ""} font-mono text-[0.58rem] tracking-[0.2em] uppercase text-muted-foreground cursor-pointer`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {mounted && (
            <motion.button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              data-cursor-hover
              className="interactive-ink font-mono text-[0.58rem] tracking-[0.2em] uppercase text-muted-foreground"
              whileTap={{ scale: 0.88 }}
            >
              {theme === "dark" ? "[ light ]" : "[ dark  ]"}
            </motion.button>
          )}
        </div>
      </div>
    </nav>
  );
}
